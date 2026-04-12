import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 3000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 60; // higher limit for super admins

// ─── In-memory rate limiter ───────────────────────────────────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function getTokenPayload(token: string): { role?: string; sub?: string; id?: string; _id?: string } | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  } catch {
    return null;
  }
}

function getRoleFromToken(token: string): string | null {
  return getTokenPayload(token)?.role ?? null;
}

function getUserIdFromToken(token: string): string | null {
  const p = getTokenPayload(token);
  return p?.sub ?? p?.id ?? p?._id ?? null;
}

// ─── PII scrubber ─────────────────────────────────────────────────────────────
// Analytics results are aggregate data, but strip any incidental personal fields.

const PII_FIELDS = new Set([
  "password", "token", "refreshToken",
  "email", "phoneNumber", "mobileNumber", "address", "dateOfBirth",
  "nationalId",
]);

function scrubPii(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubPii);
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!PII_FIELDS.has(k)) result[k] = scrubPii(v);
    }
    return result;
  }
  return value;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_system_overview",
    description:
      "Get a high-level overview of the entire platform: total institutes, admins (active/pending/suspended), students, lecturers, total fees billed vs collected vs outstanding, and total salary expenditure. Use this for broad platform health questions or when the user asks for a summary.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_institute_health",
    description:
      "Get a health report for every institution on the platform — student/lecturer/admin counts, classes, subjects, fee billed vs collected, and salary disbursed per institution. Use this to compare institutions, find the highest/lowest performing ones, or answer questions about specific schools.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_fee_revenue",
    description:
      "Get a detailed fee revenue report across all institutions: total billed, collected, outstanding, collection rate, breakdown by payment status, and a ranked list of top institutions by fee collection. Use this for questions about fee defaults, revenue, payment rates, or financial performance.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_salary_expenditure",
    description:
      "Get a salary expenditure report across all institutions: total disbursed, paid vs pending, breakdown by status, and per-institution salary data with staff counts. Use this for payroll questions, pending salary issues, or per-institution staff costs.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_growth_trends",
    description:
      "Get month-by-month growth trends for the past 6 months across institutes, admins, students, and lecturers. Use this for enrollment trends, growth rate questions, or 'how has X changed over time' questions.",
    input_schema: {
      type: "object" as const,
      properties: {
        months: {
          type: "number",
          description: "Number of past months to include (default 6, max 12)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_attendance_summary",
    description:
      "Get platform-wide attendance statistics: overall attendance rate, total present/absent counts, period-over-period delta, and a breakdown by class. Optionally filter by institution or date range. Use this for attendance rate questions, absence trends, or class-level attendance comparisons.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: { type: "string", description: "Start date (ISO 8601), e.g. 2025-01-01" },
        to: { type: "string", description: "End date (ISO 8601), e.g. 2025-03-31" },
        institution: { type: "string", description: "Institution ID to scope results (optional)" },
      },
      required: [],
    },
  },
  {
    name: "get_fee_defaults",
    description:
      "Get fee default and collection analytics: default rate, collection rate, total outstanding balance, breakdown by payment status (paid/partial/unpaid), and top defaulting institutions. Use this for default rate questions, collection performance, or identifying schools with high outstanding balances.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: { type: "string", description: "Start date (ISO 8601)" },
        to: { type: "string", description: "End date (ISO 8601)" },
        institution: { type: "string", description: "Institution ID to scope results (optional)" },
      },
      required: [],
    },
  },
  {
    name: "get_assignment_completion",
    description:
      "Get assignment submission and completion analytics: total assignments, submission count, completion rate, on-time vs late submissions, graded vs pending, and a per-class breakdown. Use this for assignment compliance questions, late submission trends, or class-level engagement.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: { type: "string", description: "Start date (ISO 8601)" },
        to: { type: "string", description: "End date (ISO 8601)" },
        institution: { type: "string", description: "Institution ID to scope results (optional)" },
      },
      required: [],
    },
  },
  {
    name: "get_enrollment_trends",
    description:
      "Get student enrollment trends: total enrolled, active/inactive counts, monthly breakdown, and per-institution or per-class distribution. Use this for enrollment growth questions, active student counts, or institution-level enrollment comparisons.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: { type: "string", description: "Start date (ISO 8601)" },
        to: { type: "string", description: "End date (ISO 8601)" },
        institution: { type: "string", description: "Institution ID to scope results (optional)" },
        cohort: { type: "string", description: "Class ID to scope results to a single cohort (optional)" },
      },
      required: [],
    },
  },
];

// ─── Tool handlers ───────────────────────────────────────────────────────────

