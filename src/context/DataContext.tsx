'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { collection, query, orderBy, where, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { User, ParkDetail, RegistryConfig, Asset, Issue } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useUserContext } from './UserContext';

interface DataContextType {
  allUsers: User[];
  allParks: ParkDetail[];
  registryConfig: RegistryConfig | null;
  loading: boolean;
  configLoading: boolean;
  // Lazy-loaded data getters
  getIssues: () => Promise<Issue[]>;
  getAssets: () => Promise<Asset[]>;
  getActivities: (category?: string) => Promise<any[]>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const db = useFirestore();
  const { user } = useUser();
  const { profile, isAdmin, effectiveOrgId } = useUserContext();
  const canAccessRestricted = !!(user && (profile || isAdmin));
  const orgId = effectiveOrgId;

  // Staff only — exclude volunteer-flagged accounts which are managed via /volunteering
  const usersQuery = useMemoFirebase(() => 
    (db && canAccessRestricted && orgId) ? query(
      collection(db, "users"), 
      where("orgId", "==", orgId),
      where("isVolunteer", "!=", true),
      orderBy("isVolunteer", "asc"),
      orderBy("name", "asc")
    ) : null, 
  [db, canAccessRestricted, orgId]);
  const { data: allUsersRaw = [], loading: loadingUsers } = useCollection<User>(usersQuery as any);

  // Double-guard: filter in memory as well in case any legacy records slipped through
  const allUsers = useMemo(
    () => allUsersRaw.filter(u => !u.isVolunteer),
    [allUsersRaw]
  );

  const parksQuery = useMemoFirebase(() => 
    (db && canAccessRestricted && orgId) ? query(collection(db, "parks_details"), where("orgId", "==", orgId), orderBy("name", "asc")) : null, 
  [db, canAccessRestricted, orgId]);
  const { data: allParksRaw, loading: loadingParks } = useCollection<ParkDetail>(parksQuery as any);
  const allParks = allParksRaw || [];

  const registryRef = useMemo(() => (db && canAccessRestricted && orgId) ? doc(db, "settings", orgId) : null, [db, canAccessRestricted, orgId]);
  const { data: registryConfig, loading: configLoading } = useDoc<RegistryConfig>(registryRef as any);

  // Lazy loaders
  const getIssues = async () => {
    if (!db || !orgId) return [];
    const q = query(collection(db, "issues"), where("orgId", "==", orgId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Issue));
  };

  const getAssets = async () => {
    if (!db || !orgId) return [];
    const q = query(collection(db, "assets"), where("orgId", "==", orgId), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Asset));
  };

  const getActivities = async (type?: string) => {
    if (!db || !orgId) return [];
    let q = query(collection(db, "park_activities"), where("orgId", "==", orgId), orderBy("createdAt", "desc"));
    if (type) {
      q = query(collection(db, "park_activities"), where("orgId", "==", orgId), where("type", "==", type), orderBy("createdAt", "desc"));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  };

  const value = {
    allUsers,
    allParks,
    registryConfig,
    loading: loadingUsers || loadingParks,
    configLoading,
    getIssues,
    getAssets,
    getActivities
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
