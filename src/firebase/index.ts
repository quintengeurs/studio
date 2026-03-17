'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

/**
 * Initializes Firebase services.
 * In prototyping mode, we provide dummy instances if the config is missing,
 * but the SDK still requires a valid-looking structure to prevent crashes.
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  if (getApps().length > 0) {
    app = getApp();
  } else {
    // Basic validation to prevent immediate crash if apiKey is missing
    const config = {
      ...firebaseConfig,
      apiKey: firebaseConfig.apiKey || "dummy-key"
    };
    app = initializeApp(config);
  }

  const db = getFirestore(app);
  const auth = getAuth(app);
  
  return { app, db, auth };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';

// Hook to help memoize Firebase queries/refs
import { useMemo } from 'react';
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}
