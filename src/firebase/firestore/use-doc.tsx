'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  DocumentReference, 
  onSnapshot, 
  DocumentData, 
  DocumentSnapshot,
  FirestoreError
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

interface UseDocOptions {
  maxRetries?: number;
  retryDelay?: number;
}

export function useDoc<T = DocumentData>(
  docRef: DocumentReference<T> | null,
  options: UseDocOptions = {}
) {
  const { maxRetries = 3, retryDelay = 2000 } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [retryCount, setRetries] = useState(0);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback(() => {
    if (!docRef) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // cleanup previous
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      unsubscribeRef.current = onSnapshot(
        docRef,
        (snapshot: DocumentSnapshot<T>) => {
          setData(snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as T : null);
          setLoading(false);
          setError(null);
          setRetries(0);
        },
        (err: FirestoreError) => {
          console.error(`[useDoc] SNAPSHOT ERROR:`, err.code, err.message);
          
          const isRetryable = err.code === 'permission-denied' || 
                              err.message?.includes('INTERNAL ASSERTION FAILED') ||
                              err.message?.includes('ca9');

          if (isRetryable && retryCount < maxRetries) {
            console.warn(`[useDoc] Attempting retry ${retryCount + 1}/${maxRetries} in ${retryDelay}ms...`);
            setTimeout(() => {
              setRetries(prev => prev + 1);
              subscribe();
            }, retryDelay);
          } else {
            if (err.code === 'permission-denied') {
              const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
              });
              errorEmitter.emit('permission-error', permissionError);
            }
            setError(err);
            setLoading(false);
          }
        }
      );
    } catch (e: any) {
      setError(e);
      setLoading(false);
    }
  }, [docRef, retryCount, maxRetries, retryDelay]);

  useEffect(() => {
    subscribe();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [docRef, retryCount, subscribe]);

  return { data, loading, error, retry: () => setRetries(0) };
}
