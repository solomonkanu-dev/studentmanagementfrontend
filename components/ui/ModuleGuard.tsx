"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";
import { useFeatures } from "@/context/FeaturesContext";
import type { ModuleKey } from "@/lib/types";

interface ModuleGuardProps {
  moduleKey: ModuleKey;
  children: React.ReactNode;
  redirect?: string;
}

export function ModuleGuard({ moduleKey, children, redirect }: ModuleGuardProps) {
  const { isModuleEnabled, isLoading } = useFeatures();
  const router = useRouter();

  const enabled = isModuleEnabled(moduleKey);

  useEffect(() => {
    if (!isLoading && !enabled && redirect) {
      router.replace(redirect);
    }
  }, [isLoading, enabled, redirect, router]);

  if (isLoading) return null;

  if (!enabled) {
    if (redirect) return null;
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stroke dark:bg-meta-4">
          <ShieldX className="h-7 w-7 text-body" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-black dark:text-white">Module Disabled</h2>
        <p className="max-w-sm text-sm text-body">
          This feature has been disabled by your administrator.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
