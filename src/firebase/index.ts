'use client';

import { app, db, auth } from './config';
import { FirebaseError } from 'firebase/app';

/**
 * Initializes Firebase services.
 * Using consolidated initialization from config.ts.
 */
export interface FirebaseErrorExtended extends FirebaseError {
  requestResourceData?: unknown;
}

export function initializeFirebase() {
  return { app, db, auth };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';

// Hook to help memoize Firebase queries/refs
import { useMemo, DependencyList } from 'react';
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  return useMemo(factory, deps || []);
}


