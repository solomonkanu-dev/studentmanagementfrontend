"use client";

import { LogoIcon } from "./Logo";

interface BrandedLoaderProps {
  /** Full-screen fixed overlay. Defaults to true. */
  fullscreen?: boolean;
  /** Optional caption under the dots. */
  message?: string;
}

/**
 * Branded loading state: scholar-cap icon (subtly breathing), the EduSalone
 * wordmark, and three bubble-pulse dots. Use as a full-screen overlay during
 * auth flows (login, request submission, post-login navigation).
 */
export function BrandedLoader({ fullscreen = true, message }: BrandedLoaderProps) {
  const container = fullscreen
    ? "fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm dark:bg-boxdark/95"
    : "flex items-center justify-center";

  return (
    <div className={container} role="status" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-logo-breathe">
          <LogoIcon size={84} />
        </div>
        <p className="text-xl font-bold tracking-wide text-black dark:text-white">
          Edu<span style={{ color: "#2563EB" }}>Salone</span>
        </p>
        <div className="flex items-center gap-2">
          {[0, 140, 280].map((delay) => (
            <span
              key={delay}
              className="block h-2.5 w-2.5 rounded-full bg-primary animate-dot-pulse"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
        {message && <p className="text-sm text-body">{message}</p>}
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
