import Anthropic from "@anthropic-ai/sdk";

/** Shared Anthropic client — one instance per server process. */
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Model IDs used across the AI agents. */
export const MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
} as const;

/** True when a real ANTHROPIC_API_KEY is configured (not missing / placeholder). */
export function aiConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return !!key && key !== "your_api_key_here";
}
