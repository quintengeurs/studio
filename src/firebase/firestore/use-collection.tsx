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

export function useCollection<T = DocumentData>(
  query: Query<T> | null, 
  options: { fetchOnce?: boolean } = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const queryRef = useRef(query);

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

    if (options.fetchOnce) {
      const { getDocs } = require('firebase/firestore');
      getDocs(currentQuery)
        .then((snapshot: any) => {
          const items = snapshot.docs.map((doc: any) => ({
            ...doc.data(),
            id: doc.id,
          }));
          setData(items);
          setLoading(false);
          setError(null);
        })
        .catch((err: any) => {
          console.error(`[useCollection] FETCH ONCE ERROR:`, err.code, err.message);
          setError(err);
          setLoading(false);
        });
      return;
    }

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
      unsubscribe();
    };
  }, [query, options.fetchOnce]);

  return { data, loading, error };
}
