"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { useUserContext } from "@/context/UserContext";

export function useOnboarding() {
  const db = useFirestore();
  const { user } = useUser();
  const { profile, loading } = useUserContext();
  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    if (loading || !profile || !user) return;
    // Show tour only if flag is explicitly false/undefined (never completed)
    if (!profile.hasCompletedOnboarding) {
      // Small delay so the dashboard renders first before spotlight fires
      const timer = setTimeout(() => setShouldShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [loading, profile, user]);

  const markTourComplete = useCallback(async () => {
    setShouldShowTour(false);
    if (!db || !profile?.id) return;
    try {
      await updateDoc(doc(db, "users", profile.id), {
        hasCompletedOnboarding: true,
      });
    } catch (e) {
      console.warn("Could not save onboarding state:", e);
    }
  }, [db, profile?.id]);

  const restartTour = useCallback(async () => {
    if (!db || !profile?.id) return;
    try {
      await updateDoc(doc(db, "users", profile.id), {
        hasCompletedOnboarding: false,
      });
      setShouldShowTour(true);
    } catch (e) {
      console.warn("Could not reset onboarding state:", e);
    }
  }, [db, profile?.id]);

  return { shouldShowTour, markTourComplete, restartTour };
}
