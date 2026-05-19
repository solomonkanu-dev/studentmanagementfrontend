"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Check,
  Ban,
  Clock,
} from "lucide-react";
import { MessageContent } from "@/components/ui/aiMarkdown";

// ─── Shared response/card shapes (mirror lib/ai) ─────────────────────────────

interface ConfirmationCardField {
  label: string;
  value: string;
  editable?: boolean;
  key?: string;
}

interface ConfirmationCard {
  toolName: string;
  title: string;
  description: string;
  fields: ConfirmationCardField[];
  warning?: string;
  confirmLabel: string;
}

type CardStatus = "pending" | "approved" | "rejected" | "expired";

type Message =
  | { id: string; role: "user" | "assistant"; content: string }
  | {
      id: string;
      role: "confirmation";
      card: ConfirmationCard;
      pendingAction: string;
      signature: string;
      status: CardStatus;
    };

function uid() {
  return Math.random().toString(36).slice(2);
}

// ─── Confirmation card ───────────────────────────────────────────────────────

function ConfirmationCardView({
  card,
  status,
  busy,
  onApprove,
  onReject,
}: {
  card: ConfirmationCard;
  status: CardStatus;
  busy: boolean;
  onApprove: (edits: Record<string, string>) => void;
  onReject: () => void;
}) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const resolved = status !== "pending";

  const statusBadge: Record<
    Exclude<CardStatus, "pending">,
    { icon: typeof Check; label: string; cls: string }
  > = {
    approved: { icon: Check, label: "Done", cls: "bg-meta-3/10 text-meta-3" },
    rejected: { icon: Ban, label: "Cancelled", cls: "bg-body/10 text-body" },
    expired: { icon: Clock, label: "Expired", cls: "bg-meta-1/10 text-meta-1" },
  };

  return (
    <div className="rounded-xl border border-stroke bg-white p-3 dark:border-strokedark dark:bg-boxdark">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <p className="flex-1 text-sm font-semibold text-black dark:text-white">
          {card.title}
        </p>
        {resolved && (
          <span
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusBadge[status].cls}`}
          >
            {(() => {
              const Icon = statusBadge[status].icon;
              return <Icon className="h-3 w-3" aria-hidden="true" />;
            })()}
            {statusBadge[status].label}
          </span>
        )}
      </div>

      <p className="mb-2 text-xs text-body">{card.description}</p>

      <dl className="mb-2 space-y-1.5">
        {card.fields.map((f, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <dt className="text-xs text-body">{f.label}</dt>
            <dd className="text-xs font-medium text-black dark:text-white">
              {f.editable && f.key && !resolved ? (
                <input
                  value={edits[f.key] ?? f.value}
                  onChange={(e) =>
                    setEdits((prev) => ({
                      ...prev,
                      [f.key as string]: e.target.value,
                    }))
                  }
                  className="w-32 rounded border border-stroke bg-whiter px-2 py-1 text-right text-xs outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                  aria-label={f.label}
                />
              ) : (
                f.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      {card.warning && (
        <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          <AlertTriangle
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          />
          {card.warning}
        </p>
      )}

      {status === "expired" && (
        <p className="mb-2 text-[11px] text-meta-1">
          This action expired. Ask the assistant again to retry it.
        </p>
      )}

      {!resolved && (
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(edits)}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {card.confirmLabel}
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="rounded-lg border border-stroke px-3 py-2 text-xs font-medium text-body transition-colors hover:bg-whiter disabled:opacity-50 dark:border-strokedark dark:hover:bg-meta-4"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Conversation ────────────────────────────────────────────────────────────

export interface AIConversationProps {
  /** AI route to POST to, e.g. "/api/ai/admin-chat". */
  endpoint: string;
  /** First assistant message shown before any conversation. */
  intro: string;
  /** Prompt chips shown on an empty conversation. */
  suggestedPrompts: string[];
  /** Input placeholder text. */
  placeholder: string;
  /** Focus the input when this becomes true (e.g. a widget opening). */
  active?: boolean;
  /**
   * "agent" unlocks confirmation-gated write actions (the AI Agent page);
   * "chat" (default) is read-only quick chat (the floating widget).
   */
  mode?: "chat" | "agent";
}

/**
 * The full AI chat experience — message list, markdown rendering, the
 * write-action confirmation flow, and the input box. Fills its parent's
 * height; the floating widget and the dedicated assistant page both embed it.
 */
export function AIConversation({
  endpoint,
  intro,
  suggestedPrompts,
  placeholder,
  active = true,
  mode = "chat",
}: AIConversationProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "intro", role: "assistant", content: intro },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyCardId, setBusyCardId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (active) setTimeout(() => inputRef.current?.focus(), 100);
  }, [active]);

  /** Text turns only — confirmation cards are never sent back as history. */
  const buildHistory = useCallback(
    (msgs: Message[]) =>
      msgs
        .filter(
          (m): m is Extract<Message, { role: "user" | "assistant" }> =>
            (m.role === "user" || m.role === "assistant") && m.id !== "intro"
        )
        .map((m) => ({ role: m.role, content: m.content })),
    []
  );

  /** Append assistant reply / confirmation card from an AI route response. */
  const applyResponse = useCallback((json: Record<string, unknown>) => {
    if (json.status === "needs_confirmation") {
      const preamble =
        typeof json.assistantPreamble === "string"
          ? json.assistantPreamble.trim()
          : "";
      setMessages((prev) => [
        ...prev,
        ...(preamble
          ? [{ id: uid(), role: "assistant" as const, content: preamble }]
          : []),
        {
          id: uid(),
          role: "confirmation" as const,
          card: json.card as ConfirmationCard,
          pendingAction: json.pendingAction as string,
          signature: json.signature as string,
          status: "pending" as CardStatus,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content:
            typeof json.reply === "string"
              ? json.reply
              : "I'm not sure how to answer that.",
        },
      ]);
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: Message = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setError("");

      const history = buildHistory([...messages, userMsg]);

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, mode }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Request failed");
        applyResponse(json);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setInput(trimmed);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, endpoint, buildHistory, applyResponse, mode]
  );

  /** Approve or reject a pending write-action confirmation card. */
  const resolveConfirmation = useCallback(
    async (
      cardId: string,
      decision: "approve" | "reject",
      edits: Record<string, string>
    ) => {
      if (busyCardId) return;
      const target = messages.find(
        (m) => m.id === cardId && m.role === "confirmation"
      );
      if (!target || target.role !== "confirmation") return;

      setBusyCardId(cardId);
      setLoading(true);
      setError("");

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmation: {
              pendingAction: target.pendingAction,
              signature: target.signature,
              decision,
              edits: Object.keys(edits).length ? edits : undefined,
            },
          }),
        });
        const json = await res.json();

        if (res.status === 409) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === cardId && m.role === "confirmation"
                ? { ...m, status: "expired" }
                : m
            )
          );
          return;
        }
        if (!res.ok) throw new Error(json.error ?? "Request failed");

        setMessages((prev) =>
          prev.map((m) =>
            m.id === cardId && m.role === "confirmation"
              ? {
                  ...m,
                  status: decision === "approve" ? "approved" : "rejected",
                }
              : m
          )
        );
        applyResponse(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setBusyCardId(null);
        setLoading(false);
      }
    },
    [busyCardId, messages, endpoint, applyResponse]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((msg) =>
          msg.role === "confirmation" ? (
            <ConfirmationCardView
              key={msg.id}
              card={msg.card}
              status={msg.status}
              busy={busyCardId === msg.id}
              onApprove={(edits) =>
                resolveConfirmation(msg.id, "approve", edits)
              }
              onReject={() => resolveConfirmation(msg.id, "reject", {})}
            />
          ) : (
            <div
              key={msg.id}
              className={[
                "flex gap-2",
                msg.role === "user" ? "flex-row-reverse" : "flex-row",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
                  msg.role === "user" ? "bg-primary" : "bg-meta-3",
                ].join(" ")}
              >
                {msg.role === "user" ? (
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </div>
              <div
                className={[
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "rounded-tr-sm bg-primary text-white"
                    : "rounded-tl-sm bg-whiter text-black dark:bg-meta-4 dark:text-white",
                ].join(" ")}
              >
                <MessageContent content={msg.content} />
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-meta-3 text-white">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-whiter px-3 py-2.5 dark:bg-meta-4">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-body [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-body [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-body [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {error && <p className="text-center text-xs text-meta-1">{error}</p>}

        {messages.length === 1 && !loading && (
          <div className="space-y-1.5 pt-1">
            <p className="text-center text-[10px] uppercase tracking-wide text-body">
              Try asking
            </p>
            {suggestedPrompts.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="w-full rounded-xl border border-stroke px-3 py-2 text-left text-xs text-body transition-colors hover:border-primary hover:text-primary dark:border-strokedark"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-stroke p-3 dark:border-strokedark">
        <div className="flex items-end gap-2 rounded-xl border border-stroke bg-whiter px-3 py-2 transition-colors focus-within:border-primary dark:border-strokedark dark:bg-meta-4 dark:focus-within:border-primary">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-black outline-none placeholder:text-body disabled:opacity-50 dark:text-white"
            aria-label="Chat input"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-body">
          Powered by Claude · Live institutional data
        </p>
      </div>
    </div>
  );
}
