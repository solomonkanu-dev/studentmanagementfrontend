import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./anthropic";
import { scrubPii } from "./scrub";
import type { AgentContext, AgentTool, ConfirmationCard } from "./tools";
import { freshPendingMeta, type PendingAction } from "./pending";

const MAX_ITERATIONS = 6;
const MAX_TOKENS = 4096;
const ERROR_REPLY =
  "I ran into an issue processing your request. Please try again.";

/** Shared environment for both a fresh run and a resume. */
interface LoopEnv {
  model: string;
  system: string;
  tools: AgentTool[];
  ctx: AgentContext;
  /** Keep record IDs in tool results (write-capable agents need them). */
  scrubKeepIds: boolean;
  noAnswerText: string;
}

export interface RunLoopOpts {
  messages: Anthropic.MessageParam[];
  model: string;
  system: string;
  tools: AgentTool[];
  ctx: AgentContext;
  scrubKeepIds: boolean;
  noAnswerText?: string;
}

export interface ResumeLoopOpts {
  pending: PendingAction;
  decision: "approve" | "reject";
  /** User-edited tool input values (only `editableKeys` are honoured). */
  edits?: Record<string, unknown>;
  model: string;
  system: string;
  tools: AgentTool[];
  ctx: AgentContext;
  scrubKeepIds: boolean;
  noAnswerText?: string;
}

export interface LoopComplete {
  status: "complete";
  reply: string;
  toolsUsed: string[];
}

export interface LoopNeedsConfirmation {
  status: "needs_confirmation";
  card: ConfirmationCard;
  /** Unsealed — the route handler HMAC-seals this before responding. */
  pending: PendingAction;
  assistantPreamble?: string;
}

export type LoopResult = LoopComplete | LoopNeedsConfirmation;

function toolResult(tool_use_id: string, content: string) {
  return { type: "tool_result" as const, tool_use_id, content };
}

/** Run one read tool and JSON-encode its (scrubbed) result. */
async function runRead(
  block: Anthropic.ToolUseBlock,
  tool: AgentTool | undefined,
  env: LoopEnv
): Promise<string> {
  const raw = tool
    ? await tool.run(block.input as Record<string, unknown>, env.ctx)
    : { error: "Unknown tool" };
  return JSON.stringify(scrubPii(raw, { keepIds: env.scrubKeepIds }));
}

/**
 * Core iteration shared by fresh runs and resumes.
 * `loop` already contains the conversation so far (and any leading
 * tool-result turn for a resume).
 */
