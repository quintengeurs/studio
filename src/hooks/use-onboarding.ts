"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { useUserContext } from "@/context/UserContext";

export function useOnboarding() {
  const db = useFirestore();
  const { user } = useUser();
  const { profile, loading, isAdmin } = useUserContext();
  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    if (loading || !profile || !user) return;
    // Admins skip the tour — they set the system up for others
    if (isAdmin) return;
    // Show tour only if flag is explicitly false/undefined (never completed)
    if (!profile.hasCompletedOnboarding) {
      // Small delay so the dashboard renders first before spotlight fires
      const timer = setTimeout(() => setShouldShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [loading, profile, user, isAdmin]);

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

export function useVolunteerOnboarding() {
  const db = useFirestore();
  const { user } = useUser();
  const { profile, loading } = useUserContext();
  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    if (loading || !profile || !user) return;
    // Show tour only if flag is explicitly false/undefined (never completed)
    if (!profile.hasCompletedVolunteerOnboarding) {
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
        hasCompletedVolunteerOnboarding: true,
      });
    } catch (e) {
      console.warn("Could not save volunteer onboarding state:", e);
    }
  }, [db, profile?.id]);

  const restartTour = useCallback(async () => {
    if (!db || !profile?.id) return;
    try {
      await updateDoc(doc(db, "users", profile.id), {
        hasCompletedVolunteerOnboarding: false,
      });
      setShouldShowTour(true);
    } catch (e) {
      console.warn("Could not reset volunteer onboarding state:", e);
    }
  }, [db, profile?.id]);

  return { shouldShowTour, markTourComplete, restartTour };
}
