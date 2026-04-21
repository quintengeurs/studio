'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { User, ParkDetail, RegistryConfig, Asset, Issue } from '@/lib/types';
import { doc } from 'firebase/firestore';

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

  const usersQuery = useMemoFirebase(() => 
    db ? query(collection(db, "users"), orderBy("name", "asc")) : null, 
  [db]);
  const { data: allUsers, loading: loadingUsers } = useCollection<User>(usersQuery as any);

  const parksQuery = useMemoFirebase(() => 
    db ? query(collection(db, "parkDetails"), orderBy("name", "asc")) : null, 
  [db]);
  const { data: allParks, loading: loadingParks } = useCollection<ParkDetail>(parksQuery as any);

  const registryRef = useMemo(() => db ? doc(db, "settings", "registry") : null, [db]);
  const { data: registryConfig, loading: configLoading } = useDoc<RegistryConfig>(registryRef as any);

  const assetsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "assets"), orderBy("name", "asc")) : null, 
  [db]);
  const { data: allAssets, loading: loadingAssets } = useCollection<Asset>(assetsQuery as any);

  const issuesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "issues"), orderBy("createdAt", "desc")) : null, 
  [db]);
  const { data: allIssues, loading: loadingIssues } = useCollection<Issue>(issuesQuery as any);

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
