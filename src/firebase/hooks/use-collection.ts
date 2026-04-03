
import { useFirestore } from '../provider';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, Query } from 'firebase/firestore';

export function useCollection<T>(path: string, queryBuilder?: (ref: any) => Query) {
    const db = useFirestore();
    const [data, setData] = useState<T[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!db) return;
        let unsubscribe: () => void;
        try {
            const ref = collection(db, path);
            const q = queryBuilder ? queryBuilder(ref) : ref;
            unsubscribe = onSnapshot(q, (snapshot) => {
                const result: T[] = [];
                snapshot.forEach((doc) => {
                    result.push({ id: doc.id, ...doc.data() } as any);
                });
                setData(result);
                setLoading(false);
            });
        } catch (e: any) {
            setError(e);
            setLoading(false);
        }

        return () => unsubscribe && unsubscribe();
    }, [db, path]);

    return { data, loading, error };
}
