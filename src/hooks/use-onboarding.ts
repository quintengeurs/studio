"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { useUserContext } from "@/context/UserContext";

export function useOnboarding() {
  const db = useFirestore();
  const { user } = useUser();
  const { profile, loading, isAdmin, organization } = useUserContext();
  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    if (loading || !profile || !user) return;
    // Admins skip the tour — they set the system up for others
    if (isAdmin) return;
    // Skip if disabled globally in organization settings
    if (organization?.settings?.disableOnboardingTour) return;

    // Check localStorage fallback
    const localKey = `hasCompletedOnboarding_${profile.id || user.uid}`;
    const hasCompletedLocally = localStorage.getItem(localKey) === 'true';

    // Show tour only if flag is explicitly false/undefined (never completed)
    if (!profile.hasCompletedOnboarding && !hasCompletedLocally) {
      // Small delay so the dashboard renders first before spotlight fires
      const timer = setTimeout(() => setShouldShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [loading, profile, user, isAdmin, organization?.settings?.disableOnboardingTour]);

  const markTourComplete = useCallback(async () => {
    setShouldShowTour(false);
    
    const userId = profile?.id || user?.uid;
    if (userId) {
      localStorage.setItem(`hasCompletedOnboarding_${userId}`, 'true');
    }

    if (!db || !profile?.id) return;
    try {
      await updateDoc(doc(db, "users", profile.id), {
        hasCompletedOnboarding: true,
      });
    } catch (e) {
      console.warn("Could not save onboarding state:", e);
    }
  }, [db, profile?.id, user?.uid]);

  const restartTour = useCallback(async () => {
    const userId = profile?.id || user?.uid;
    if (userId) {
      localStorage.removeItem(`hasCompletedOnboarding_${userId}`);
    }

    if (!db || !profile?.id) return;
    try {
      await updateDoc(doc(db, "users", profile.id), {
        hasCompletedOnboarding: false,
      });
      setShouldShowTour(true);
    } catch (e) {
      console.warn("Could not reset onboarding state:", e);
    }
  }, [db, profile?.id, user?.uid]);

  return { shouldShowTour, markTourComplete, restartTour };
}

export function useVolunteerOnboarding() {
  const db = useFirestore();
  const { user } = useUser();
  const { profile, loading } = useUserContext();
  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    if (loading || !profile || !user) return;
    
    const localKey = `hasCompletedVolunteerOnboarding_${profile.id || user.uid}`;
    const hasCompletedLocally = localStorage.getItem(localKey) === 'true';

    // Show tour only if flag is explicitly false/undefined (never completed)
    if (!profile.hasCompletedVolunteerOnboarding && !hasCompletedLocally) {
      // Small delay so the dashboard renders first before spotlight fires
      const timer = setTimeout(() => setShouldShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [loading, profile, user]);

  const markTourComplete = useCallback(async () => {
    setShouldShowTour(false);
    
    const userId = profile?.id || user?.uid;
    if (userId) {
      localStorage.setItem(`hasCompletedVolunteerOnboarding_${userId}`, 'true');
    }

    if (!db || !profile?.id) return;
    try {
      await updateDoc(doc(db, "users", profile.id), {
        hasCompletedVolunteerOnboarding: true,
      });
    } catch (e) {
      console.warn("Could not save volunteer onboarding state:", e);
    }
  }, [db, profile?.id, user?.uid]);

  const restartTour = useCallback(async () => {
    const userId = profile?.id || user?.uid;
    if (userId) {
      localStorage.removeItem(`hasCompletedVolunteerOnboarding_${userId}`);
    }

    if (!db || !profile?.id) return;
    try {
      await updateDoc(doc(db, "users", profile.id), {
        hasCompletedVolunteerOnboarding: false,
      });
      setShouldShowTour(true);
    } catch (e) {
      console.warn("Could not reset volunteer onboarding state:", e);
    }
  }, [db, profile?.id, user?.uid]);

  return { shouldShowTour, markTourComplete, restartTour };
}
