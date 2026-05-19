import type Anthropic from "@anthropic-ai/sdk";

/** Per-request context passed to every tool's `run` / `summarize`. */
export interface AgentContext {
  token: string;
  userId: string;
  role: string;
}

/** A field shown on a write-action confirmation card. */
export interface ConfirmationCardField {
  label: string;
  value: string;
  /** When true the user may edit the value before approving. */
  editable?: boolean;
  /** Key into the tool input that an edited value maps back to. */
  key?: string;
}

/** Human-readable summary of a pending write action, rendered in the chat UI. */
export interface ConfirmationCard {
  toolName: string;
  title: string;
  description: string;
  fields: ConfirmationCardField[];
  warning?: string;
  confirmLabel: string;
}

/**
 * A tool the agent can call.
 * - `read` tools auto-execute inside the agentic loop.
 * - `write` tools pause the loop for human confirmation; they must provide
 *   `summarize` to build the confirmation card shown before execution.
 */
export interface AgentTool {
  def: Anthropic.Tool;
  kind: "read" | "write";
  run: (input: Record<string, unknown>, ctx: AgentContext) => Promise<unknown>;
  summarize?: (
    input: Record<string, unknown>,
    ctx: AgentContext
  ) => Promise<ConfirmationCard>;
}

/** Read-only subset of a toolset — used by the proactive insights routes. */
export function readTools(tools: AgentTool[]): AgentTool[] {
  return tools.filter((t) => t.kind === "read");
}
