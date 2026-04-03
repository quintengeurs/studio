
import { useFirestore } from '../provider';
import { useMemo } from 'react';
import { Query } from 'firebase/firestore';

export function useMemoFirebase(queryFn: (db: any) => Query) {
  const db = useFirestore();
  return useMemo(() => queryFn(db), [db]);
}
