import type { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { aiConfigured } from "./anthropic";
import { authenticate } from "./auth";
import { isRateLimited } from "./rateLimit";
import { runAgentLoop, resumeAgentLoop, type LoopResult } from "./loop";
import {
  sealPending,
  verifyPending,
  stateSecretConfigured,
} from "./pending";
import { readTools, type AgentTool } from "./tools";

type AnthropicMessage = Anthropic.MessageParam;

/** Confirmation payload sent back when the user approves/rejects a write. */
interface ConfirmationRequest {
  pendingAction: string;
  signature: string;
  decision: "approve" | "reject";
  edits?: Record<string, unknown>;
}

export interface ChatAgentConfig {
  /** Namespace for logs + rate-limit keys, e.g. "admin-chat". */
  name: string;
  /** Role required to use this agent; `null` skips the role check. */
  requiredRole: string | null;
  model: string;
  rateLimitMax: number;
  maxMessages: number;
  maxMessageLength: number;
  /** Keep record IDs in tool results forwarded to the model. */
  scrubKeepIds: boolean;
  /** Include `toolsUsed` + `queriedAt` in the JSON response. */
  includeToolMeta: boolean;
  noAnswerText?: string;
  tools: AgentTool[];
  buildSystemPrompt: () => string;
}

/**
 * Build a Next.js `POST` route handler for a role-scoped AI chat agent.
 *
 * Handles two request kinds:
 * - a normal chat turn (`{ messages }`), and
 * - a write-action confirmation (`{ confirmation }`) that resumes a paused run.
 */
export function createChatRoute(config: ChatAgentConfig) {
  return async function POST(req: NextRequest) {
    const auth = await authenticate(config.requiredRole);
    if ("error" in auth) {
      return Response.json(
        { error: auth.error.message },
        { status: auth.error.status }
      );
    }
    const { token, userId, role } = auth;

    if (isRateLimited(`${config.name}:${userId}`, config.rateLimitMax)) {
      return Response.json(
        { error: "Too many requests. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

    if (!aiConfigured()) {
      return Response.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    let body: {
      messages?: AnthropicMessage[];
      confirmation?: ConfirmationRequest;
      /** "agent" unlocks write tools; anything else is read-only quick chat. */
      mode?: string;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const ctx = { token, userId, role };
    const loopEnv = {
      model: config.model,
      system: config.buildSystemPrompt(),
      tools: config.tools,
      ctx,
      scrubKeepIds: config.scrubKeepIds,
      noAnswerText: config.noAnswerText,
    };

    let result: LoopResult;

    try {
      if (body.confirmation) {
        // ── Resume a paused write action ──────────────────────────────────
        const { pendingAction, signature, decision, edits } = body.confirmation;
        if (decision !== "approve" && decision !== "reject") {
          return Response.json(
            { error: "Invalid confirmation decision" },
            { status: 400 }
          );
        }
        if (!stateSecretConfigured()) {
          return Response.json(
            { error: "AI service not configured" },
            { status: 503 }
          );
        }
        const verified = verifyPending(pendingAction, signature, userId);
        if (!verified.ok) {
          return Response.json({ error: verified.error }, { status: 409 });
        }
        // Stricter, independent budget for actually executing write actions.
        if (
          decision === "approve" &&
          isRateLimited(`${config.name}:write:${userId}`, 15)
        ) {
          return Response.json(
            { error: "Too many actions. Please wait a few minutes before trying again." },
            { status: 429 }
          );
        }
        result = await resumeAgentLoop({
          ...loopEnv,
          pending: verified.action,
          decision,
          edits,
        });
      } else {
        // ── Normal chat turn ──────────────────────────────────────────────
        const { messages } = body;
        if (!Array.isArray(messages) || messages.length === 0) {
          return Response.json(
            { error: "messages array is required" },
            { status: 400 }
          );
        }
        if (messages.length > config.maxMessages) {
          return Response.json(
            {
              error:
                "Message history too long. Please start a new conversation.",
            },
            { status: 400 }
          );
        }
        for (const m of messages) {
          if (
            m.role === "user" &&
            typeof m.content === "string" &&
            m.content.length > config.maxMessageLength
          ) {
            return Response.json(
              {
                error: `Message too long. Keep messages under ${config.maxMessageLength} characters.`,
              },
              { status: 400 }
            );
          }
        }

        // Only text-based user/assistant turns are trusted from the client.
        const safeMessages: AnthropicMessage[] = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role,
            content:
              typeof m.content === "string" ? m.content.trim() : m.content,
          }));

        if (process.env.NODE_ENV !== "production") {
          console.log(
            `[${config.name}] userId=${userId} turns=${safeMessages.length} ts=${new Date().toISOString()}`
          );
        }

        // Write tools are unlocked only on the AI Agent page (mode "agent").
        // The floating quick-chat widget stays strictly read-only.
        const chatTools =
          body.mode === "agent" ? config.tools : readTools(config.tools);
        result = await runAgentLoop({
          ...loopEnv,
          tools: chatTools,
          messages: safeMessages,
        });
      }
    } catch (err: unknown) {
      console.error(`[${config.name}] error`, { userId, error: err });
      return Response.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    // ── Paused for confirmation ─────────────────────────────────────────────
    if (result.status === "needs_confirmation") {
      if (!stateSecretConfigured()) {
        return Response.json(
          { error: "AI service not configured" },
          { status: 503 }
        );
      }
      const sealed = sealPending(result.pending);
      return Response.json({
        status: "needs_confirmation",
        pendingAction: sealed.pendingAction,
        signature: sealed.signature,
        expiresAt: sealed.expiresAt,
        card: result.card,
        assistantPreamble: result.assistantPreamble,
      });
    }

    // ── Completed ───────────────────────────────────────────────────────────
    const payload: Record<string, unknown> = {
      status: "complete",
      reply: result.reply,
    };
    if (config.includeToolMeta) {
      payload.toolsUsed = result.toolsUsed;
      payload.queriedAt = new Date().toISOString();
    }
    return Response.json(payload);
  };
}
