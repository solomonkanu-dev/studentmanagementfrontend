"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { featuresApi } from "@/lib/api/features";
import type { ModuleKey, ModuleToggles } from "@/lib/types";

interface FeaturesContextValue {
  modules: ModuleToggles | null;
  isLoading: boolean;
  isModuleEnabled: (key: ModuleKey) => boolean;
  effectiveModules: Set<ModuleKey>;
  refetch: () => void;
}

const FeaturesContext = createContext<FeaturesContextValue | null>(null);

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const instituteId =
    user?.institute
      ? typeof user.institute === "object"
        ? user.institute._id
        : user.institute
      : null;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["institute-modules"],
    queryFn: featuresApi.getModules,
    enabled: !!instituteId,
    staleTime: 5 * 60_000,
  });

  const effectiveModules = useMemo<Set<ModuleKey>>(() => {
    if (!data?.modules) return new Set<ModuleKey>();

    const base = new Set<ModuleKey>(
      (Object.entries(data.modules) as [ModuleKey, boolean][])
        .filter(([, v]) => v)
        .map(([k]) => k)
    );

    if (user?.role !== "lecturer") return base;

    for (const entry of user.moduleAccess ?? []) {
      if (entry.startsWith("!")) {
        base.delete(entry.slice(1) as ModuleKey);
      } else if (data.modules[entry as ModuleKey]) {
        base.add(entry as ModuleKey);
      }
    }

    return base;
  }, [data, user]);

  const isModuleEnabled = useCallback(
    (key: ModuleKey) => {
      if (isLoading || !data) return true;
      return effectiveModules.has(key);
    },
    [effectiveModules, isLoading, data]
  );

  return (
    <FeaturesContext.Provider
      value={{
        modules: data?.modules ?? null,
        isLoading,
        isModuleEnabled,
        effectiveModules,
        refetch,
      }}
    >
      {children}
    </FeaturesContext.Provider>
  );
}

export function useFeatures(): FeaturesContextValue {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error("useFeatures must be used inside FeaturesProvider");
  return ctx;
}