async function iterate(
  loop: Anthropic.MessageParam[],
  toolsUsed: string[],
  env: LoopEnv
): Promise<LoopResult> {
  const byName = new Map(env.tools.map((t) => [t.def.name, t]));
  const toolDefs = env.tools.map((t) => t.def);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: env.model,
      max_tokens: MAX_TOKENS,
      system: env.system,
      tools: toolDefs,
      messages: loop,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return {
        status: "complete",
        reply:
          textBlock && textBlock.type === "text"
            ? textBlock.text
            : env.noAnswerText,
        toolsUsed: [...new Set(toolsUsed)],
      };
    }

    if (response.stop_reason === "tool_use") {
      loop.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      toolUseBlocks.forEach((b) => toolsUsed.push(b.name));

      const writeBlocks = toolUseBlocks.filter(
        (b) => byName.get(b.name)?.kind === "write"
      );

      // All-read turn — auto-execute and continue.
      if (writeBlocks.length === 0) {
        const results = await Promise.all(
          toolUseBlocks.map(async (b) =>
            toolResult(b.id, await runRead(b, byName.get(b.name), env))
          )
        );
        loop.push({ role: "user", content: results });
        continue;
      }

      // A write was requested — pause for human confirmation.
      const pendingBlock = writeBlocks[0];
      const tool = byName.get(pendingBlock.name)!;

      // Pre-compute results for every other block in this turn so that on
      // resume every tool_use_id is answered. Reads run; extra writes are
      // deferred (one confirmation at a time).
      const otherResults = await Promise.all(
        toolUseBlocks
          .filter((b) => b.id !== pendingBlock.id)
          .map(async (b) => {
            if (byName.get(b.name)?.kind === "write") {
              return toolResult(
                b.id,
                "Deferred: only one action is confirmed at a time. Ask again to perform this."
              );
            }
            return toolResult(b.id, await runRead(b, byName.get(b.name), env));
          })
      );

      const card = await tool.summarize!(
        pendingBlock.input as Record<string, unknown>,
        env.ctx
      );
      const textBlock = response.content.find((b) => b.type === "text");
      const meta = freshPendingMeta();

      return {
        status: "needs_confirmation",
        card,
        assistantPreamble:
          textBlock && textBlock.type === "text" && textBlock.text.trim()
            ? textBlock.text
            : undefined,
        pending: {
          messages: loop,
          toolUseId: pendingBlock.id,
          toolName: pendingBlock.name,
          toolInput: pendingBlock.input as Record<string, unknown>,
          otherResults,
          editableKeys: card.fields
            .filter((f) => f.editable && f.key)
            .map((f) => f.key as string),
          toolsUsed,
          userId: env.ctx.userId,
          role: env.ctx.role,
          expiresAt: meta.expiresAt,
          nonce: meta.nonce,
        },
      };
    }

    break;
  }

  return {
    status: "complete",
    reply: ERROR_REPLY,
    toolsUsed: [...new Set(toolsUsed)],
  };
}

/** Fresh agentic run from a client message history. */
export function runAgentLoop(opts: RunLoopOpts): Promise<LoopResult> {
  const env: LoopEnv = {
    model: opts.model,
    system: opts.system,
    tools: opts.tools,
    ctx: opts.ctx,
    scrubKeepIds: opts.scrubKeepIds,
    noAnswerText: opts.noAnswerText ?? "I'm not sure how to answer that.",
  };
  return iterate([...opts.messages], [], env);
}

/**
 * Resume a paused run after the user approves or rejects a write action.
 * Executes the write (on approve), answers every pending tool_use, then
 * continues the loop so the model can acknowledge the outcome.
 */
export async function resumeAgentLoop(
  opts: ResumeLoopOpts
): Promise<LoopResult> {
  const env: LoopEnv = {
    model: opts.model,
    system: opts.system,
    tools: opts.tools,
    ctx: opts.ctx,
    scrubKeepIds: opts.scrubKeepIds,
    noAnswerText: opts.noAnswerText ?? "I'm not sure how to answer that.",
  };
  const { pending } = opts;
  const loop = [...pending.messages];
  const toolsUsed = [...pending.toolsUsed];

  let writeContent: string;
  if (opts.decision === "reject") {
    writeContent =
      "The user declined this action. Acknowledge politely and do not retry it.";
  } else {
    const tool = env.tools.find((t) => t.def.name === pending.toolName);
    // Merge user edits — only keys the card flagged as editable.
    const input: Record<string, unknown> = { ...pending.toolInput };
    if (opts.edits) {
      for (const key of pending.editableKeys) {
        if (key in opts.edits) input[key] = opts.edits[key];
      }
    }
    const raw = tool
      ? await tool.run(input, env.ctx)
      : { error: "Unknown tool" };
    writeContent = JSON.stringify(scrubPii(raw, { keepIds: env.scrubKeepIds }));
    console.log(
      `[ai-write] role=${env.ctx.role} userId=${env.ctx.userId} tool=${pending.toolName} ts=${new Date().toISOString()}`
    );
  }

  loop.push({
    role: "user",
    content: [
      toolResult(pending.toolUseId, writeContent),
      ...pending.otherResults.map((r) => toolResult(r.tool_use_id, r.content)),
    ],
  });

  return iterate(loop, toolsUsed, env);
}
