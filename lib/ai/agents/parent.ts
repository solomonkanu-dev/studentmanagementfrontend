import { callBackend } from "@/lib/ai/backend";
import { MODELS } from "@/lib/ai/anthropic";
import type { ChatAgentConfig } from "@/lib/ai/handler";
import type { AgentTool } from "@/lib/ai/tools";

const get = (path: string, token: string, params?: Record<string, unknown>) =>
  callBackend({ path, token, params, timeout: 8000 });

// ─── Read tools ────────────────────────────────────────────────────────────

export const parentTools: AgentTool[] = [
  {
    kind: "read",
    def: {
      name: "get_my_children",
      description:
        "List every child linked to this parent — names, classes, and the studentId you must use for any other parent tool. ALWAYS call this first if the parent has more than one child or has not yet specified which child.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/parent/my-children", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_child_attendance",
      description:
        "Get a child's attendance records (per-day status). Use this for detailed attendance lookups by date. Requires studentId from get_my_children.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The child's student ID" },
        },
        required: ["studentId"],
      },
    },
    run: async (input, ctx) =>
      input.studentId
        ? get(`/parent/child/${input.studentId}/attendance`, ctx.token)
        : { error: "studentId is required — call get_my_children first" },
  },
  {
    kind: "read",
    def: {
      name: "get_child_attendance_stats",
      description:
        "Get a child's attendance summary statistics — total days, present, absent, late, attendance percentage. Use for high-level attendance questions. Requires studentId.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The child's student ID" },
        },
        required: ["studentId"],
      },
    },
    run: async (input, ctx) =>
      input.studentId
        ? get(`/parent/child/${input.studentId}/attendance-stats`, ctx.token)
        : { error: "studentId is required — call get_my_children first" },
  },
  {
    kind: "read",
    def: {
      name: "get_child_results",
      description:
        "Get a child's exam and assessment results — subject-by-subject marks, totals, percentages, and grades. Requires studentId.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The child's student ID" },
        },
        required: ["studentId"],
      },
    },
    run: async (input, ctx) =>
      input.studentId
        ? get(`/parent/child/${input.studentId}/results`, ctx.token)
        : { error: "studentId is required — call get_my_children first" },
  },
  {
    kind: "read",
    def: {
      name: "get_child_fees",
      description:
        "Get a child's fee balance — total billed, paid, outstanding, status, and itemised breakdown. Requires studentId.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The child's student ID" },
        },
        required: ["studentId"],
      },
    },
    run: async (input, ctx) =>
      input.studentId
        ? get(`/parent/child/${input.studentId}/fees`, ctx.token)
        : { error: "studentId is required — call get_my_children first" },
  },
  {
    kind: "read",
    def: {
      name: "get_child_assignments",
      description:
        "Get a child's assignments — submitted, graded with feedback, or still pending. Requires studentId.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The child's student ID" },
        },
        required: ["studentId"],
      },
    },
    run: async (input, ctx) =>
      input.studentId
        ? get(`/parent/child/${input.studentId}/assignments`, ctx.token)
        : { error: "studentId is required — call get_my_children first" },
  },
  {
    kind: "read",
    def: {
      name: "get_child_payments",
      description:
        "Get a child's payment history — each payment's date, amount, method, and reference. Requires studentId.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The child's student ID" },
        },
        required: ["studentId"],
      },
    },
    run: async (input, ctx) =>
      input.studentId
        ? get(`/parent/child/${input.studentId}/payments`, ctx.token)
        : { error: "studentId is required — call get_my_children first" },
  },
  {
    kind: "read",
    def: {
      name: "get_child_promotion_history",
      description:
        "Get a child's class promotion history. Use for questions about which class they were in previously or when they were promoted. Requires studentId.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The child's student ID" },
        },
        required: ["studentId"],
      },
    },
    run: async (input, ctx) =>
      input.studentId
        ? get(`/parent/child/${input.studentId}/promotion-history`, ctx.token)
        : { error: "studentId is required — call get_my_children first" },
  },
  {
    kind: "read",
    def: {
      name: "get_announcements",
      description:
        "Get the institution's announcements visible to this parent — title, body, sent date. Use for questions about recent news from the school.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/parent/announcements", ctx.token),
  },
];

// ─── System prompt ───────────────────────────────────────────────────────────

export function parentSystemPrompt(): string {
  return `You are a guardian assistant embedded in the parent portal of StudentMS, a school management platform for Sierra Leone.

Your job is to help parents stay on top of every child's academics, attendance, fees, and school news through clear, supportive responses.

## Response format

Present information like a friendly, well-organised parent update:
- Use **## Section Title** to separate topics in detailed responses (e.g. ## Results, ## Attendance, ## Fees)
- Use **### Child Name** when the response covers more than one child
- Use **markdown tables** for results, fee breakdowns, or assignment lists
- Use **numbered lists** for ranked subjects, upcoming deadlines, or action items
- Use **bullet points** for highlights or quick observations
- Use **bold** for grades, scores, and important values (e.g. **94%**, **Grade A**, **NLe 20,000**)
- Use **---** to separate sections in longer responses
- Keep a warm, supportive tone — celebrate the child's wins, gently flag concerns
- End with a **> Tip:** or **## Summary** when giving overviews

## Data rules
- ALWAYS call get_my_children first if the parent has not yet specified which child, or if you have more than one child to choose from. Every other tool needs an exact studentId.
- Never guess or invent studentIds.
- Format all currency as NLe (e.g. **NLe 20,000**) and round percentages to 1 decimal place.
- Only answer questions about this parent's own children — politely decline questions about other students.
- Do not reveal internal database IDs, phone numbers, or other sensitive personal data.
- Politely decline questions outside your scope (other parents' children, admin tasks, general knowledge).
- You have access to attendance (records + stats), exam results, fees, assignments, payment history, promotion history, and school announcements for every linked child.

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
}

// ─── Chat route config ───────────────────────────────────────────────────────

export const parentChatConfig: ChatAgentConfig = {
  name: "parent-chat",
  requiredRole: "parent",
  model: MODELS.haiku,
  rateLimitMax: 30,
  maxMessages: 20,
  maxMessageLength: 2000,
  scrubKeepIds: true, // need studentId to remain in tool output for chaining
  includeToolMeta: false,
  tools: parentTools,
  buildSystemPrompt: parentSystemPrompt,
};
