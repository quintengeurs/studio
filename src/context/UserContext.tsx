'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { doc, collection, query, where, updateDoc } from 'firebase/firestore';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { AccessPermissions, Organisation, User } from '@/lib/types';
import {
  Roles,
  canAccessDepot,
  canAccessPark,
  getDefaultPermissionsForUser,
  getUserRoles,
  hasAnyRole,
  hasModule,
  hasPermission,
  hasRole,
  isAdmin as isAdminUser,
  isVolunteer as isVolunteerUser,
} from '@/lib/rbac';

interface UserContextType {
  profile: User | null;
  organisation: Organisation | null;
  permissions: AccessPermissions;
  loading: boolean;
  isAdmin: boolean;
  isManagement: boolean;
  isVolunteer: boolean;
  currentUserRoles: string[];
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  hasModule: (module: string) => boolean;
  canAccessPark: (parkId?: string) => boolean;
  canAccessDepot: (depotId?: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();

  const emailId = useMemo(
    () => user?.email?.toLowerCase().replace(/[.#$[\]]/g, '_') || '',
    [user?.email]
  );

  const profileByUidRef = useMemo(
    () => (db && user?.uid ? doc(db, 'users', user.uid) : null),
    [db, user?.uid]
  );
  const { data: profileByUid, loading: loadingUid } = useDoc<User>(profileByUidRef as any);

  const profileByEmailRef = useMemo(
    () => (db && emailId ? doc(db, 'users', emailId) : null),
    [db, emailId]
  );
  const { data: profileByEmail, loading: loadingEmailId } = useDoc<User>(profileByEmailRef as any);

  const userProfileQuery = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return query(collection(db, 'users'), where('email', '==', user.email));
  }, [db, user?.email]);
  const { data: profileResults = [], loading: loadingQuery } = useCollection<User>(userProfileQuery as any);

  const userProfileQueryLower = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return query(collection(db, 'users'), where('email', '==', user.email.toLowerCase()));
  }, [db, user?.email]);
  const { data: profileResultsLower = [] } = useCollection<User>(userProfileQueryLower as any);

  const profile = useMemo(
    () => profileByEmail || profileByUid || profileResults[0] || profileResultsLower[0] || null,
    [profileByEmail, profileByUid, profileResults, profileResultsLower]
  );

  const orgRef = useMemo(
    () => (db && profile?.orgId ? doc(db, 'organisations', profile.orgId) : null),
    [db, profile?.orgId]
  );
  const { data: organisation, loading: loadingOrg } = useDoc<Organisation>(orgRef as any);

  const loading = authLoading || loadingUid || loadingEmailId || loadingQuery || loadingOrg;

  const permissions = useMemo(() => {
    const defaults = getDefaultPermissionsForUser(profile, user?.email);
    return profile?.permissions ? { ...defaults, ...profile.permissions } : defaults;
  }, [profile, user?.email]);

  const currentUserRoles = useMemo(() => getUserRoles(profile), [profile]);

  const isAdmin = useMemo(() => isAdminUser(profile), [profile]);

  const isManagement = useMemo(
    () =>
      isAdmin ||
      hasAnyRole(profile, [
        Roles.OPERATIONS_MANAGER,
        Roles.AREA_MANAGER,
        Roles.HEAD_OF_SERVICE,
        Roles.PARK_MANAGER,
      ]),
    [isAdmin, profile]
  );

  const isVolunteer = useMemo(() => isVolunteerUser(profile), [profile]);

  React.useEffect(() => {
    if (!db || !user || !profile?.id) return;

    const updateStatus = async (online: boolean) => {
      try {
        const userRef = doc(db, 'users', profile.id);
        await updateDoc(userRef, {
          isOnline: online,
          lastActive: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to update presence:', err);
      }
    };

    updateStatus(true);

    const interval = setInterval(() => updateStatus(true), 120000);
    const handleUnload = () => {
      // rely on lastActive timestamp instead of async updateDoc on unload
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [db, user, profile?.id]);

  const value: UserContextType = {
    profile,
    organisation,
    permissions,
    loading,
    isAdmin,
    isManagement,
    isVolunteer,
    currentUserRoles,
    hasRole: (role: string) => hasRole(profile, role),
    hasAnyRole: (roles: string[]) => hasAnyRole(profile, roles),
    hasPermission: (permission: string) => hasPermission(profile, permission),
    hasModule: (module: string) => hasModule(profile, organisation, module),
    canAccessPark: (parkId?: string) => canAccessPark(profile, parkId),
    canAccessDepot: (depotId?: string) => canAccessDepot(profile, depotId),
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
