'use client';

import { useState, useEffect } from 'react';

/**
 * MOCKED useUser hook for prototyping.
 * Returns a consistent user object with string defaults to prevent 
 * property access errors during development.
 */
export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate a brief loading state then "log in" the master user
    const timer = setTimeout(() => {
      setUser({
        uid: 'quinten-master-mock-id',
        email: 'quinten.geurs@gmail.com',
        displayName: 'Quinten Geurs',
        photoURL: 'https://picsum.photos/seed/quinten/40/40',
        role: 'master', // Master role for full system access
      });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return { user, loading };
}
