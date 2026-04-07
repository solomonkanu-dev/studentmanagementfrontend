import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import type { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 40;

// ─── Rate limiter ─────────────────────────────────────────────────────────────

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

function decodeToken(token: string): { sub?: string; id?: string; _id?: string; role?: string } | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  } catch {
    return null;
  }
}

function getUserIdFromToken(token: string): string | null {
  const p = decodeToken(token);
  return p?.sub ?? p?.id ?? p?._id ?? null;
}

function getRoleFromToken(token: string): string | null {
  return decodeToken(token)?.role ?? null;
}

// ─── PII scrubber ─────────────────────────────────────────────────────────────

const PII_FIELDS = new Set([
  "password", "token", "refreshToken",
  "email", "phoneNumber", "mobileNumber", "address", "dateOfBirth",
  "nationalId", "guardianPhone", "guardianEmail",
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
    name: "get_institute_overview",
    description:
      "Get an overview of this institution: name, student count, lecturer count, class count, subjects, and plan details. Use this for general questions about the school's size, structure, or details.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_fee_summary",
    description:
      "Get the institution's fee collection summary: total billed, total collected, outstanding balance, collection rate, and breakdown by payment status. Use this for questions about fee revenue, defaults, or collection performance.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_fee_defaulters",
    description:
      "Get the list of students with unpaid or partially paid fees — their names, fee amounts, and outstanding balances. Use this to identify who owes fees or how many students are in arrears.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of defaulters to return (default 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_attendance_summary",
    description:
      "Get the institution's attendance statistics for a given period: overall attendance rate, present/absent counts, period-over-period delta, and a breakdown by class. Use this for attendance questions, low-attendance alerts, or class comparisons.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: { type: "string", description: "Start date ISO 8601, e.g. 2025-01-01 (optional)" },
        to: { type: "string", description: "End date ISO 8601 (optional)" },
      },
      required: [],
    },
  },
  {
    name: "get_enrollment_trends",
    description:
      "Get student enrollment trends for this institution: total enrolled, active vs inactive students, monthly breakdown. Use this for enrollment questions, growth tracking, or inactive student counts.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: { type: "string", description: "Start date ISO 8601 (optional)" },
        to: { type: "string", description: "End date ISO 8601 (optional)" },
      },
      required: [],
    },
  },
  {
    name: "get_salary_records",
    description:
      "Get salary records for all staff in the institution — lecturer names, salary amounts, bonuses, deductions, payment status (paid/pending), and salary months. Optionally filter by month or status. Use this for payroll questions, pending payments, salary history, or total staff costs.",
    input_schema: {
      type: "object" as const,
      properties: {
        salaryMonth: {
          type: "string",
          description: "Filter by month in YYYY-MM format (optional)",
        },
        status: {
          type: "string",
          enum: ["paid", "pending"],
          description: "Filter by payment status (optional)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_timetable",
    description:
      "Get the class timetable(s) for this institution — days of the week, time slots, subjects, and assigned lecturers per class. Optionally pass a classId to get one specific class's schedule. Use this for questions about the school schedule, which teacher handles a subject at what time, or overall timetable coverage.",
    input_schema: {
      type: "object" as const,
      properties: {
        classId: {
          type: "string",
          description: "Class ID to retrieve timetable for a specific class (optional — omit to get all classes)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_calendar_events",
    description:
      "Get all academic calendar events for this institution — holidays, exams, term start/end dates, and other scheduled school events. Use this for questions about upcoming events, exam schedules, school holidays, or term dates.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_parents",
    description:
      "Get the list of registered parents for this institution — their names, the students they are linked to, and their account status (active/revoked). Use this for questions about how many parents are registered, which students have linked parents, or parent account statuses.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_class_rankings",
    description:
      "Get student rankings for a specific class based on total marks — student names, scores, and positions. Use this for questions about top-performing students, class leaderboards, or academic standing within a class. Requires a classId.",
    input_schema: {
      type: "object" as const,
      properties: {
        classId: {
          type: "string",
          description: "The ID of the class to retrieve rankings for (required)",
        },
      },
      required: ["classId"],
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
    const msg = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message ?? "Failed to fetch data";
    return { error: msg };
  }
}

async function runTool(
  name: string,
  input: Record<string, unknown>,
  token: string
): Promise<unknown> {
  switch (name) {
    case "get_institute_overview":
      return callBackend("/admin/my-institute", token);
    case "get_fee_summary":
      return callBackend("/admin/fee-analysis/summary", token);
    case "get_fee_defaulters":
      return callBackend("/admin/fee-analysis/defaulters", token, {
        limit: input.limit ?? 10,
      });
    case "get_attendance_summary":
      return callBackend("/analytics/attendance-summary", token, {
        from: input.from,
        to: input.to,
      });
    case "get_enrollment_trends":
      return callBackend("/analytics/enrollment-trends", token, {
        from: input.from,
        to: input.to,
      });
    case "get_salary_records":
      return callBackend("/salary/salary-slips", token, {
        ...(input.salaryMonth ? { salaryMonth: input.salaryMonth } : {}),
        ...(input.status ? { status: input.status } : {}),
        limit: 50,
      });
    case "get_timetable":
      return input.classId
        ? callBackend(`/timetable/class/${input.classId}`, token)
        : callBackend("/timetable", token);
    case "get_calendar_events":
      return callBackend("/calendar", token);
    case "get_parents":
      return callBackend("/admin/parents", token);
    case "get_class_rankings":
      if (!input.classId) return { error: "classId is required for get_class_rankings" };
      return callBackend(`/admin/results/class/${input.classId}/rankings`, token);
    default:
      return { error: "Unknown tool" };
  }
}

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an administrative intelligence assistant embedded in StudentMS, a school management platform for Sierra Leone educational institutions.

Your job is to answer questions about this institution's data and produce clear, well-structured reports that are easy to read and act on.

## Response format

Always structure responses like professional documents:
- Use **## Section Title** for major sections in longer responses
- Use **### Sub-section** for breakdowns within a section
- Use **markdown tables** (| Column | Column |) for any list of records, comparisons, or ranked data
- Use **numbered lists** for ranked items, top performers, or step-by-step information
- Use **bullet points** for highlights, key observations, or quick facts
- Use **bold** for key figures, names, and critical values (e.g. **NLe 45,000**, **87%**, **Class 3B**)
- Use **---** as a divider between major sections in longer reports
- For short single-metric answers, respond conversationally without forcing structure
- End detailed reports with a **## Summary** or **> Key takeaway:** callout

## Data rules
- Always call your tools to fetch live data. Never guess or fabricate numbers.
- Only answer questions about this administrator's own institution.
- Format all currency as NLe (e.g. **NLe 1,250,000**).
- Always include percentages where relevant (e.g. **82% collection rate**).
- Do not reveal raw internal IDs or sensitive personal data (emails, phone numbers).
- Decline questions outside your scope (other schools, general knowledge, system config).
- You have access to timetable data (class schedules), academic calendar events (holidays, exams, term dates), parent records, and class rankings in addition to fees, attendance, enrollment, and salaries.

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
}

// ─── Agentic loop ────────────────────────────────────────────────────────────

type AnthropicMessage = Anthropic.MessageParam;

async function runAgentLoop(
  messages: AnthropicMessage[],
  token: string
): Promise<{ reply: string; toolsUsed: string[] }> {
  const loop = [...messages];
  const toolsUsed: string[] = [];
  const MAX_ITERATIONS = 6;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: buildSystemPrompt(),
      tools: TOOLS,
      messages: loop,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return {
        reply: textBlock && textBlock.type === "text"
          ? textBlock.text
          : "I'm not sure how to answer that.",
        toolsUsed: [...new Set(toolsUsed)],
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
          const raw = await runTool(
            block.name,
            block.input as Record<string, unknown>,
            token
          );
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
  };
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = getRoleFromToken(token);
  if (role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

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

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
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

  if (messages.length > MAX_MESSAGES) {
    return Response.json(
      { error: "Message history too long. Please start a new conversation." },
      { status: 400 }
    );
  }

  for (const m of messages) {
    if (m.role === "user" && typeof m.content === "string") {
      if (m.content.length > MAX_MESSAGE_LENGTH) {
        return Response.json(
          { error: `Message too long. Keep messages under ${MAX_MESSAGE_LENGTH} characters.` },
          { status: 400 }
        );
      }
    }
  }

  const safeMessages: AnthropicMessage[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content.trim() : m.content,
    }));

  console.log(`[admin-chat] userId=${userId} turns=${safeMessages.length} ts=${new Date().toISOString()}`);

  try {
    const { reply, toolsUsed } = await runAgentLoop(safeMessages, token);
    return Response.json({ reply, toolsUsed, queriedAt: new Date().toISOString() });
  } catch (err: unknown) {
    console.error("[admin-chat] error", { userId, error: err });
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
