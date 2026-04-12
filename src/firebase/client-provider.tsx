'use client';

import React, { useMemo, useEffect } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { collection, getDocs } from 'firebase/firestore';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const { app, db, auth } = useMemo(() => initializeFirebase(), []);

  // ONE-SHOT DATABASE CONNECTIVITY TEST
  useEffect(() => {
    if (!db) {
      console.error('[DB-TEST] db is null/undefined!');
      return;
    }
    console.log('[DB-TEST] Testing database connectivity with getDocs...');
    console.log('[DB-TEST] db instance:', db);
    
    getDocs(collection(db, 'users'))
      .then(snap => {
        console.log(`[DB-TEST] SUCCESS: Found ${snap.size} users in database`);
        snap.docs.slice(0, 3).forEach(d => {
          console.log(`[DB-TEST]   - User: ${d.id} => ${d.data().name || d.data().email || 'unknown'}`);
        });
      })
      .catch(err => {
        console.error(`[DB-TEST] FAILED: ${err.code} - ${err.message}`);
      });
  }, [db]);

  return (
    <FirebaseProvider app={app} db={db} auth={auth}>
      {children}
    </FirebaseProvider>
  );
}
