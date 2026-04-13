"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}


function uid() {
  return Math.random().toString(36).slice(2);
}

const SUGGESTED_PROMPTS = [
  "Which subjects am I teaching?",
  "How is attendance looking in my classes?",
  "What assignments have I set?",
  "Show me my salary records",
];

export function LecturerChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Hi! I'm your teaching assistant. Ask me about your subjects, class attendance, assignments, salary, or your own attendance record.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

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

      const history = [...messages.filter((m) => m.id !== "intro"), userMsg].map(
        (m) => ({ role: m.role, content: m.content })
      );

      try {
        const res = await fetch("/api/ai/lecturer-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setInput(trimmed);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
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
        aria-label={open ? "Close teaching assistant" : "Open teaching assistant"}
        className={[
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          open ? "bg-meta-1 hover:bg-opacity-90" : "bg-meta-5 hover:bg-opacity-90",
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
          "fixed bottom-24 right-6 z-50 flex w-[440px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-stroke bg-white shadow-2xl transition-all duration-200 dark:border-strokedark dark:bg-boxdark",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        ].join(" ")}
        style={{ height: "600px" }}
        role="dialog"
        aria-label="AI teaching assistant"
        aria-modal="false"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-meta-5/10">
              <Bot className="h-4 w-4 text-meta-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-black dark:text-white">
                Teaching Assistant
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
              <div
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
                  msg.role === "user" ? "bg-meta-5" : "bg-meta-3",
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
                    ? "rounded-tr-sm bg-meta-5 text-white"
                    : "rounded-tl-sm bg-whiter text-black dark:bg-meta-4 dark:text-white",
                ].join(" ")}
              >
                <MessageContent content={msg.content} />
              </div>
            </div>
          ))}

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

          {error && (
            <p className="text-center text-xs text-meta-1">{error}</p>
          )}

          {messages.length === 1 && !loading && (
            <div className="pt-1 space-y-1.5">
              <p className="text-center text-[10px] uppercase tracking-wide text-body">
                Try asking
              </p>
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="w-full rounded-xl border border-stroke px-3 py-2 text-left text-xs text-body hover:border-meta-5 hover:text-meta-5 transition-colors dark:border-strokedark"
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
          <div className="flex items-end gap-2 rounded-xl border border-stroke bg-whiter px-3 py-2 focus-within:border-meta-5 dark:border-strokedark dark:bg-meta-4 dark:focus-within:border-meta-5 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
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
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-meta-5 text-white transition-colors hover:bg-opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-body">
            Powered by Claude · Live teaching data
          </p>
        </div>
      </div>
    </>
  );
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="rounded bg-black/10 px-1 py-0.5 text-[11px] font-mono dark:bg-white/10">{part.slice(1, -1)}</code>;
        return part;
      })}
    </>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      nodes.push(<hr key={i} className="my-2 border-current opacity-20" />);
      i++; continue;
    }
    if (line.startsWith("### ")) {
      nodes.push(<p key={i} className="mt-3 mb-1 text-[11px] font-bold uppercase tracking-wider opacity-60">{formatInline(line.slice(4))}</p>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      nodes.push(<p key={i} className="mt-3 mb-1 text-sm font-bold">{formatInline(line.slice(3))}</p>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      nodes.push(<p key={i} className="mt-2 mb-1 text-sm font-extrabold">{formatInline(line.slice(2))}</p>);
      i++; continue;
    }
    if (line.startsWith("> ")) {
      nodes.push(
        <div key={i} className="my-1 border-l-2 border-current pl-3 opacity-80 text-xs italic">
          {formatInline(line.slice(2))}
        </div>
      );
      i++; continue;
    }
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) { tableLines.push(lines[i]); i++; }
      const rows = tableLines
        .filter((r) => !/^\|[-:| ]+\|$/.test(r.trim()))
        .map((r) => r.split("|").slice(1, -1).map((c) => c.trim()));
      if (rows.length > 0) {
        nodes.push(
          <div key={`table-${i}`} className="my-2 overflow-x-auto rounded-lg border border-current/20">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-current/20 bg-current/5">
                  {rows[0].map((h, ci) => <th key={ci} className="px-2.5 py-1.5 text-left font-semibold">{formatInline(h)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-b border-current/10 last:border-0">
                    {row.map((cell, ci) => <td key={ci} className="px-2.5 py-1.5">{formatInline(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, "")); i++; }
      nodes.push(
        <ol key={`ol-${i}`} className="my-1 space-y-0.5 list-none">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="shrink-0 font-semibold opacity-60">{idx + 1}.</span>
              <span>{formatInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("• ") || lines[i].startsWith("* "))) { items.push(lines[i].slice(2)); i++; }
      nodes.push(
        <ul key={`ul-${i}`} className="my-1 space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-1.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
              <span>{formatInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    if (line.trim() === "") { nodes.push(<div key={i} className="h-1.5" />); i++; continue; }
    nodes.push(<p key={i}>{formatInline(line)}</p>);
    i++;
  }

  return <div className="space-y-0.5 text-sm leading-relaxed">{nodes}</div>;
}
