"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useIntroTour } from "@/hooks/useIntroTour";
import { INTRO_STEPS_BY_ROLE } from "./introSteps";

export function IntroTour() {
  const { user } = useAuth();
  const { shouldShowIntro, markIntroSeen } = useIntroTour();
  // Holds the intro instance so cleanup can call exit()
  const instanceRef = useRef<{ exit: (force?: boolean) => Promise<unknown> } | null>(null);

  useEffect(() => {
    if (!shouldShowIntro || !user?.role) return;

    const steps = INTRO_STEPS_BY_ROLE[user.role];
    if (!steps || steps.length === 0) return;

    let active = true;
    let seenMarked = false;

    const markIntroSeenOnce = () => {
      if (!seenMarked) {
        seenMarked = true;
        markIntroSeen();
      }
    };

    const timer = setTimeout(() => {
      if (!active) return;

      import("intro.js")
        .then(({ default: introJs }) => {
          if (!active) return;

          const instance = introJs();
          instanceRef.current = instance;

          instance
            .setOptions({
              steps,
              nextLabel: "Next →",
              prevLabel: "← Back",
              skipLabel: "Skip tour",
              doneLabel: "Get started",
              showProgress: true,
              showBullets: false,
              exitOnOverlayClick: false,
              exitOnEsc: true,
              overlayOpacity: 0.5,
              scrollToElement: true,
              scrollTo: "element",
              helperElementPadding: 8,
              tooltipRenderAsHtml: true,
            })
            .onComplete(markIntroSeenOnce)
            .onExit(markIntroSeenOnce)
            .start();
        })
        .catch((err) => {
          console.error("[IntroTour] Failed to load:", err);
        });
    }, 800);

    return () => {
      active = false;
      clearTimeout(timer);
      // Exit any running tour on unmount / dependency change
      if (instanceRef.current) {
        instanceRef.current.exit(true).catch(() => {});
        instanceRef.current = null;
      }
    };
  }, [shouldShowIntro, user?.role, markIntroSeen]);

  return null;
}
