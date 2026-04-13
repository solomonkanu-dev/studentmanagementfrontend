"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

function getStatus(error: unknown): number | null {
  const e = error as { response?: { status?: number }; status?: number } | null;
  return e?.response?.status ?? e?.status ?? null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes — reduce background refetch frequency
            retry: (failureCount, error) => {
              const status = getStatus(error);
              // Never retry rate-limit or auth errors
              if (status === 429 || status === 401 || status === 403) return false;
              return failureCount < 1;
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000), // exponential backoff, max 30s
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
