'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, getIdTokenResult, ParsedToken } from 'firebase/auth';
import { useAuth } from '../provider';

/**
 * useUser hook for Firebase Authentication.
 * Subscribes to auth state changes and returns the current user + custom claims.
 */
export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<ParsedToken | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        try {
          // Force refresh to get latest claims
          const tokenResult = await getIdTokenResult(authUser, true);
          setClaims(tokenResult.claims);
        } catch (error) {
          console.error("Error fetching user claims:", error);
          setClaims(null);
        }
      } else {
        setClaims(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, claims, loading };
}
