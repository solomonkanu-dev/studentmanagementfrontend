"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
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
  TrendingUp,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { adminApi } from "@/lib/api/admin";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChartData {
  type: "bar" | "donut" | "radialBar" | "area" | "line";
  title: string;
  series: unknown;
  labels?: string[];
  colors?: string[];
  height?: number;
}

interface QueryResult {
  id: string;
  question: string;
  reply: string;
  toolsUsed: string[];
  queriedAt: string;
  chartData?: ChartData | null;
  error?: string;
}

// ─── Suggested queries ───────────────────────────────────────────────────────

const SUGGESTED = [
  "Give me a full school overview",
  "Which students have the highest outstanding fee balance?",
  "What is our overall attendance rate this month?",
  "Show me the fee collection summary",
  "Which class has the best academic performance?",
  "How many students have unpaid fees?",
  "Show me the academic calendar events for this term",
  "List all salary records with pending payments",
  "How many parents are registered in the system?",
  "What is the timetable for all classes?",
  "Show me enrollment trends over the past few months",
  "Which students are top performers in their class?",
];

const TOOL_LABELS: Record<string, string> = {
  get_institute_overview: "School Overview",
  get_fee_summary: "Fee Summary",
  get_fee_defaulters: "Fee Defaulters",
  get_attendance_summary: "Attendance Summary",
  get_enrollment_trends: "Enrollment Trends",
  get_salary_records: "Salary Records",
  get_timetable: "Timetable",
  get_calendar_events: "Academic Calendar",
  get_parents: "Parents",
  get_class_rankings: "Class Rankings",
};

// ─── Quick Insights Dashboard ────────────────────────────────────────────────

