'use client';

import React, { useMemo, useEffect } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { collection, getDocs } from 'firebase/firestore';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const { app, db, auth } = useMemo(() => initializeFirebase(), []);

  // Minimal health check — confirm db is connected to correct project
  useEffect(() => {
    if (!db) return;
    const pid = db?.app?.options?.projectId;
    console.log(`[Firebase] Health check: projectId=${pid}`);
    
    getDocs(collection(db, 'users'))
      .then(snap => console.log(`[Firebase] Health check: ${snap.size} users found`))
      .catch(err => console.error(`[Firebase] Health check FAILED:`, err.message));
  }, [db]);

  return (
    <FirebaseProvider app={app} db={db} auth={auth}>
      {children}
    </FirebaseProvider>
  );
}
