"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

type Role = "admin" | "lecturer" | "student";

interface InsightCard {
  id: string;
  severity: "info" | "warning" | "critical";
  category: "fees" | "attendance" | "academics" | "operations";
  title: string;
  detail: string;
  metric?: string;
  actionHint?: string;
  deepLink?: string;
}

interface InsightsResponse {
  insights: InsightCard[];
  generatedAt: string;
  cached: boolean;
}

const SEVERITY_STYLES: Record<
  InsightCard["severity"],
  { border: string; icon: typeof Info; iconColor: string; chip: string }
> = {
  critical: {
    border: "border-l-meta-1",
    icon: AlertTriangle,
    iconColor: "text-meta-1",
    chip: "bg-meta-1/10 text-meta-1",
  },
  warning: {
    border: "border-l-amber-500",
    icon: AlertCircle,
    iconColor: "text-amber-500",
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  info: {
    border: "border-l-primary",
    icon: Info,
    iconColor: "text-primary",
    chip: "bg-primary/10 text-primary",
  },
};

async function fetchInsights(
  role: Role,
  refresh: boolean
): Promise<InsightsResponse> {
  const res = await fetch(
    `/api/ai/${role}-insights${refresh ? "?refresh=1" : ""}`
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Failed to load insights");
  }
  return res.json();
}

/**
 * Proactive AI insights panel — surfaces a short daily briefing on the role
 * dashboard. Results are cached server-side per user per day; the refresh
 * button forces regeneration (capped at a few per day).
 */
export default function AIInsightsPanel({ role }: { role: Role }) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai-insights", role],
    queryFn: () => fetchInsights(role, false),
    staleTime: 1000 * 60 * 60 * 4, // 4 hours — avoid refetch on navigation
    refetchOnWindowFocus: false,
    retry: 1,
  });

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await fetchInsights(role, true);
      queryClient.setQueryData(["ai-insights", role], fresh);
    } catch {
      /* keep the existing cards on a failed refresh */
    } finally {
      setRefreshing(false);
    }
  }

  // Degrade silently — never block the dashboard on an AI failure.
  if (isError) return null;

  const insights = data?.insights ?? [];

  return (
    <section
      className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark"
      aria-label="AI insights"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-black dark:text-white">
              AI Insights
            </h3>
            <p className="text-[11px] text-body">
              {isLoading || refreshing
                ? "Analyzing your data…"
                : data?.generatedAt
                  ? `Updated ${new Date(data.generatedAt).toLocaleString(
                      "en-US",
                      { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
                    )}`
                  : "Daily briefing"}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading || refreshing}
          aria-label="Refresh insights"
          className="flex items-center gap-1.5 rounded-md border border-stroke px-2.5 py-1.5 text-xs text-body transition-colors hover:border-primary hover:text-primary disabled:opacity-50 dark:border-strokedark"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-sm border-l-4 border-l-stroke bg-whiter dark:bg-meta-4"
            />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="h-7 w-7 text-meta-3" aria-hidden="true" />
          <p className="text-sm text-body">
            All clear — no alerts that need your attention today.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((card) => {
            const style = SEVERITY_STYLES[card.severity];
            const Icon = style.icon;
            const body = (
              <>
                <div className="flex items-start gap-2.5">
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-black dark:text-white">
                        {card.title}
                      </p>
                      {card.metric && (
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${style.chip}`}
                        >
                          {card.metric}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-body">
                      {card.detail}
                    </p>
                    {(card.actionHint || card.deepLink) && (
                      <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary">
                        {card.actionHint ?? "View details"}
                        {card.deepLink && (
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </>
            );

            const className = `block rounded-sm border border-stroke border-l-4 ${style.border} bg-whiter p-3 dark:border-strokedark dark:bg-meta-4`;

            return card.deepLink ? (
              <Link
                key={card.id}
                href={card.deepLink}
                className={`${className} transition-colors hover:border-primary/60`}
              >
                {body}
              </Link>
            ) : (
              <div key={card.id} className={className}>
                {body}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
