
import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot, DocumentData, query, collection, where, orderBy, Query } from "firebase/firestore";
import { db, auth } from "./index"; // Using the new singleton instances
import { User, onAuthStateChanged } from "firebase/auth";
import { useAuth, useFirestore } from "./provider";


export function useDoc<T = DocumentData>(path: string) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
  
    useEffect(() => {
      if (!db || !path) {
        setLoading(false);
        return;
      }
  
      const docRef = doc(db, path);
  
      const unsubscribe = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          setData({ id: doc.id, ...doc.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      }, (err) => {
        setError(err);
        setLoading(false);
      });
  
      return () => unsubscribe();
    }, [path]);
  
    return { data, loading, error };
}

export function useCollection<T = DocumentData>(query: Query | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(query, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T)));
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}

export function useUser() {
  const { user: authUser, loading: authLoading } = useAuth();
  const path = authUser ? `users/${authUser.uid}` : '';
  const { data: user, loading: userLoading, error } = useDoc<any>(path);

  return { user, loading: authLoading || userLoading, error };
}

export const useMemoFirebase = (queryBuilder: (db: any) => any) => {
  const db = useFirestore();
  return useMemo(() => queryBuilder(db), [db, queryBuilder]);
};
