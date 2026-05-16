'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { doc, collection, query, where, updateDoc } from 'firebase/firestore';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { User, Organization, AccessPermissions, MANAGEMENT_ROLES, RoleTemplate } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { getDefaultPermissionsForUser, getEffectivePermissions, applyFeatureGating } from '@/lib/permissions';

interface UserContextType {
  profile: User | null;
  organization: Organization | null;
  permissions: AccessPermissions;
  loading: boolean;
  isAdmin: boolean;
  isMaster: boolean;
  isManagement: boolean;
  isImpersonating: boolean;
  setImpersonatedOrgId: (id: string | null) => void;
  currentUserRoles: string[];
  effectiveOrgId: string | null;
  claims: any;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, claims, loading: authLoading } = useUser();
  const db = useFirestore();
  const isMobile = useIsMobile();
  const [impersonatedOrgId, setImpersonatedOrgIdState] = React.useState<string | null>(null);

  const setImpersonatedOrgId = (id: string | null) => {
    setImpersonatedOrgIdState(id);
    if (id) localStorage.setItem('impersonatedOrgId', id);
    else localStorage.removeItem('impersonatedOrgId');
  };

  // 1. Check by UID (Priority)
  const profileByUidRef = useMemo(() => 
    db && user?.uid ? doc(db, "users", user.uid) : null, 
  [db, user?.uid]);
  const { data: profileByUid, loading: loadingUid } = useDoc<User>(profileByUidRef as any);

  // 2. Check by Email ID (Legacy/Fallback)
  const emailId = useMemo(() => 
    user?.email?.toLowerCase().replace(/[.#$[\]]/g, "_") || "", 
  [user?.email]);
  const profileByEmailRef = useMemo(() => 
    db && emailId ? doc(db, "users", emailId) : null, 
  [db, emailId]);
  const { data: profileByEmail, loading: loadingEmailId } = useDoc<User>(profileByEmailRef as any);

  // 3. Fallback: Query by Email
  const profileByQueryRef = useMemoFirebase(() => 
    db && user?.email ? query(collection(db, "users"), where("email", "==", user.email.toLowerCase())) : null,
  [db, user?.email]);
  const { data: profilesByQuery, loading: loadingQuery } = useCollection<User>(profileByQueryRef as any);
  const profileByQuery = profilesByQuery?.[0] || null;

  const profile = profileByUid || profileByEmail || profileByQuery || null;
  
  const currentUserRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    // Claims Role (Priority)
    if (claims?.role) rolesSet.add(claims.role as string);
    // Profile Roles (Sync/Fallback)
    if (profile?.role) rolesSet.add(profile.role);
    if (profile?.roles) profile.roles.forEach(r => rolesSet.add(r));
    if (profile?.assignedRoles) profile.assignedRoles.forEach(ar => rolesSet.add(ar.role));
    return Array.from(rolesSet);
  }, [profile, claims]);

  const isMaster = useMemo(() => 
    user?.email?.toLowerCase() === 'quinten.geurs@gmail.com' ||
    user?.email?.toLowerCase() === 'quinten.geurs@hackney.gov.uk',
  [user?.email]);

  const isAdmin = useMemo(() => 
    currentUserRoles.includes('Admin') || 
    isMaster ||
    claims?.role === 'Admin',
  [currentUserRoles, isMaster, claims?.role]);

  const isManagement = useMemo(() => 
    currentUserRoles.some(r => [...MANAGEMENT_ROLES, 'Volunteering Coordinator'].includes(r as any)) || isAdmin,
  [currentUserRoles, isAdmin]);

  // Sync with localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('impersonatedOrgId');
    if (saved) {
      if (profile && !isAdmin) {
        localStorage.removeItem('impersonatedOrgId');
        setImpersonatedOrgIdState(null);
      } else {
        setImpersonatedOrgIdState(saved);
      }
    }
  }, [profile, isAdmin]);

  // 3. Organization ID calculation
  const effectiveOrgId = useMemo(() => {
    if (isAdmin && impersonatedOrgId) return impersonatedOrgId;
    // Use Claim Org ID if available (Gold Standard)
    if (claims?.orgId) return claims.orgId as string;
    // Fallback to profile
    return profile?.orgId || (profile ? "hackney-council" : null);
  }, [isAdmin, impersonatedOrgId, profile, claims]);

  const orgRef = useMemo(() => 
    db && effectiveOrgId ? doc(db, "organizations", effectiveOrgId) : null, 
  [db, effectiveOrgId]);
  const { data: organization, loading: loadingOrg } = useDoc<Organization>(orgRef as any);

  // 4. Role Templates Fetching
  const rolesQuery = useMemoFirebase(() => 
    (db && effectiveOrgId) ? query(collection(db, "organizations", effectiveOrgId, "role_templates")) : null, 
  [db, effectiveOrgId]);
  const { data: allRoleTemplates = [], loading: loadingRoles } = useCollection<RoleTemplate>(rolesQuery as any);

  const loading = authLoading || (loadingUid && loadingEmailId && !claims) || (!!effectiveOrgId && (loadingOrg || loadingRoles));

  const permissions = useMemo(() => {
    const userRoleIds = profile?.roleIds || [];
    const matchedTemplates = allRoleTemplates.filter(t => 
      userRoleIds.includes(t.id) || 
      currentUserRoles.includes(t.name)
    );

    const base = getEffectivePermissions(profile, isMobile, user?.email, matchedTemplates);
    return applyFeatureGating(base, organization?.activeFeatures);
  }, [profile, isMobile, user?.email, organization?.activeFeatures, allRoleTemplates, currentUserRoles]);

  // Heartbeat / Presence System
  React.useEffect(() => {
    if (!db || !user || !profile?.id) return;

    const updateStatus = async (online: boolean) => {
      try {
        const userRef = doc(db, "users", profile.id);
        await updateDoc(userRef, {
          isOnline: online,
          lastActive: new Date().toISOString()
        });
      } catch (err) {
        // Suppress console error if just permission issue during logout
      }
    };

    updateStatus(true);
    const interval = setInterval(() => updateStatus(true), 120000);
    return () => clearInterval(interval);
  }, [db, user, profile?.id]);

  const value = {
    profile,
    organization: organization || null,
    permissions,
    loading,
    isAdmin,
    isMaster,
    isManagement,
    isImpersonating: !!impersonatedOrgId,
    setImpersonatedOrgId,
    currentUserRoles,
    effectiveOrgId: effectiveOrgId || null,
    claims
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
