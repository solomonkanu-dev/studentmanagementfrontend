"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Clock,
  Database,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QueryResult {
  id: string;
  question: string;
  reply: string;
  toolsUsed: string[];
  queriedAt: string;
  error?: string;
}

// ─── Suggested queries ───────────────────────────────────────────────────────

const SUGGESTED = [
  "Which institutions have the highest fee default rates?",
  "What is the overall platform enrollment this year?",
  "Show me salary expenditure by institution",
  "How has student enrollment trended over the past 6 months?",
  "Which school has the best fee collection rate?",
  "Give me a full platform health summary",
  "What is the overall attendance rate this month?",
  "Which classes have the lowest assignment completion rates?",
];

const TOOL_LABELS: Record<string, string> = {
  get_system_overview: "System Overview",
  get_institute_health: "Institution Health",
  get_fee_revenue: "Fee Revenue",
  get_salary_expenditure: "Salary Expenditure",
  get_growth_trends: "Growth Trends",
  get_attendance_summary: "Attendance Summary",
  get_fee_defaults: "Fee Defaults",
  get_assignment_completion: "Assignment Completion",
  get_enrollment_trends: "Enrollment Trends",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AiAnalyticsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (results.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [results]);

  function getToken(): string {
    return typeof window !== "undefined"
      ? localStorage.getItem("token") ?? ""
      : "";
  }

  async function handleSubmit(questionOverride?: string) {
    const question = (questionOverride ?? query).trim();
    if (!question || loading) return;

    setQuery("");
    setError("");
    setLoading(true);

    // Build message history for multi-turn context
    const history = results
      .filter((r) => !r.error)
      .flatMap((r) => [
        { role: "user" as const, content: r.question },
        { role: "assistant" as const, content: r.reply },
      ]);
    history.push({ role: "user", content: question });

    try {
      const res = await fetch("/api/ai/super-admin-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ messages: history }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Request failed");
      }

      setResults((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          question,
          reply: json.reply,
          toolsUsed: json.toolsUsed ?? [],
          queriedAt: json.queriedAt ?? new Date().toISOString(),
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setResults((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          question,
          reply: "",
          toolsUsed: [],
          queriedAt: new Date().toISOString(),
          error: msg,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white">
            AI Analytics
          </h1>
          <p className="text-sm text-body">
            Ask questions about any institution or platform-wide data
          </p>
        </div>
      </div>

      {/* Query input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 rounded-xl border border-stroke bg-whiter focus-within:border-primary dark:border-strokedark dark:bg-meta-4 dark:focus-within:border-primary transition-colors">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your institutions, fees, enrolment, salaries…"
                rows={2}
                disabled={loading}
                className="w-full resize-none bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-body dark:text-white disabled:opacity-50"
                aria-label="Analytics query"
              />
            </div>
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !query.trim()}
              aria-label="Submit query"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-body">
            Press Enter to send · Shift+Enter for new line · Powered by Claude
          </p>
        </CardContent>
      </Card>

      {/* Suggested queries (only when no results yet) */}
      {results.length === 0 && !loading && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" aria-hidden="true" />
            <span className="text-xs font-medium text-body uppercase tracking-wide">
              Try asking
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => handleSubmit(s)}
                className="rounded-xl border border-stroke px-4 py-3 text-left text-sm text-body hover:border-primary hover:text-primary transition-colors dark:border-strokedark"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-body">Analysing data</span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-body [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-body [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-body [animation-delay:300ms]" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r) => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: QueryResult }) {
  const [collapsed, setCollapsed] = useState(false);

  const time = new Date(result.queriedAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card>
      <CardContent className="p-0">
        {/* Question row */}
        <div className="flex items-start gap-3 border-b border-stroke px-5 py-4 dark:border-strokedark">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <User className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <p className="flex-1 text-sm font-medium text-black dark:text-white">
            {result.question}
          </p>
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand answer" : "Collapse answer"}
            className="text-body hover:text-black dark:hover:text-white transition-colors"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {!collapsed && (
          <>
            {/* Answer */}
            <div className="px-5 py-4">
              {result.error ? (
                <p className="text-sm text-meta-1">{result.error}</p>
              ) : (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-meta-3/20">
                    <Bot className="h-3.5 w-3.5 text-meta-3" aria-hidden="true" />
                  </div>
                  <div className="flex-1 text-sm text-black dark:text-white">
                    <MarkdownContent content={result.reply} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer — data sources + timestamp */}
            {!result.error && (
              <div className="flex flex-wrap items-center gap-2 border-t border-stroke px-5 py-3 dark:border-strokedark">
                <div className="flex items-center gap-1.5 text-body">
                  <Database className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-xs">Sources:</span>
                </div>
                {result.toolsUsed.length > 0 ? (
                  result.toolsUsed.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                    >
                      {TOOL_LABELS[t] ?? t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-body italic">No external data needed</span>
                )}
                <div className="ml-auto flex items-center gap-1 text-body">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-xs">{time}</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="mb-1 mt-3 text-sm font-semibold text-black dark:text-white first:mt-0">
          {line.slice(4)}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="mb-1 mt-3 text-base font-bold text-black dark:text-white first:mt-0">
          {line.slice(3)}
        </h3>
      );
    }
    // Bullet list
    else if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(
        <div key={i} className="flex gap-2 text-sm">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex gap-2 text-sm">
          <span className="shrink-0 font-medium text-primary">{num}.</span>
          <span>{formatInline(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    }
    // Markdown table
    else if (line.startsWith("|")) {
      // Collect all table lines
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<MarkdownTable key={`table-${i}`} lines={tableLines} />);
      continue;
    }
    // Blank line
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    }
    // Paragraph
    else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed">
          {formatInline(line)}
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const rows = lines
    .filter((l) => !l.match(/^\|[-| :]+\|$/))
    .map((l) =>
      l
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())
    );

  if (rows.length === 0) return null;
  const [header, ...body] = rows;

  return (
    <div className="my-2 overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
      <table className="min-w-full text-sm">
        <thead className="bg-whiter dark:bg-meta-4">
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-body"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr
              key={ri}
              className={
                ri % 2 === 0
                  ? "bg-white dark:bg-boxdark"
                  : "bg-whiter dark:bg-meta-4/50"
              }
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-4 py-2 text-xs text-black dark:text-white"
                >
                  {formatInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded bg-stroke px-1 font-mono text-xs dark:bg-strokedark"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}
