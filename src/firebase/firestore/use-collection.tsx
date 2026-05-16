'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Query, 
  onSnapshot, 
  DocumentData, 
  QuerySnapshot,
  getDocs,
  FirestoreError
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

interface UseCollectionOptions {
  fetchOnce?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export function useCollection<T = DocumentData>(
  query: Query<T> | null, 
  options: UseCollectionOptions = {}
) {
  const { fetchOnce = false, maxRetries = 3, retryDelay = 2000 } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [retryCount, setRetries] = useState(0);
  
  const queryRef = useRef(query);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  if (query !== queryRef.current) {
    queryRef.current = query;
  }

  const subscribe = useCallback(() => {
    const currentQuery = queryRef.current;
    if (!currentQuery) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // cleanup previous
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (fetchOnce) {
      getDocs(currentQuery)
        .then((snapshot: any) => {
          const items = snapshot.docs.map((doc: any) => ({
            ...doc.data(),
            id: doc.id,
          }));
          setData(items);
          setLoading(false);
          setError(null);
          setRetries(0);
        })
        .catch((err: FirestoreError) => {
          handleError(err, 'FETCH_ONCE');
        });
      return;
    }

    try {
      unsubscribeRef.current = onSnapshot(
        currentQuery,
        (snapshot: QuerySnapshot<T>) => {
          const items = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
          }));
          setData(items);
          setLoading(false);
          setError(null);
          setRetries(0);
        },
        (err: FirestoreError) => {
          handleError(err, 'SNAPSHOT');
        }
      );
    } catch (e: any) {
      handleError(e, 'INITIAL_SETUP');
    }
  }, [fetchOnce, maxRetries, retryDelay]);

  const handleError = (err: FirestoreError | any, context: string) => {
    console.error(`[useCollection] ${context} ERROR:`, err.code || 'UNKNOWN', err.message);
    
    // Check for specific assertion-related errors or permission-denied
    const isRetryable = err.code === 'permission-denied' || 
                        err.message?.includes('INTERNAL ASSERTION FAILED') ||
                        err.message?.includes('ca9');

    if (isRetryable && retryCount < maxRetries) {
      console.warn(`[useCollection] Attempting retry ${retryCount + 1}/${maxRetries} in ${retryDelay}ms...`);
      setTimeout(() => {
        setRetries(prev => prev + 1);
        subscribe();
      }, retryDelay);
    } else {
      if (err.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: 'query',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
      setError(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    subscribe();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [query, fetchOnce, retryCount, subscribe]);

  return { data, loading, error, retry: () => setRetries(0) };
}
