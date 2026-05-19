import { callBackend } from "@/lib/ai/backend";
import { MODELS } from "@/lib/ai/anthropic";
import type { ChatAgentConfig } from "@/lib/ai/handler";
import type { AgentTool } from "@/lib/ai/tools";

// Student tools historically read the raw backend envelope (no `data` unwrap).
const get = (path: string, token: string) =>
  callBackend({ path, token, timeout: 8000, unwrap: false });

// ─── Read tools ────────────────────────────────────────────────────────────

export const studentTools: AgentTool[] = [
  {
    kind: "read",
    def: {
      name: "get_attendance_summary",
      description:
        "Get the student's attendance summary — total classes held, classes attended (present), classes missed (absent), and overall attendance percentage. Use this whenever the student asks about their attendance, absences, punctuality, or eligibility based on attendance.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/attendance/summary/me", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_grades",
      description:
        "Get the student's grades and exam results across all their subjects, including marks obtained, total marks, percentage, and letter grade for each subject. Use this for questions about marks, grades, academic performance, subject results, or exam scores.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/student/my-results", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_fee_balance",
      description:
        "Get the student's fee balance — total fees charged, amount paid, outstanding balance, payment status (paid / partial / unpaid), and a breakdown of individual fee items. Use this for questions about fees, tuition balance, payment status, or what they owe.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/student/my-fees", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_assignments",
      description:
        "Get the student's submitted assignments and their statuses — which assignments were submitted, which are graded (with scores and feedback), and which are pending. Use this for questions about assignments, homework, submissions, or graded work.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/submission/me", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_ranking",
      description:
        "Get the student's current class ranking — their position among all classmates based on total marks. Use this for questions about their rank, standing, position in class, or how they compare to peers.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/student/my-ranking", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_my_timetable",
      description:
        "Get the class timetable for this institution — days of the week, time slots, subjects, and teachers per period. Use this for questions about the class schedule, what subject is on which day and time, or who teaches a particular period.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/timetable", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_calendar_events",
      description:
        "Get the academic calendar events — upcoming holidays, exam dates, term start/end, and other school events. Use this for questions about when exams are, upcoming holidays, term dates, or school events.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/calendar", ctx.token),
  },
];

// ─── System prompt ───────────────────────────────────────────────────────────

export function studentSystemPrompt(): string {
  return `You are an academic assistant embedded in the student portal of StudentMS, a school management platform for Sierra Leone.

Your job is to help students understand their academic performance, fees, attendance, and assignments through clear, well-structured responses.

## Response format

Present information clearly, like a personal academic report:
- Use **## Section Title** to separate different topics in detailed responses (e.g. ## Results, ## Attendance, ## Fees)
- Use **markdown tables** (| Column | Column |) when showing subject-by-subject results, assignment lists, or fee breakdowns
- Use **numbered lists** for ranked subjects, upcoming deadlines, or action items
- Use **bullet points** for quick highlights or observations
- Use **bold** for scores, grades, and important values (e.g. **94%**, **Grade A**, **NLe 20,000**)
- Use **---** to separate sections in longer responses
- Keep a friendly, encouraging tone — celebrate good performance, gently flag concerns
- End with a **> Tip:** or **## Summary** when giving performance overviews

## Data rules
- Always call your tools to fetch live data. Never guess or fabricate values.
- Only answer questions about this student's own academic data.
- Do not reveal other students' data, internal IDs, email addresses, or phone numbers.
- Round all percentages and decimals to 1 decimal place.
- Politely decline questions outside your scope (other students, admin tasks, general knowledge).
- You have access to the class timetable and academic calendar in addition to grades, attendance, fees, assignments, and rankings.

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
}

// ─── Chat route config ───────────────────────────────────────────────────────

export const studentChatConfig: ChatAgentConfig = {
  name: "student-chat",
  requiredRole: null, // student route historically enforces no role check
  model: MODELS.haiku,
  rateLimitMax: 30,
  maxMessages: 20,
  maxMessageLength: 2000,
  scrubKeepIds: false,
  includeToolMeta: false,
  tools: studentTools,
  buildSystemPrompt: studentSystemPrompt,
};
