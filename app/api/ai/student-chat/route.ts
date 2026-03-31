import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import type { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_MESSAGES = 20;       // max turns kept in history
const MAX_MESSAGE_LENGTH = 2000; // chars per user message
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 30;     // requests per window per user

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

function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    );
    return payload.sub ?? payload.id ?? payload._id ?? null;
  } catch {
    return null;
  }
}

// ─── PII scrubber ─────────────────────────────────────────────────────────────
// Removes fields that should never be forwarded to the AI model.

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
      "Get the student's attendance summary — total classes held, classes attended (present), classes missed (absent), and overall attendance percentage. Use this whenever the student asks about their attendance, absences, punctuality, or eligibility based on attendance.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_grades",
    description:
      "Get the student's grades and exam results across all their subjects, including marks obtained, total marks, percentage, and letter grade for each subject. Use this for questions about marks, grades, academic performance, subject results, or exam scores.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_fee_balance",
    description:
      "Get the student's fee balance — total fees charged, amount paid, outstanding balance, payment status (paid / partial / unpaid), and a breakdown of individual fee items. Use this for questions about fees, tuition balance, payment status, or what they owe.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_assignments",
    description:
      "Get the student's submitted assignments and their statuses — which assignments were submitted, which are graded (with scores and feedback), and which are pending. Use this for questions about assignments, homework, submissions, or graded work.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_ranking",
    description:
      "Get the student's current class ranking — their position among all classmates based on total marks. Use this for questions about their rank, standing, position in class, or how they compare to peers.",
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
    case "get_attendance_summary":
      return callBackend("/attendance/summary/me", token);
    case "get_grades":
      return callBackend("/student/my-results", token);
    case "get_fee_balance":
      return callBackend("/student/my-fees", token);
    case "get_assignments":
      return callBackend("/submission/me", token);
    case "get_ranking":
      return callBackend("/student/my-ranking", token);
    default:
      return { error: "Unknown tool" };
  }
}

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an academic assistant embedded in a student management platform. Your job is to help students understand their academic data clearly and concisely.

Guidelines:
- Always use your tools to fetch live data before answering data-related questions. Never guess or make up values.
- Keep responses short and friendly — use bullet points or tables when listing multiple items.
- If a question is outside your scope (e.g. about other students, administrative actions, or topics unrelated to the student's academics), politely decline and explain what you can help with.
- Do not reveal raw internal IDs, email addresses, phone numbers, or technical fields to the student.
- When referencing percentages or numbers, round to 1 decimal place for readability.
- Do not answer questions about other students' data, system internals, or anything unrelated to the student's own academics.
- Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
}

// ─── Agentic loop ────────────────────────────────────────────────────────────

type AnthropicMessage = Anthropic.MessageParam;

async function runAgentLoop(
  messages: AnthropicMessage[],
  token: string
): Promise<string> {
  const loop = [...messages];
  const MAX_ITERATIONS = 6;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: buildSystemPrompt(),
      tools: TOOLS,
      messages: loop,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock && textBlock.type === "text" ? textBlock.text : "I'm not sure how to answer that.";
    }

    if (response.stop_reason === "tool_use") {
      loop.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const results = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const raw = await runTool(block.name, token);
          // Scrub PII before forwarding to the model
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
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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

  // Enforce message history limit
  if (messages.length > MAX_MESSAGES) {
    return Response.json(
      { error: "Message history too long. Please start a new conversation." },
      { status: 400 }
    );
  }

  // Validate message content length (user turns only)
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

  // Only pass through text-based user/assistant turns from client history.
  // Tool result turns are generated server-side only and never forwarded from client.
  const safeMessages: AnthropicMessage[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content.trim() : m.content,
    }));

  // Audit log (userId + message count, no message content logged)
  console.log(`[student-chat] userId=${userId} turns=${safeMessages.length} ts=${new Date().toISOString()}`);

  try {
    const reply = await runAgentLoop(safeMessages, token);
    return Response.json({ reply });
  } catch (err: unknown) {
    console.error("[student-chat] error", { userId, error: err });
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
