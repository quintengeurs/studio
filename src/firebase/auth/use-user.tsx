'use client';

import { useState, useEffect } from 'react';

/**
 * MOCKED useUser hook for prototyping.
 * This returns a static master user to bypass live Firebase Auth requirements.
 */
export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate a brief loading state then "log in" the master user
    const timer = setTimeout(() => {
      setUser({
        uid: 'quinten-master-mock-id',
        email: 'quinten.geurs@hackney.gov.uk',
        displayName: 'Quinten Geurs',
        photoURL: 'https://picsum.photos/seed/quinten/40/40',
      });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return { user, loading };
}
