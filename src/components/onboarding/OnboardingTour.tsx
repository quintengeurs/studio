"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { useUserContext } from "@/context/UserContext";

// ─── Step definitions ─────────────────────────────────────────────────────────

interface TourStep {
  id: string;
  target: string | null; // CSS selector or null for centered modal
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  roles?: "all" | "management" | "operative" | "admin";
  requiresPermission?: string;
}

const ALL_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: null,
    title: "Welcome! 👋",
    body: "This quick tour will show you where to find everything you need. It only takes about 30 seconds.",
    placement: "center",
    roles: "all",
  },
  {
    id: "sidebar",
    target: "#app-sidebar",
    title: "Main Navigation",
    body: "Every section of the system lives here — your tasks, park management, issues, and more. Click any item to navigate.",
    placement: "right",
    roles: "all",
  },
  {
    id: "nav-my-tasks",
    target: "[data-tour='nav-my-tasks']",
    title: "My Tasks",
    body: "This is your personal to-do list. All tasks assigned to you appear here, organised by status. Start here every morning.",
    placement: "right",
    roles: "all",
  },
  {
    id: "quick-access",
    target: "#tour-quick-access",
    title: "Quick Actions",
    body: "One-click shortcuts to the most common actions — raise an issue, log ad-hoc work, request materials, or jump straight to your task list.",
    placement: "bottom",
    roles: "all",
  },
  {
    id: "stat-cards",
    target: "#tour-stat-cards",
    title: "Live Counters",
    body: "These cards give you a live count of what's outstanding. Click any card to go straight to the full list.",
    placement: "top",
    roles: "all",
  },
  {
    id: "unassigned-issues",
    target: "[data-tour='btn-unassigned-issues']",
    title: "Unassigned Issues",
    body: "As a manager, this is critical — the red badge shows how many issues are waiting for your allocation. Don't let them pile up.",
    placement: "top",
    roles: "management",
  },
  {
    id: "raise-issue",
    target: "[data-tour='btn-raise-issue']",
    title: "Raise an Issue",
    body: "Spotted something that needs fixing? Log it here instantly. Management will be notified and can assign it to the right team.",
    placement: "top",
    roles: "operative",
  },
  {
    id: "info-corner",
    target: "[data-tour='nav-info-corner']",
    title: "Info Corner",
    body: "Management shares documents, announcements, and call-to-action items here. Check back regularly for the latest updates from your organisation.",
    placement: "right",
    roles: "all",
    requiresPermission: "viewInfoCorner",
  },
  {
    id: "done",
    target: null,
    title: "You're all set! 🎉",
    body: "That's the tour. You can restart it any time from your profile. Now go explore — your workspace is ready.",
    placement: "center",
    roles: "all",
  },
];

// ─── Spotlight overlay component ──────────────────────────────────────────────

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function Spotlight({ rect }: { rect: SpotlightRect | null }) {
  if (!rect) return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-[9998]" />
  );

  const padding = 8;
  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Top block */}
      <div
        className="absolute bg-black/70 backdrop-blur-[2px]"
        style={{ top: 0, left: 0, right: 0, height: rect.top - padding }}
      />
      {/* Bottom block */}
      <div
        className="absolute bg-black/70 backdrop-blur-[2px]"
        style={{ top: rect.top + rect.height + padding, left: 0, right: 0, bottom: 0 }}
      />
      {/* Left block */}
      <div
        className="absolute bg-black/70 backdrop-blur-[2px]"
        style={{ top: rect.top - padding, left: 0, width: rect.left - padding, height: rect.height + padding * 2 }}
      />
      {/* Right block */}
      <div
        className="absolute bg-black/70 backdrop-blur-[2px]"
        style={{ top: rect.top - padding, left: rect.left + rect.width + padding, right: 0, height: rect.height + padding * 2 }}
      />
      {/* Highlight ring */}
      <div
        className="absolute rounded-xl ring-2 ring-primary/60 ring-offset-0 animate-pulse pointer-events-none"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          boxShadow: "0 0 0 4px hsl(var(--primary) / 0.15)",
        }}
      />
    </div>
  );
}

// ─── Tooltip bubble component ─────────────────────────────────────────────────

interface TooltipProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: SpotlightRect | null;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  isLast: boolean;
  isFirst: boolean;
}

function TourTooltip({ step, stepIndex, totalSteps, targetRect, onPrev, onNext, onSkip, isLast, isFirst }: TooltipProps) {
  const [pos, setPos] = useState({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });

  useEffect(() => {
    if (!targetRect || step.placement === "center") {
      setPos({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
      return;
    }

    const padding = 20;
    const TOOLTIP_W = 320;
    const TOOLTIP_H = 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top: number;
    let left: number;

    switch (step.placement) {
      case "right":
        top = targetRect.top + targetRect.height / 2 - TOOLTIP_H / 2;
        left = targetRect.left + targetRect.width + padding;
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2 - TOOLTIP_H / 2;
        left = targetRect.left - TOOLTIP_W - padding;
        break;
      case "top":
        top = targetRect.top - TOOLTIP_H - padding;
        left = targetRect.left + targetRect.width / 2 - TOOLTIP_W / 2;
        break;
      case "bottom":
      default:
        top = targetRect.top + targetRect.height + padding;
        left = targetRect.left + targetRect.width / 2 - TOOLTIP_W / 2;
    }

    // Clamp to viewport
    top = Math.max(padding, Math.min(top, vh - TOOLTIP_H - padding));
    left = Math.max(padding, Math.min(left, vw - TOOLTIP_W - padding));

    setPos({ top: `${top}px`, left: `${left}px`, transform: "none" });
  }, [targetRect, step.placement]);

  return (
    <div
      className="fixed z-[9999] w-80 bg-background rounded-2xl shadow-2xl border-2 border-primary/20 p-5 flex flex-col gap-4 transition-all duration-300"
      style={{ top: pos.top, left: pos.left, transform: pos.transform }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-base leading-tight">{step.title}</h3>
        </div>
        <button
          onClick={onSkip}
          className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Skip tour"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? "w-4 h-2 bg-primary"
                  : "w-2 h-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-bold" onClick={onPrev}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
            </Button>
          )}
          {isLast ? (
            <Button size="sm" className="h-8 px-4 text-xs font-bold bg-primary" onClick={onNext}>
              Done 🎉
            </Button>
          ) : (
            <Button size="sm" className="h-8 px-3 text-xs font-bold" onClick={onNext}>
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Skip link */}
      {!isLast && (
        <button
          onClick={onSkip}
          className="text-[10px] text-center text-muted-foreground/60 hover:text-muted-foreground transition-colors uppercase tracking-widest font-bold -mt-2"
        >
          Skip tour
        </button>
      )}
    </div>
  );
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const { isManagement, isAdmin, permissions } = useUserContext();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);

  // Filter steps based on role and permissions
  const activeSteps = React.useMemo(() => {
    return ALL_STEPS.filter((step) => {
      // Permission gate
      if (step.requiresPermission && !(permissions as any)[step.requiresPermission]) return false;
      // Role gate
      if (step.roles === "management" && !isManagement && !isAdmin) return false;
      if (step.roles === "operative" && (isManagement || isAdmin)) return false;
      return true;
    });
  }, [isManagement, isAdmin, permissions]);

  const currentStep = activeSteps[stepIndex];

  // Measure target element and scroll it into view
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

    // Wait for scroll to finish before measuring
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
