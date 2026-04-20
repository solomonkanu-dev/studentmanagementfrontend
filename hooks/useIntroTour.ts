"use client";

import { useCallback } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useAuth } from "@/context/AuthContext";

export function useIntroTour() {
  const { user } = useAuth();
  const key = user?._id ? `intro_seen_${user._id}` : "intro_seen_unknown";
  const [seen, setSeen] = useLocalStorage<boolean>(key, false);
  const shouldShowIntro = !!user?._id && !seen;
  const markIntroSeen = useCallback(() => setSeen(true), [setSeen]);
  return { shouldShowIntro, markIntroSeen };
}
