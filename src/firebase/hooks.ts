
import { useEffect, useState } from "react";
import { doc, onSnapshot, DocumentData } from "firebase/firestore";
import { db, auth } from "./index"; // Using the new singleton instances
import { User, onAuthStateChanged } from "firebase/auth";

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
          setData(doc.data() as T);
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

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, loading };
}

export function useUser() {
    const { user: authUser, loading: authLoading } = useAuth();
    const path = authUser ? `users/${authUser.uid}` : '';
    const { data: user, loading: userLoading, error } = useDoc<any>(path);
  
    return { user, loading: authLoading || userLoading, error };
}
