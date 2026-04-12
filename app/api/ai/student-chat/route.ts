import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

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

function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.sub ?? payload.id ?? payload._id ?? null;
  } catch {
    return null;
  }
}

// ─── PII scrubber ─────────────────────────────────────────────────────────────

const PII_FIELDS = new Set([
  "_id", "__v", "id", "password", "token", "refreshToken",
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
    name: "get_attendance_summary",
    description:
      "Get the student's attendance summary — total classes held, classes attended (present), classes missed (absent), and overall attendance percentage.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_grades",
    description:
      "Get the student's grades and exam results across all subjects including marks obtained, total marks, percentage, and letter grade. Use for questions about marks, grades, academic performance, or exam scores.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_report_card",
    description:
      "Get the student's full multi-term report card including term-by-term results, annual average, class position, and attendance. Use this for performance overviews, weakness analysis, and predicting academic outcomes.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_fee_balance",
    description:
      "Get the student's fee balance — total fees charged, amount paid, outstanding balance, and payment status.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_assignments",
    description:
      "Get the student's submitted assignments and their statuses — submitted, graded with scores/feedback, and pending.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_ranking",
    description:
      "Get the student's current class ranking — their position among all classmates based on total marks.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_my_timetable",
    description: "Get the class timetable for this institution.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_calendar_events",
    description: "Get the academic calendar events — holidays, exam dates, term start/end.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

// ─── Tool handlers ───────────────────────────────────────────────────────────

async function callBackend(path: string, token: string) {
  try {
    const { data } = await axios.get(`${BACKEND}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    });
    return data;
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message ?? "Failed to fetch data";
    return { error: msg };
  }
}

async function runTool(name: string, token: string): Promise<unknown> {
  switch (name) {
    case "get_attendance_summary":  return callBackend("/attendance/summary/me", token);
    case "get_grades":              return callBackend("/student/my-results", token);
    case "get_report_card":         return callBackend("/student/my-report-card", token);
    case "get_fee_balance":         return callBackend("/student/my-fees", token);
    case "get_assignments":         return callBackend("/submission/me", token);
    case "get_ranking":             return callBackend("/student/my-ranking", token);
    case "get_my_timetable":        return callBackend("/timetable", token);
    case "get_calendar_events":     return callBackend("/calendar", token);
    default:                        return { error: "Unknown tool" };
  }
}

// ─── Chart data builder ───────────────────────────────────────────────────────

export interface ChartData {
  type: "bar" | "donut" | "radialBar" | "area" | "line";
  title: string;
  series: unknown;
  labels?: string[];
  colors?: string[];
  height?: number;
}

function buildChartData(rawResults: Map<string, unknown>): ChartData | null {
  // Grades → horizontal bar coloured by performance
  const grades = rawResults.get("get_grades") ?? rawResults.get("get_report_card");
  if (grades) {
    // Report card structure: { results: [...] }
    const results: Array<Record<string, unknown>> =
      Array.isArray(grades)
        ? (grades as Array<Record<string, unknown>>)
        : Array.isArray((grades as Record<string, unknown>)?.results)
          ? ((grades as Record<string, unknown>).results as Array<Record<string, unknown>>)
          : [];

    // Aggregate per subject (average across terms)
    const subjectMap = new Map<string, { name: string; total: number; count: number }>();
    for (const r of results) {
      const subj = (r.subject as Record<string, unknown>)?.name as string ?? "Subject";
      const obtained = (r.marksObtained as number) ?? 0;
      const total = (r.totalScore as number) ?? 100;
      const pct = total > 0 ? Math.round((obtained / total) * 100) : 0;
      if (!subjectMap.has(subj)) subjectMap.set(subj, { name: subj, total: 0, count: 0 });
      const entry = subjectMap.get(subj)!;
      entry.total += pct;
      entry.count += 1;
    }

    if (subjectMap.size > 0) {
      const entries = Array.from(subjectMap.values()).map((e) => ({
        name: e.name,
        avg: Math.round(e.total / e.count),
      }));
      return {
        type: "bar",
        title: "Subject Performance (%)",
        series: [{ name: "Score %", data: entries.map((e) => e.avg) }],
        labels: entries.map((e) => e.name),
        colors: entries.map((e) => e.avg >= 70 ? "#10b981" : e.avg >= 50 ? "#f59e0b" : "#ef4444"),
        height: 220,
      };
    }
  }

  // Attendance → donut (present vs absent)
  const att = rawResults.get("get_attendance_summary") as Record<string, unknown> | undefined;
  if (att && !att.error) {
    const present = (att.present ?? att.presentCount ?? att.totalPresent ?? 0) as number;
    const total   = (att.total ?? att.totalClasses ?? att.totalDays ?? 0) as number;
    const absent  = Math.max(0, total - present);
    if (total > 0) {
      return {
        type: "donut",
        title: "Attendance",
        series: [present, absent],
        labels: ["Present", "Absent"],
        colors: ["#10b981", "#ef4444"],
        height: 200,
      };
    }
  }

  // Ranking → radial bar
  const ranking = rawResults.get("get_ranking") as Record<string, unknown> | undefined;
  if (ranking && !ranking.error && ranking.outOf) {
    const rank   = (ranking.rank as number) ?? 1;
    const outOf  = (ranking.outOf as number) ?? 1;
    const pct    = outOf > 0 ? Math.round(((outOf - rank + 1) / outOf) * 100) : 0;
    return {
      type: "radialBar",
      title: `Class Rank: ${rank} of ${outOf}`,
      series: [pct],
      labels: [`Rank ${rank}/${outOf}`],
      colors: [pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444"],
      height: 200,
    };
  }

  return null;
}

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an intelligent academic assistant embedded in the student portal of StudentMS, a school management platform for Sierra Leone.

Your role is to help students understand their academic performance, identify their weaknesses, make data-driven predictions, and give actionable study tips.

## Core responsibilities

### 1. Weakness detection
When showing grades or report card data:
- Identify subjects where the student scores below 50% as **critical weaknesses**
- Flag subjects between 50-59% as **areas needing improvement**
- Compare across terms to spot declining trends (e.g. "Your Maths score dropped from 72% in Term 1 to 58% in Term 2")
- Be specific: name the subject and the exact score

### 2. Predictions
When all term data is available:
- Predict end-of-year outcome: "Based on Term 1 (78%) and Term 2 (65%), your projected annual average is approximately 72% — you are currently on track for a **B grade**"
- If a subject is declining, warn: "At this rate, you risk failing [Subject] by Term 3"
- Use the promotion threshold (typically 50% annual average) as the benchmark

### 3. Actionable tips
After identifying weaknesses, always give 2-3 specific, practical tips:
- Subject-specific: "For Mathematics, focus on algebra and practice 20 problems daily"
- Time management: if attendance is low, flag the risk to their grade
- Assignment completion: if assignments are missing, flag the academic impact

### 4. Encouragement
- Celebrate wins: "You are ranked #3 in your class — excellent work!"
- Frame weaknesses constructively: "You have a real opportunity to improve in Science"
- Always end performance reviews with a motivational note

## Response format
- Use **## Section Title** for major sections
- Use **markdown tables** for subject-by-subject results
- Use **bold** for scores, grades, and key values (e.g. **94%**, **Grade A**)
- Use **> ⚠️ Warning:** for at-risk subjects
- Use **> 💡 Tip:** for study recommendations
- Use **> 🎯 Prediction:** for end-of-year forecasts
- Use **> ✅ Well done:** for achievements
- End with a **## Summary** for overviews

## Data rules
- Always fetch live data — never guess or fabricate values
- Only answer questions about this student's own data
- Round percentages to 1 decimal place
- Never reveal other students' data or internal IDs

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
}

// ─── Agentic loop ────────────────────────────────────────────────────────────

type AnthropicMessage = Anthropic.MessageParam;

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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: buildSystemPrompt(),
      tools: TOOLS,
      messages: loop,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      const reply = textBlock?.type === "text" ? textBlock.text : "I'm not sure how to answer that.";
      return { reply, toolsUsed: [...new Set(toolsUsed)], chartData: buildChartData(rawResults) };
    }

    if (response.stop_reason === "tool_use") {
      loop.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const results = await Promise.all(
        toolUseBlocks.map(async (block) => {
          toolsUsed.push(block.name);
          const raw = await runTool(block.name, token);
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

  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getUserIdFromToken(token);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (isRateLimited(userId)) {
    return Response.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429 });
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
    return Response.json({ error: "AI service not configured" }, { status: 503 });
  }

  let body: { messages?: AnthropicMessage[] };
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid request body" }, { status: 400 }); }

  const { messages } = body;

  if (!Array.isArray(messages) || messages.length === 0)
    return Response.json({ error: "messages array is required" }, { status: 400 });

  if (messages.length > MAX_MESSAGES)
    return Response.json({ error: "Message history too long. Please start a new conversation." }, { status: 400 });

  for (const m of messages) {
    if (m.role === "user" && typeof m.content === "string" && m.content.length > MAX_MESSAGE_LENGTH)
      return Response.json({ error: `Message too long. Keep under ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 });
  }

  const safeMessages: AnthropicMessage[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content.trim() : m.content }));

  console.log(`[student-chat] userId=${userId} turns=${safeMessages.length} ts=${new Date().toISOString()}`);

  try {
    const { reply, toolsUsed, chartData } = await runAgentLoop(safeMessages, token);
    return Response.json({ reply, toolsUsed, chartData, queriedAt: new Date().toISOString() });
  } catch (err: unknown) {
    console.error("[student-chat] error", { userId, error: err });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
