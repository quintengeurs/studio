'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { doc, collection, query, where, updateDoc } from 'firebase/firestore';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { User, Organization, AccessPermissions, MANAGEMENT_ROLES } from '@/lib/types';
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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const isMobile = useIsMobile();
  const [impersonatedOrgId, setImpersonatedOrgIdState] = React.useState<string | null>(null);


  const setImpersonatedOrgId = (id: string | null) => {
    setImpersonatedOrgIdState(id);
    if (id) localStorage.setItem('impersonatedOrgId', id);
    else localStorage.removeItem('impersonatedOrgId');
  };

  const emailId = useMemo(() => 
    user?.email?.toLowerCase().replace(/[.#$[\]]/g, "_") || "", 
  [user?.email]);

  // 1. Check by UID
  const profileByUidRef = useMemo(() => 
    db && user?.uid ? doc(db, "users", user.uid) : null, 
  [db, user?.uid]);
  const { data: profileByUid, loading: loadingUid } = useDoc<User>(profileByUidRef as any);

  // 2. Check by Email ID (legacy/sync pattern)
  const profileByEmailRef = useMemo(() => 
    db && emailId ? doc(db, "users", emailId) : null, 
  [db, emailId]);
  const { data: profileByEmail, loading: loadingEmailId } = useDoc<User>(profileByEmailRef as any);

  const profile = profileByEmail || profileByUid || null;
  
  const currentUserRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    if (profile?.role) rolesSet.add(profile.role);
    if (profile?.roles) profile.roles.forEach(r => rolesSet.add(r));
    if (profile?.assignedRoles) profile.assignedRoles.forEach(ar => rolesSet.add(ar.role));
    return Array.from(rolesSet);
  }, [profile]);

  const isMaster = useMemo(() => 
    user?.email?.toLowerCase() === 'quinten.geurs@gmail.com',
  [user?.email]);

  const isAdmin = useMemo(() => 
    currentUserRoles.includes('Admin') || 
    isMaster ||
    user?.email?.toLowerCase() === 'quinten.geurs@hackney.gov.uk',
  [currentUserRoles, user?.email, isMaster]);

  const isManagement = useMemo(() => 
    currentUserRoles.some(r => [...MANAGEMENT_ROLES, 'Volunteering Coordinator'].includes(r as any)) || isAdmin,
  [currentUserRoles, isAdmin]);

  // Sync with localStorage on mount (MUST be after profile and isAdmin are declared)
  React.useEffect(() => {
    const saved = localStorage.getItem('impersonatedOrgId');
    if (saved) {
      // If we already have a profile and we're not an admin, clear it immediately
      if (profile && !isAdmin) {
        localStorage.removeItem('impersonatedOrgId');
        setImpersonatedOrgIdState(null);
      } else {
        setImpersonatedOrgIdState(saved);
      }
    }
  }, [profile, isAdmin]);

  // 3. Organization Fetching
  const effectiveOrgId = useMemo(() => {
    if (isAdmin && impersonatedOrgId) return impersonatedOrgId;
    return profile?.orgId || null;
  }, [isAdmin, impersonatedOrgId, profile?.orgId]);
  const orgRef = useMemo(() => 
    db && effectiveOrgId ? doc(db, "organizations", effectiveOrgId) : null, 
  [db, effectiveOrgId]);
  const { data: organization, loading: loadingOrg } = useDoc<Organization>(orgRef as any);

  const loading = authLoading || (loadingUid && loadingEmailId) || (!!effectiveOrgId && loadingOrg);

  const permissions = useMemo(() => {
    const base = getEffectivePermissions(profile, isMobile, user?.email);
    return applyFeatureGating(base, organization?.activeFeatures);
  }, [profile, isMobile, user?.email, organization?.activeFeatures]);

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
        console.error("Failed to update presence:", err);
      }
    };

    // Initial sign-in update
    updateStatus(true);

    // Periodic heartbeat (every 2 minutes)
    const interval = setInterval(() => updateStatus(true), 120000);

    // Optional: Try to set to offline on close (unreliable but helpful)
    const handleUnload = () => {
      // Use navigator.sendBeacon or similar if needed, but updateDoc is async
      // For now, we'll rely on lastActive timestamp for accurate status
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
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
    effectiveOrgId: effectiveOrgId || null
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
