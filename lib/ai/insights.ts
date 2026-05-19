import type { NextRequest } from "next/server";
import { aiConfigured } from "./anthropic";
import { authenticate } from "./auth";
import { isRateLimited } from "./rateLimit";
import { runAgentLoop } from "./loop";
import type { AgentTool } from "./tools";

/** A single proactive insight surfaced on a role dashboard. */
export interface InsightCard {
  id: string;
  severity: "info" | "warning" | "critical";
  category: "fees" | "attendance" | "academics" | "operations";
  title: string;
  detail: string;
  metric?: string;
  actionHint?: string;
  deepLink?: string;
}

export interface InsightsAgentConfig {
  /** Namespace for cache + rate-limit keys, e.g. "admin-insights". */
  name: string;
  requiredRole: string | null;
  model: string;
  /** Read-only tools the insights agent may call. */
  tools: AgentTool[];
  scrubKeepIds: boolean;
  buildSystemPrompt: () => string;
  /** Instruction message that kicks off the briefing. */
  userPrompt: string;
}

const REFRESH_MAX_PER_DAY = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CARDS = 5;

const SEVERITIES = new Set(["info", "warning", "critical"]);
const CATEGORIES = new Set(["fees", "attendance", "academics", "operations"]);

interface CacheEntry {
  day: string;
  insights: InsightCard[];
  generatedAt: string;
}

/** Per-user-per-day cache — bounds proactive cost to one generation/day. */
const cache = new Map<string, CacheEntry>();

/** Local calendar day, YYYY-MM-DD. */
function today(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Tolerant parse of the model's trailing ```json fence into insight cards. */
function parseInsights(reply: string): InsightCard[] {
  const fences = [...reply.matchAll(/```json\s*([\s\S]*?)```/gi)];
  const raw = fences.length ? fences[fences.length - 1][1] : reply;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return [];
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed as { insights?: unknown })?.insights;
  if (!Array.isArray(arr)) return [];

  return arr
    .slice(0, MAX_CARDS)
    .map((c, i): InsightCard | null => {
      if (!c || typeof c !== "object") return null;
      const o = c as Record<string, unknown>;
      const severity = SEVERITIES.has(String(o.severity))
        ? (o.severity as InsightCard["severity"])
        : "info";
      const category = CATEGORIES.has(String(o.category))
        ? (o.category as InsightCard["category"])
        : "operations";
      const title = typeof o.title === "string" ? o.title.trim() : "";
      const detail = typeof o.detail === "string" ? o.detail.trim() : "";
      if (!title) return null;
      return {
        id: typeof o.id === "string" && o.id ? o.id : `insight-${i}`,
        severity,
        category,
        title,
        detail,
        metric: typeof o.metric === "string" ? o.metric : undefined,
        actionHint:
          typeof o.actionHint === "string" ? o.actionHint : undefined,
        deepLink:
          typeof o.deepLink === "string" && o.deepLink.startsWith("/")
            ? o.deepLink
            : undefined,
      };
    })
    .filter((c): c is InsightCard => c !== null);
}

/**
 * Build a Next.js `GET` route handler for a proactive insights agent.
 * Results are cached per user per day; `?refresh=1` forces regeneration
 * (capped at a few per day).
 */
export function createInsightsRoute(config: InsightsAgentConfig) {
  return async function GET(req: NextRequest) {
    const auth = await authenticate(config.requiredRole);
    if ("error" in auth) {
      return Response.json(
        { error: auth.error.message },
        { status: auth.error.status }
      );
    }
    const { token, userId, role } = auth;

    const refresh = new URL(req.url).searchParams.get("refresh") === "1";
    const key = `${config.name}:${userId}`;
    const day = today();

    if (!refresh) {
      const hit = cache.get(key);
      if (hit && hit.day === day) {
        return Response.json({
          insights: hit.insights,
          generatedAt: hit.generatedAt,
          cached: true,
        });
      }
    } else if (
      isRateLimited(`${config.name}:refresh:${userId}`, REFRESH_MAX_PER_DAY, ONE_DAY_MS)
    ) {
      return Response.json(
        { error: "Refresh limit reached. Please try again tomorrow." },
        { status: 429 }
      );
    }

    if (!aiConfigured()) {
      return Response.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    try {
      const result = await runAgentLoop({
        messages: [{ role: "user", content: config.userPrompt }],
        model: config.model,
        system: config.buildSystemPrompt(),
        tools: config.tools,
        ctx: { token, userId, role },
        scrubKeepIds: config.scrubKeepIds,
      });

      // Insights agents only use read tools, so the loop always completes.
      const reply = result.status === "complete" ? result.reply : "";
      const insights = parseInsights(reply);
      const generatedAt = new Date().toISOString();

      // Drop stale days so the cache cannot grow unbounded.
      for (const [k, v] of cache) {
        if (v.day !== day) cache.delete(k);
      }
      cache.set(key, { day, insights, generatedAt });

      return Response.json({ insights, generatedAt, cached: false });
    } catch (err: unknown) {
      console.error(`[${config.name}] error`, { userId, error: err });
      return Response.json(
        { error: "Could not generate insights right now." },
        { status: 500 }
      );
    }
  };
}
