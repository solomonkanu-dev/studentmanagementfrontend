import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * A paused write action awaiting human confirmation.
 *
 * The whole conversation (including the assistant turn that requested the
 * write) must survive the confirm round-trip — Anthropic requires every
 * `tool_use` block to be answered. To stop a client forging a different
 * action than Claude actually proposed, the blob is HMAC-sealed server-side.
 */
export interface PendingAction {
  /** Conversation up to and including the assistant turn requesting the write. */
  messages: Anthropic.MessageParam[];
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  /** Pre-computed results for every other tool_use block in the same turn. */
  otherResults: { tool_use_id: string; content: string }[];
  /** Tool input keys the user is allowed to edit before approving. */
  editableKeys: string[];
  toolsUsed: string[];
  userId: string;
  role: string;
  expiresAt: number;
  nonce: string;
}

export interface SealedPending {
  pendingAction: string; // base64url JSON
  signature: string; // hex HMAC-SHA256
  expiresAt: string; // ISO 8601
}

/** Lifetime of a confirmation token. */
export const PENDING_TTL_MS = 5 * 60 * 1000;

function secret(): string {
  return process.env.AI_STATE_SECRET ?? "";
}

/** True when AI_STATE_SECRET is configured — required for write actions. */
export function stateSecretConfigured(): boolean {
  return secret().length >= 16;
}

/** Serialize + HMAC-sign a pending action for the client round-trip. */
export function sealPending(action: PendingAction): SealedPending {
  const blob = Buffer.from(JSON.stringify(action)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(blob).digest("hex");
  return {
    pendingAction: blob,
    signature,
    expiresAt: new Date(action.expiresAt).toISOString(),
  };
}

export type VerifyResult =
  | { ok: true; action: PendingAction }
  | { ok: false; error: string };

/**
 * Verify a sealed pending action: HMAC must match, it must not be expired,
 * and it must belong to the requesting user.
 */
export function verifyPending(
  blob: string,
  signature: string,
  userId: string
): VerifyResult {
  if (typeof blob !== "string" || typeof signature !== "string") {
    return { ok: false, error: "Malformed confirmation token." };
  }

  const expected = createHmac("sha256", secret()).update(blob).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "Confirmation token failed verification." };
  }

  let action: PendingAction;
  try {
    action = JSON.parse(Buffer.from(blob, "base64url").toString());
  } catch {
    return { ok: false, error: "Confirmation token could not be decoded." };
  }

  if (action.userId !== userId) {
    return { ok: false, error: "Confirmation token does not belong to you." };
  }
  if (typeof action.expiresAt !== "number" || Date.now() > action.expiresAt) {
    return { ok: false, error: "This action expired. Please ask again." };
  }

  return { ok: true, action };
}

/** Build the `expiresAt` + `nonce` fields for a fresh pending action. */
export function freshPendingMeta(): { expiresAt: number; nonce: string } {
  return {
    expiresAt: Date.now() + PENDING_TTL_MS,
    nonce: randomBytes(9).toString("base64url"),
  };
}