function QuickInsights() {
  const { data: feeSummary, isLoading } = useQuery({
    queryKey: ["fee-summary"],
    queryFn: adminApi.getFeeSummary,
    staleTime: 5 * 60 * 1000,
  });
  const { data: feeByStatus = [] } = useQuery({
    queryKey: ["fee-by-status"],
    queryFn: adminApi.getFeeByStatus,
    staleTime: 5 * 60 * 1000,
  });
  const { data: collectionTrend = [] } = useQuery({
    queryKey: ["fee-collection-trend"],
    queryFn: adminApi.getFeeCollectionTrend,
    staleTime: 5 * 60 * 1000,
  });

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const trendLabels = collectionTrend.map((t) => `${MONTH_NAMES[t.month - 1]} ${String(t.year).slice(2)}`);
  const fmt = (n: number) => n >= 1_000_000 ? `NLe ${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `NLe ${(n/1_000).toFixed(1)}K` : `NLe ${n.toLocaleString()}`;

  if (isLoading || !feeSummary) return null;

  const rate = feeSummary.collectionRate ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-body">Quick Insights</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Collection Rate", value: `${rate}%`, color: rate >= 70 ? "text-meta-3" : rate >= 40 ? "text-meta-6" : "text-meta-1", icon: TrendingUp },
          { label: "Collected", value: fmt(feeSummary.totalCollected), color: "text-meta-3", icon: DollarSign },
          { label: "Outstanding", value: fmt(feeSummary.totalOutstanding), color: "text-meta-1", icon: AlertCircle },
          { label: "Unpaid Students", value: String(feeSummary.unpaidCount), color: "text-meta-6", icon: AlertCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-stroke bg-white p-3 dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <p className="text-xs text-body truncate">{label}</p>
              <Icon className={`h-4 w-4 ${color} shrink-0`} />
            </div>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {feeByStatus.length > 0 && (
          <div className="rounded-xl border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark">
            <p className="mb-1 text-sm font-semibold text-black dark:text-white">Fee Payment Status</p>
            <ApexChart type="donut" height={220} series={feeByStatus.map((s) => s.count)}
              options={{
                labels: feeByStatus.map((s) => s.status.charAt(0).toUpperCase() + s.status.slice(1)),
                colors: feeByStatus.map((s) => s.status === "paid" ? "#10b981" : s.status === "partial" ? "#f59e0b" : "#ef4444"),
                legend: { position: "bottom", fontSize: "11px" },
                dataLabels: { enabled: true, formatter: (v: number) => `${Math.round(v)}%` },
                plotOptions: { pie: { donut: { size: "58%", labels: { show: true, total: { show: true, label: "Students", fontSize: "11px", fontWeight: "600" } } } } },
                tooltip: { y: { formatter: (v: number) => `${v} students` } },
                chart: { background: "transparent" }, theme: { mode: "light" },
              }}
            />
          </div>
        )}
        {collectionTrend.length > 0 && (
          <div className="rounded-xl border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark">
            <p className="mb-1 text-sm font-semibold text-black dark:text-white">Fee Collection Trend</p>
            <ApexChart type="area" height={220}
              series={[
                { name: "Collected", data: collectionTrend.map((t) => t.totalCollected) },
                { name: "Billed",    data: collectionTrend.map((t) => t.totalBilled) },
              ]}
              options={{
                chart: { toolbar: { show: false }, background: "transparent" },
                dataLabels: { enabled: false },
                stroke: { curve: "smooth", width: 2 },
                fill: { type: "gradient", gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
                colors: ["#10b981", "#3c50e0"],
                xaxis: { categories: trendLabels, labels: { style: { colors: "#94a3b8", fontSize: "10px" } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "10px" }, formatter: (v: number) => fmt(v) } },
                tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => fmt(v) } },
                legend: { position: "top", fontSize: "11px" },
                grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
                theme: { mode: "light" },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminAiAnalyticsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (results.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [results]);

  async function handleSubmit(questionOverride?: string) {
    const question = (questionOverride ?? query).trim();
    if (!question || loading) return;

    setQuery("");
    setLoading(true);

    const history = results
      .filter((r) => !r.error)
      .flatMap((r) => [
        { role: "user" as const, content: r.question },
        { role: "assistant" as const, content: r.reply },
      ]);
    history.push({ role: "user", content: question });

    try {
      const res = await fetch("/api/ai/admin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          chartData: json.chartData ?? null,
          queriedAt: json.queriedAt ?? new Date().toISOString(),
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
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
            Ask questions about your school&apos;s fees, attendance, students, timetable, and more
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
                placeholder="Ask anything about your school — fees, attendance, students, timetable…"
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

      {/* Suggested queries */}
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
        <div className="flex items-start gap-3 border-b border-stroke px-3 py-3 sm:px-5 sm:py-4 dark:border-strokedark">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <User className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <p className="flex-1 min-w-0 break-words text-sm font-medium text-black dark:text-white">
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
            <div className="px-3 py-4 sm:px-5">
              {result.error ? (
                <p className="text-sm text-meta-1">{result.error}</p>
              ) : (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-meta-3/20">
                    <Bot className="h-3.5 w-3.5 text-meta-3" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden text-sm text-black dark:text-white">
                    <MarkdownContent content={result.reply} />
                  </div>
                </div>
              )}
            </div>

            {/* Chart */}
            {!result.error && result.chartData && (
              <div className="border-t border-stroke px-5 py-4 dark:border-strokedark">
                <p className="mb-2 text-sm font-semibold text-black dark:text-white">{result.chartData.title}</p>
                <ApexChart
                  type={result.chartData.type}
                  height={result.chartData.height ?? 280}
                  series={result.chartData.series as never}
                  options={{
                    chart: { toolbar: { show: false }, background: "transparent" },
                    labels: result.chartData.labels,
                    colors: result.chartData.colors,
                    plotOptions: {
                      bar: {
                        horizontal: result.chartData.type === "bar" && (result.chartData.labels?.length ?? 0) > 5,
                        borderRadius: 4,
                        columnWidth: "50%",
                      },
                      radialBar: {
                        hollow: { size: "52%" },
                        dataLabels: { name: { show: true }, value: { fontSize: "22px", fontWeight: "bold", offsetY: 8 } },
                      },
                      pie: { donut: { size: "58%", labels: { show: true, total: { show: true, fontWeight: "600" } } } },
                    },
                    dataLabels: { enabled: result.chartData.type === "donut" || result.chartData.type === "radialBar", formatter: (v: number) => `${Math.round(v)}%` },
                    legend: { show: result.chartData.type === "donut", position: "bottom", fontSize: "12px" },
                    xaxis: {
                      categories: result.chartData.labels,
                      labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
                      axisBorder: { show: false },
                      axisTicks: { show: false },
                    },
                    yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "11px" } } },
                    tooltip: { shared: true, intersect: false },
                    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
                    theme: { mode: "light" },
                  }}
                />
              </div>
            )}

            {/* Footer */}
            {!result.error && (
              <div className="border-t border-stroke px-3 py-3 sm:px-5 dark:border-strokedark">
                <div className="flex flex-wrap items-center gap-2">
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
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-body">
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
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(
        <div key={i} className="flex gap-2 text-sm">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex gap-2 text-sm">
          <span className="shrink-0 font-medium text-primary">{num}.</span>
          <span>{formatInline(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-primary pl-3 text-sm italic text-body">
          {formatInline(line.slice(2))}
        </blockquote>
      );
    } else if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<MarkdownTable key={`table-${i}`} lines={tableLines} />);
      continue;
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed">
          {formatInline(line)}
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-0.5 break-words">{elements}</div>;
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
              className={ri % 2 === 0 ? "bg-white dark:bg-boxdark" : "bg-whiter dark:bg-meta-4/50"}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-xs text-black dark:text-white">
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
            <code key={i} className="rounded bg-stroke px-1 font-mono text-xs dark:bg-strokedark">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}