async function callBackend(path: string, token: string, params?: Record<string, unknown>) {
  try {
    const { data } = await axios.get(`${BACKEND}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
      timeout: 10000,
    });
    return data.data ?? data;
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? "Failed to fetch data";
    return { error: msg };
  }
}

async function runTool(
  name: string,
  input: Record<string, unknown>,
  token: string
): Promise<unknown> {
  switch (name) {
    case "get_system_overview":
      return callBackend("/super-admin/monitor/overview", token);
    case "get_institute_health":
      return callBackend("/super-admin/monitor/institutes", token);
    case "get_fee_revenue":
      return callBackend("/super-admin/monitor/fee-revenue", token);
    case "get_salary_expenditure":
      return callBackend("/super-admin/monitor/salary-expenditure", token);
    case "get_growth_trends":
      return callBackend("/super-admin/monitor/growth", token, {
        months: input.months ?? 6,
      });
    case "get_attendance_summary":
      return callBackend("/analytics/attendance-summary", token, {
        from: input.from,
        to: input.to,
        institution: input.institution,
      });
    case "get_fee_defaults":
      return callBackend("/analytics/fee-defaults", token, {
        from: input.from,
        to: input.to,
        institution: input.institution,
      });
    case "get_assignment_completion":
      return callBackend("/analytics/assignment-completion", token, {
        from: input.from,
        to: input.to,
        institution: input.institution,
      });
    case "get_enrollment_trends":
      return callBackend("/analytics/enrollment-trends", token, {
        from: input.from,
        to: input.to,
        institution: input.institution,
        cohort: input.cohort,
      });
    default:
      return { error: "Unknown tool" };
  }
}

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a platform intelligence assistant for StudentMS, serving the super administrator who oversees all educational institutions on the platform in Sierra Leone.

Your job is to answer cross-institution analytics questions and produce detailed, executive-level reports using live platform data.

## Response format

Structure responses like executive dashboards and analytical reports:
- Use **## Section Title** for major report sections (e.g. ## Platform Overview, ## Fee Analysis, ## Top Performers)
- Use **### Institution Name** for per-institution breakdowns
- Use **markdown tables** (| Column | Column |) for institution comparisons, rankings, and any list of records — always include a header row and separator row (|---|---|)
- Use **numbered lists** to rank institutions by any metric (fees collected, student count, attendance rate)
- Use **bullet points** for observations, alerts, or action recommendations
- Use **bold** for all key figures, institution names, and critical metrics (e.g. **NLe 1,250,000**, **94.2%**, **12 institutions**)
- Use **---** dividers between major sections in longer reports
- Always end with a **## Summary** section that highlights the top 3 actionable insights
- Cite the data source at the end: *Source: [tool name]*

## Data rules
- Always call your tools to fetch live data. Never guess or fabricate numbers.
- Format all currency as NLe with commas (e.g. **NLe 1,250,000**).
- Always include percentages, change indicators (▲ up / ▼ down), and rankings when comparing.
- Do not expose internal database IDs.
- Decline questions unrelated to platform analytics.
- Each institution on the platform manages its own timetables, academic calendar events, parent accounts, and student promotions — these are institution-scoped features not surfaced in platform-wide analytics.

Today's date: ${new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}.`;
}

// ─── Agentic loop ────────────────────────────────────────────────────────────

type AnthropicMessage = Anthropic.MessageParam;

// ─── Chart data builder ───────────────────────────────────────────────────────

interface ChartData {
  type: "bar" | "donut" | "radialBar" | "area" | "line";
  title: string;
  series: unknown;
  labels?: string[];
  colors?: string[];
  height?: number;
}

function buildChartData(rawResults: Map<string, unknown>): ChartData | null {
  // Fee revenue → donut by status
  const feeRevenue = rawResults.get("get_fee_revenue") as Record<string, unknown> | undefined;
  if (feeRevenue && !feeRevenue.error) {
    const byStatus = (feeRevenue.byStatus ?? []) as Array<Record<string, unknown>>;
    if (byStatus.length > 0) {
      return {
        type: "donut",
        title: "Platform Fee Status",
        series: byStatus.map((s) => (s.count ?? 0) as number),
        labels: byStatus.map((s) => String(s.status ?? "").charAt(0).toUpperCase() + String(s.status ?? "").slice(1)),
        colors: byStatus.map((s) => String(s.status) === "paid" ? "#10b981" : String(s.status) === "partial" ? "#f59e0b" : "#ef4444"),
        height: 230,
      };
    }
  }

  // Salary expenditure → donut by status
  const salary = rawResults.get("get_salary_expenditure") as Record<string, unknown> | undefined;
  if (salary && !salary.error) {
    const byStatus = (salary.byStatus ?? []) as Array<Record<string, unknown>>;
    if (byStatus.length > 0) {
      return {
        type: "donut",
        title: "Salary Payment Status",
        series: byStatus.map((s) => (s.count ?? 0) as number),
        labels: byStatus.map((s) => String(s.status ?? "").charAt(0).toUpperCase() + String(s.status ?? "").slice(1)),
        colors: byStatus.map((s) => String(s.status) === "paid" ? "#10b981" : "#f59e0b"),
        height: 220,
      };
    }
  }

  // Growth trends → bar chart for students
  const growth = rawResults.get("get_growth_trends") as Record<string, unknown> | undefined;
  if (growth && !growth.error) {
    const students = (growth.students ?? []) as Array<Record<string, unknown>>;
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (students.length > 0) {
      return {
        type: "bar",
        title: "Student Enrollment Growth",
        series: [{ name: "New Students", data: students.map((p) => (p.count ?? 0) as number) }],
        labels: students.map((p) => `${MONTHS[((p.month as number) - 1) % 12]} ${String(p.year).slice(2)}`),
        colors: ["#3c50e0"],
        height: 240,
      };
    }
  }

  // Institute health → bar showing collection rates
  const health = rawResults.get("get_institute_health");
  if (health && Array.isArray(health) && (health as unknown[]).length > 0) {
    const rows = (health as Array<Record<string, unknown>>).slice(0, 10);
    return {
      type: "bar",
      title: "Fee Collection Rate by Institution (%)",
      series: [{ name: "Collection Rate %", data: rows.map((r) => {
        const fees = r.fees as Record<string, unknown> | undefined;
        const billed = (fees?.totalBilled ?? 1) as number;
        const collected = (fees?.totalCollected ?? 0) as number;
        return billed > 0 ? Math.round((collected / billed) * 100) : 0;
      })}],
      labels: rows.map((r) => {
        const inst = r.institute as Record<string, unknown> | undefined;
        const name = (inst?.name ?? "School") as string;
        return name.length > 16 ? name.slice(0, 16) + "…" : name;
      }),
      colors: ["#3c50e0"],
      height: 260,
    };
  }

  return null;
}

// ─── Agentic loop ────────────────────────────────────────────────────────────

async function runAgentLoop(
  messages: AnthropicMessage[],
  token: string
): Promise<{ reply: string; toolsUsed: string[]; chartData: ChartData | null }> {
  const loop = [...messages];
  const toolsUsed: string[] = [];
  const rawResults = new Map<string, unknown>();
  const MAX_ITERATIONS = 6;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: buildSystemPrompt(),
      tools: TOOLS,
      messages: loop,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return {
        reply: textBlock?.type === "text" ? textBlock.text : "I couldn't generate a response.",
        toolsUsed: [...new Set(toolsUsed)],
        chartData: buildChartData(rawResults),
      };
    }

    if (response.stop_reason === "tool_use") {
      loop.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const results = await Promise.all(
        toolUseBlocks.map(async (block) => {
          toolsUsed.push(block.name);
          const raw = await runTool(block.name, block.input as Record<string, unknown>, token);
          rawResults.set(block.name, raw);
          const safe = scrubPii(raw);
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(safe),
          };
        })
      );

      loop.push({ role: "user", content: results });
      continue;
    }

    break;
  }

  return {
    reply: "I ran into an issue processing your request. Please try again.",
    toolsUsed: [...new Set(toolsUsed)],
    chartData: buildChartData(rawResults),
  };
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const token = jar.get("auth-token")?.value ?? null;

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Enforce super_admin role
  const role = getRoleFromToken(token);
  if (role !== "super_admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limiting per user
  const userId = getUserIdFromToken(token);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isRateLimited(userId)) {
    return Response.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  if (
    !process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY === "your_api_key_here"
  ) {
    return Response.json({ error: "AI service not configured" }, { status: 503 });
  }

  let body: { messages?: AnthropicMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  // Enforce message history limit
  if (messages.length > MAX_MESSAGES) {
    return Response.json(
      { error: "Message history too long. Please start a new conversation." },
      { status: 400 }
    );
  }

  // Validate message content length
  for (const m of messages) {
    if (m.role === "user" && typeof m.content === "string") {
      if (m.content.length > MAX_MESSAGE_LENGTH) {
        return Response.json(
          { error: `Message too long. Please keep messages under ${MAX_MESSAGE_LENGTH} characters.` },
          { status: 400 }
        );
      }
    }
  }

  // Only pass text-based user/assistant turns from client history
  const safeMessages: AnthropicMessage[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content.trim() : m.content,
    }));

  // Audit log (no message content, just metadata)
  console.log(`[super-admin-chat] userId=${userId} turns=${safeMessages.length} ts=${new Date().toISOString()}`);

  try {
    const { reply, toolsUsed, chartData } = await runAgentLoop(safeMessages, token);
    return Response.json({
      reply,
      toolsUsed,
      chartData,
      queriedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("[super-admin-chat] error", { userId, error: err });
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
