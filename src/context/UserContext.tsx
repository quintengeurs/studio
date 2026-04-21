'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { User, AccessPermissions } from '@/lib/types';
import { getDefaultPermissionsForUser } from '@/lib/permissions';

interface UserContextType {
  profile: User | null;
  permissions: AccessPermissions;
  loading: boolean;
  isAdmin: boolean;
  isManagement: boolean;
  currentUserRoles: string[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();

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

  // 3. Check by Email Field (search pattern)
  const userProfileQuery = useMemoFirebase(() => 
    db && user?.email ? query(collection(db, "users"), where("email", "==", user.email)) : null,
  [db, user?.email]);
  const { data: profileResults = [], loading: loadingQuery } = useCollection<User>(userProfileQuery as any);

  const profile = profileByEmail || profileByUid || profileResults[0] || null;
  const loading = authLoading || (loadingUid && loadingEmailId && loadingQuery);

  const permissions = useMemo(() => 
    getDefaultPermissionsForUser(profile, user?.email), 
  [profile, user?.email]);

  const currentUserRoles = useMemo(() => 
    profile?.roles || (profile?.role ? [profile.role] : []),
  [profile]);

  const isAdmin = useMemo(() => 
    currentUserRoles.includes('Admin') || user?.email?.toLowerCase() === 'quinten.geurs@gmail.com',
  [currentUserRoles, user?.email]);

  const isManagement = useMemo(() => 
    currentUserRoles.some(r => ['Area Manager', 'Assistant Area Manager', 'Operations Manager', 'Head Gardener', 'Park Manager'].includes(r)) || isAdmin,
  [currentUserRoles, isAdmin]);

  const value = {
    profile,
    permissions,
    loading,
    isAdmin,
    isManagement,
    currentUserRoles
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
