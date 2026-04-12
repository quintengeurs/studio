'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Query, 
  onSnapshot, 
  DocumentData, 
  QuerySnapshot 
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const queryRef = useRef(query);

  // Only update the ref if the query actually changed meaningfully
  // This prevents infinite re-subscription from unstable object references
  if (query !== queryRef.current) {
    queryRef.current = query;
  }

  useEffect(() => {
    const currentQuery = queryRef.current;
    if (!currentQuery) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      currentQuery,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`[useCollection] SNAPSHOT ERROR:`, err.code, err.message);
        const permissionError = new FirestorePermissionError({
          path: 'query',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      console.log('[useCollection] Unsubscribing from query');
      unsubscribe();
    };
  }, [query]);

  return { data, loading, error };
}
