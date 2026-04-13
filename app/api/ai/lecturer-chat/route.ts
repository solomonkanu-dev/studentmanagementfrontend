import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BACKEND =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000/api/v1";

const COOKIE_NAME = "auth_session";

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
    name: "get_my_subjects",
    description:
      "Get the list of subjects this lecturer is assigned to teach, including subject name, class, and department. Use this for questions about their teaching load, which subjects or classes they handle, or their schedule.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_my_assignments",
    description:
      "Get all assignments created by this lecturer — title, subject, due date, total marks, and status (draft/published). Use this for questions about their assignments, deadlines, or how many assignments they have set.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_class_attendance",
    description:
      "Get attendance records for the classes this lecturer teaches — present, absent, and overall attendance rate by class and subject. Use this for questions about student attendance, which classes have poor attendance, or attendance trends.",
    input_schema: {
      type: "object" as const,
      properties: {
        classId: { type: "string", description: "Class ID to filter (optional)" },
      },
      required: [],
    },
  },
  {
    name: "get_my_salary",
    description:
      "Get this lecturer's salary records — salary amounts, payment status (paid/pending), and payment dates. Use this for questions about their pay, salary slips, or pending payments.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_my_attendance",
    description:
      "Get this lecturer's own employee attendance record — days present, absent, and their attendance percentage. Use this for questions about their own punctuality or attendance status.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_my_timetable",
    description:
      "Get the timetables for all classes in this institution, including days of the week, time slots, subjects, and assigned lecturers. Use this for questions about the weekly class schedule, which periods this teacher is assigned to, or what subjects run at what times.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_calendar_events",
    description:
      "Get the academic calendar events for this institution — holidays, exam dates, term start/end, and other school events. Use this for questions about upcoming events, when exams are scheduled, school holidays, or term dates.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

// ─── Tool handlers ───────────────────────────────────────────────────────────

async function callBackend(path: string, token: string, params?: Record<string, unknown>) {
  try {
    const { data } = await axios.get(`${BACKEND}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
      timeout: 8000,
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
  token: string,
  lecturerId: string
): Promise<unknown> {
  switch (name) {
    case "get_my_subjects":
      return callBackend("/subject/lecturer", token);
    case "get_my_assignments":
      return callBackend("/assignment/my", token);
    case "get_class_attendance":
      return callBackend("/attendance/report/class", token, {
        ...(input.classId ? { classId: input.classId } : {}),
      });
    case "get_my_salary":
      return callBackend(`/salary/lecturer/${lecturerId}`, token);
    case "get_my_attendance":
      return callBackend(`/attendance/employee/summary/${lecturerId}`, token);
    case "get_my_timetable":
      return callBackend("/timetable", token);
    case "get_calendar_events":
      return callBackend("/calendar", token);
    default:
      return { error: "Unknown tool" };
  }
}

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a teaching intelligence assistant embedded in the teacher portal of StudentMS, a school management platform for Sierra Leone.

Your job is to help teachers understand their classes, students, assignments, attendance, and salary through clear, well-structured reports.

## Response format

Structure responses like professional teaching reports:
- Use **## Section Title** for major sections in detailed responses
- Use **### Class / Subject** for per-class or per-subject breakdowns
- Use **markdown tables** (| Column | Column |) for student lists, grade summaries, attendance records, or assignment tracking
- Use **numbered lists** for ranked students or priority actions
- Use **bullet points** for quick observations, highlights, or recommendations
- Use **bold** for key figures, student names, and important values (e.g. **72.4% average**, **3 students at risk**)
- Use **---** between major sections in longer reports
- For short factual answers, respond conversationally without forcing structure
- End reports with a **> Recommendation:** or **## Key Points** callout when useful

## Data rules
- Always call your tools to fetch live data. Never guess or fabricate numbers.
- Only answer questions about this teacher's own classes, assignments, attendance, and salary data.
- Do not reveal sensitive student details (phone numbers, home addresses, guardian info).
- Do not answer questions about other teachers' data or topics outside your scope.
- Round all percentages and decimals to 1 decimal place.
- You have access to the class timetable and academic calendar in addition to subjects, assignments, attendance, and salary.

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
}

// ─── Agentic loop ────────────────────────────────────────────────────────────

type AnthropicMessage = Anthropic.MessageParam;

async function runAgentLoop(
  messages: AnthropicMessage[],
  token: string,
  lecturerId: string
): Promise<string> {
  const loop = [...messages];
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
      return textBlock && textBlock.type === "text"
        ? textBlock.text
        : "I'm not sure how to answer that.";
    }

    if (response.stop_reason === "tool_use") {
      loop.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const results = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const raw = await runTool(
            block.name,
            block.input as Record<string, unknown>,
            token,
            lecturerId
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

  return "I ran into an issue processing your request. Please try again.";
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? null;

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = getRoleFromToken(token);
  if (role !== "lecturer") {
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

  console.log(`[lecturer-chat] userId=${userId} turns=${safeMessages.length} ts=${new Date().toISOString()}`);

  try {
    const reply = await runAgentLoop(safeMessages, token, userId);
    return Response.json({ reply });
  } catch (err: unknown) {
    console.error("[lecturer-chat] error", { userId, error: err });
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
