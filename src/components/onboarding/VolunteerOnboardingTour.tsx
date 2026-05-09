"use client";

import React, { useEffect, useState, useCallback } from "react";
import { TourStep, SpotlightRect, Spotlight, TourTooltip } from "./OnboardingTour";

const VOLUNTEER_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: null,
    title: "Welcome to the Hub! 🧡",
    body: "Thanks for volunteering! Let's take a quick look around so you know how to find tasks and track your rewards.",
    placement: "center",
  },
  {
    id: "tabs",
    target: "#vol-tabs",
    title: "Your Hub Navigation",
    body: "These tabs let you switch between viewing available tasks, your personal activity, and the latest news.",
    placement: "bottom",
  },
  {
    id: "tab-tasks",
    target: "[data-tour='vol-tab-tasks']",
    title: "Available Tasks",
    body: "This is where you'll find new opportunities. Browse tasks, check the requirements, and sign up for what interests you.",
    placement: "bottom",
  },
  {
    id: "tab-activity",
    target: "[data-tour='vol-tab-activity']",
    title: "My Activity & Rewards",
    body: "Track your in-progress tasks here, and see the points you've earned! You can redeem points for rewards here too.",
    placement: "bottom",
  },
  {
    id: "tab-news",
    target: "[data-tour='vol-tab-news']",
    title: "Hub News",
    body: "Stay in the loop with updates, announcements, and call-to-actions from the organisation.",
    placement: "bottom",
  },
  {
    id: "done",
    target: null,
    title: "You're all set! 🎉",
    body: "You're ready to start making a difference. Enjoy the Volunteer Hub!",
    placement: "center",
  },
];

interface VolunteerOnboardingTourProps {
  onComplete: () => void;
}

export function VolunteerOnboardingTour({ onComplete }: VolunteerOnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);

  const activeSteps = VOLUNTEER_STEPS;
  const currentStep = activeSteps[stepIndex];

  const measureTarget = useCallback(() => {
    if (!currentStep?.target) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(currentStep.target) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "nearest" });

    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }, 350);
  }, [currentStep]);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    return () => window.removeEventListener("resize", measureTarget);
  }, [measureTarget]);

  const handleNext = () => {
    if (stepIndex < activeSteps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  if (!currentStep) return null;

  return (
    <>
      <Spotlight rect={currentStep.target ? targetRect : null} />
      <TourTooltip
        step={currentStep}
        stepIndex={stepIndex}
        totalSteps={activeSteps.length}
        targetRect={currentStep.target ? targetRect : null}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={onComplete}
        isFirst={stepIndex === 0}
        isLast={stepIndex === activeSteps.length - 1}
      />
    </>
  );
}
