'use client';

import { useAuth, useFirestore } from '../provider';
import { useDoc } from '../firestore/use-doc';
import { useEffect, useState, useMemo } from 'react';
import { User } from '@/lib/types';
import { doc } from 'firebase/firestore';

export function useUser() {
    const { user: authUser, loading: authLoading } = useAuth();
    const db = useFirestore();

    const docRef = useMemo(() => {
        if (authUser) {
            return doc(db, 'users', authUser.uid);
        }
        return null;
    }, [authUser, db]);

    const { data: firestoreUser, loading: firestoreLoading, error: firestoreError } = useDoc<User>(docRef);

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const combinedLoading = authLoading || firestoreLoading;
        setLoading(combinedLoading);

        if (firestoreError) {
            setError(firestoreError);
            console.error("Firestore error in useUser:", firestoreError);
        }

        if (!combinedLoading) {
            if (authUser) {
                const baseUser: User = { 
                    uid: authUser.uid, 
                    email: authUser.email, 
                    displayName: authUser.displayName 
                };

                if (firestoreUser) {
                    setUser({ ...baseUser, ...firestoreUser });
                } else {
                    setUser(baseUser);
                }
            } else {
                setUser(null);
            }
        }
    }, [authUser, firestoreUser, authLoading, firestoreLoading, firestoreError]);

    return { user, loading, error };
}
