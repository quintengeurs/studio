'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { User, ParkDetail, RegistryConfig, Asset, Issue } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useUserContext } from './UserContext';

interface DataContextType {
  allUsers: User[];
  allParks: ParkDetail[];
  allAssets: Asset[];
  allIssues: Issue[];
  registryConfig: RegistryConfig | null;
  loading: boolean;
  configLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const db = useFirestore();
  const { user } = useUser();
  const { profile, isAdmin } = useUserContext();

  const canAccessRestricted = !!(user && (profile || isAdmin));

  const orgId = profile?.orgId;

  const usersQuery = useMemoFirebase(() => 
    (db && canAccessRestricted && orgId) ? query(collection(db, "users"), where("orgId", "==", orgId), orderBy("name", "asc")) : null, 
  [db, canAccessRestricted, orgId]);
  const { data: allUsers = [], loading: loadingUsers } = useCollection<User>(usersQuery as any);

  const parksQuery = useMemoFirebase(() => 
    (db && canAccessRestricted && orgId) ? query(collection(db, "parks_details"), where("orgId", "==", orgId), orderBy("name", "asc")) : null, 
  [db, canAccessRestricted, orgId]);
  const { data: allParksRaw, loading: loadingParks } = useCollection<ParkDetail>(parksQuery as any);
  const allParks = allParksRaw || [];
  const registryRef = useMemo(() => (db && canAccessRestricted && orgId) ? doc(db, "settings", orgId) : null, [db, canAccessRestricted, orgId]);
  const { data: registryConfig, loading: configLoading } = useDoc<RegistryConfig>(registryRef as any);

  const assetsQuery = useMemoFirebase(() => 
    (db && canAccessRestricted && orgId) ? query(collection(db, "assets"), where("orgId", "==", orgId), orderBy("name", "asc")) : null, 
  [db, canAccessRestricted, orgId]);
  const { data: allAssets = [], loading: loadingAssets } = useCollection<Asset>(assetsQuery as any);

  const issuesQuery = useMemoFirebase(() => 
    (db && canAccessRestricted && orgId) ? query(collection(db, "issues"), where("orgId", "==", orgId), orderBy("createdAt", "desc")) : null, 
  [db, canAccessRestricted, orgId]);
  const { data: allIssues = [], loading: loadingIssues } = useCollection<Issue>(issuesQuery as any);

  const value = {
    allUsers,
    allParks,
    allAssets,
    allIssues,
    registryConfig,
    loading: loadingUsers || loadingParks || loadingAssets || loadingIssues,
    configLoading
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}
