'use client';

import React, { useMemo, useEffect } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { collection, getDocs, initializeFirestore, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';

const DB_ID = "ai-studio-046cc7f7-4cac-49bd-9295-55f90b8445f0";

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const { app, db, auth } = useMemo(() => initializeFirebase(), []);

  useEffect(() => {
    // TEST 1: The shared db instance from context
    console.log('[DB-TEST] ====== DATABASE CONNECTIVITY TEST ======');
    console.log('[DB-TEST] Shared db exists:', !!db);
    console.log('[DB-TEST] Shared db app projectId:', db?.app?.options?.projectId);
    console.log('[DB-TEST] Shared db type:', db?.type);
    
    // Try to read the internal database ID
    try {
      const dbJson = JSON.stringify(db, null, 2);
      console.log('[DB-TEST] Shared db JSON:', dbJson?.substring(0, 500));
    } catch(e) {
      console.log('[DB-TEST] Could not stringify db');
    }

    if (db) {
      console.log('[DB-TEST] Test 1: Reading users from SHARED db...');
      getDocs(collection(db, 'users'))
        .then(snap => console.log(`[DB-TEST] Test 1 RESULT: ${snap.size} users from shared db`))
        .catch(err => console.error(`[DB-TEST] Test 1 FAILED:`, err.code, err.message));
    }

    // TEST 2: Fresh connection (exactly like debug-data probe that found 20 users)
    console.log('[DB-TEST] Test 2: Creating FRESH connection to Profile B...');
    try {
      const freshAppName = `connectivity-test-${Date.now()}`;
      const freshApp = initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: "studio-4537887383-23869",
      }, freshAppName);
      
      const freshDb = initializeFirestore(freshApp, {
        experimentalForceLongPolling: true,
      }, DB_ID);

      getDocs(collection(freshDb, 'users'))
        .then(snap => {
          console.log(`[DB-TEST] Test 2 RESULT: ${snap.size} users from FRESH connection`);
          snap.docs.slice(0, 3).forEach(d => {
            console.log(`[DB-TEST]   - ${d.id}: ${d.data().name || d.data().email || '?'}`);
          });
          if (snap.size > 0) {
            console.log('[DB-TEST] >>> FRESH connection works! Shared db is misconfigured. <<<');
          }
        })
        .catch(err => console.error(`[DB-TEST] Test 2 FAILED:`, err.code, err.message));
    } catch(e: any) {
      console.error('[DB-TEST] Test 2 setup error:', e.message);
    }
  }, [db]);

  return (
    <FirebaseProvider app={app} db={db} auth={auth}>
      {children}
    </FirebaseProvider>
  );
}
