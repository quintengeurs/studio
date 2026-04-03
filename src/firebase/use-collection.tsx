import { useMemo } from 'react';
import { useCollection as useFirestoreCollection } from 'react-firebase-hooks/firestore';

export const useCollection = (query, options) => {
  const [snapshot, loading, error] = useFirestoreCollection(query, options);

  const data = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  }, [snapshot]);

  return [data, loading, error];
};

export const useMemoFirebase = (callback, deps) => {
  return useMemo(() => callback, deps);
};