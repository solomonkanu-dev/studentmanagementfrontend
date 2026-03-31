"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface StudentChatWidgetProps {
  token: string;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

const SUGGESTED_PROMPTS = [
  "What's my attendance rate?",
  "How are my grades looking?",
  "Do I have any outstanding fees?",
  "What's my class ranking?",
];

export function StudentChatWidget({ token }: StudentChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Hi! I'm your academic assistant. Ask me about your attendance, grades, fees, assignments, or class ranking.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: Message = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setError("");

      // Build conversation history for API (exclude intro message)
      const history = [...messages.filter((m) => m.id !== "intro"), userMsg].map(
        (m) => ({ role: m.role, content: m.content })
      );

      try {
        const res = await fetch("/api/ai/student-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ messages: history }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? "Request failed");
        }

        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", content: json.reply },
        ]);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        // Remove the user's message on error so they can retry
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setInput(trimmed);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, token]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className={[
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          open
            ? "bg-meta-1 hover:bg-opacity-90"
            : "bg-primary hover:bg-opacity-90",
        ].join(" ")}
      >
        {open ? (
          <ChevronDown className="h-6 w-6 text-white" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" aria-hidden="true" />
        )}
      </button>

      {/* Chat panel */}
      <div
        className={[
          "fixed bottom-24 right-6 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-stroke bg-white shadow-2xl transition-all duration-200 dark:border-strokedark dark:bg-boxdark",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        ].join(" ")}
        style={{ height: "500px" }}
        role="dialog"
        aria-label="AI academic assistant"
        aria-modal="false"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-black dark:text-white">
                Academic Assistant
              </p>
              <p className="text-[10px] text-meta-3">Online</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="text-body hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={[
                "flex gap-2",
                msg.role === "user" ? "flex-row-reverse" : "flex-row",
              ].join(" ")}
            >
              {/* Avatar */}
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
              {/* Bubble */}
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
          ))}

          {/* Loading indicator */}
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

          {/* Error */}
          {error && (
            <p className="text-center text-xs text-meta-1">{error}</p>
          )}

          {/* Suggested prompts (only when just the intro message) */}
          {messages.length === 1 && !loading && (
            <div className="pt-1 space-y-1.5">
              <p className="text-center text-[10px] uppercase tracking-wide text-body">
                Try asking
              </p>
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="w-full rounded-xl border border-stroke px-3 py-2 text-left text-xs text-body hover:border-primary hover:text-primary transition-colors dark:border-strokedark"
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
          <div className="flex items-end gap-2 rounded-xl border border-stroke bg-whiter px-3 py-2 focus-within:border-primary dark:border-strokedark dark:bg-meta-4 dark:focus-within:border-primary transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-sm text-black outline-none placeholder:text-body dark:text-white disabled:opacity-50"
              aria-label="Chat input"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-body">
            Powered by Claude · Live academic data
          </p>
        </div>
      </div>
    </>
  );
}

// Renders markdown-like content (bold, bullet lists)
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
              <span>{formatInline(line.slice(2))}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{formatInline(line)}</p>;
      })}
    </div>
  );
}

function formatInline(text: string) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          part
        )
      )}
    </>
  );
}
