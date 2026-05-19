import { callBackend } from "@/lib/ai/backend";
import { MODELS } from "@/lib/ai/anthropic";
import type { ChatAgentConfig } from "@/lib/ai/handler";
import type { AgentTool } from "@/lib/ai/tools";

const get = (path: string, token: string, params?: Record<string, unknown>) =>
  callBackend({ path, token, params, timeout: 10000 });

const post = (path: string, token: string, body: unknown) =>
  callBackend({ path, token, method: "POST", body, timeout: 10000 });

// ─── Read tools ────────────────────────────────────────────────────────────

export const adminTools: AgentTool[] = [
  {
    kind: "read",
    def: {
      name: "get_institute_overview",
      description:
        "Get an overview of this institution: name, student count, lecturer count, class count, subjects, and plan details. Use this for general questions about the school's size, structure, or details.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: async (_input, ctx) => {
      const [institute, enrollment] = await Promise.all([
        get("/admin/my-institute", ctx.token),
        get("/analytics/enrollment-trends", ctx.token),
      ]);
      return { ...(institute as object), enrollment };
    },
  },
  {
    kind: "read",
    def: {
      name: "get_fee_summary",
      description:
        "Get the institution's fee collection summary: total billed, total collected, outstanding balance, collection rate, and breakdown by payment status. Use this for questions about fee revenue, defaults, or collection performance.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/admin/fee-analysis/summary", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_fee_defaulters",
      description:
        "Get the list of students with unpaid or partially paid fees — their names, fee amounts, and outstanding balances. Use this to identify who owes fees or how many students are in arrears.",
      input_schema: {
        type: "object" as const,
        properties: {
          limit: {
            type: "number",
            description: "Number of defaulters to return (default 10)",
          },
        },
        required: [],
      },
    },
    run: (input, ctx) =>
      get("/admin/fee-analysis/defaulters", ctx.token, {
        limit: input.limit ?? 10,
      }),
  },
  {
    kind: "read",
    def: {
      name: "get_attendance_summary",
      description:
        "Get the institution's attendance statistics for a given period: overall attendance rate, present/absent counts, period-over-period delta, and a breakdown by class. Use this for attendance questions, low-attendance alerts, or class comparisons.",
      input_schema: {
        type: "object" as const,
        properties: {
          from: {
            type: "string",
            description: "Start date ISO 8601, e.g. 2025-01-01 (optional)",
          },
          to: { type: "string", description: "End date ISO 8601 (optional)" },
        },
        required: [],
      },
    },
    run: (input, ctx) =>
      get("/analytics/attendance-summary", ctx.token, {
        from: input.from,
        to: input.to,
      }),
  },
  {
    kind: "read",
    def: {
      name: "get_enrollment_trends",
      description:
        "Get student enrollment trends for this institution: total enrolled, active vs inactive students, monthly breakdown. Use this for enrollment questions, growth tracking, or inactive student counts.",
      input_schema: {
        type: "object" as const,
        properties: {
          from: {
            type: "string",
            description: "Start date ISO 8601 (optional)",
          },
          to: { type: "string", description: "End date ISO 8601 (optional)" },
        },
        required: [],
      },
    },
    run: (input, ctx) =>
      get("/analytics/enrollment-trends", ctx.token, {
        from: input.from,
        to: input.to,
      }),
  },
  {
    kind: "read",
    def: {
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
    run: (input, ctx) =>
      get("/salary/salary-slips", ctx.token, {
        ...(input.salaryMonth ? { salaryMonth: input.salaryMonth } : {}),
        ...(input.status ? { status: input.status } : {}),
        limit: 50,
      }),
  },
  {
    kind: "read",
    def: {
      name: "get_timetable",
      description:
        "Get the class timetable(s) for this institution — days of the week, time slots, subjects, and assigned lecturers per class. Optionally pass a classId to get one specific class's schedule. Use this for questions about the school schedule, which teacher handles a subject at what time, or overall timetable coverage.",
      input_schema: {
        type: "object" as const,
        properties: {
          classId: {
            type: "string",
            description:
              "Class ID to retrieve timetable for a specific class (optional — omit to get all classes)",
          },
        },
        required: [],
      },
    },
    run: (input, ctx) =>
      input.classId
        ? get(`/timetable/class/${input.classId}`, ctx.token)
        : get("/timetable", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_calendar_events",
      description:
        "Get all academic calendar events for this institution — holidays, exams, term start/end dates, and other scheduled school events. Use this for questions about upcoming events, exam schedules, school holidays, or term dates.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/calendar", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_parents",
      description:
        "Get the list of registered parents for this institution — their names, the students they are linked to, and their account status (active/revoked). Use this for questions about how many parents are registered, which students have linked parents, or parent account statuses.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/admin/parents", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_class_rankings",
      description:
        "Get student rankings for a specific class based on total marks — student names, scores, and positions. Use this for questions about top-performing students, class leaderboards, or academic standing within a class. Requires a classId.",
      input_schema: {
        type: "object" as const,
        properties: {
          classId: {
            type: "string",
            description:
              "The ID of the class to retrieve rankings for (required)",
          },
        },
        required: ["classId"],
      },
    },
    run: async (input, ctx) =>
      input.classId
        ? get(`/admin/results/class/${input.classId}/rankings`, ctx.token)
        : { error: "classId is required for get_class_rankings" },
  },

  // ─── Companion read for write actions ─────────────────────────────────────
  {
    kind: "read",
    def: {
      name: "find_student",
      description:
        "Search students by name and return matching records with their student IDs. Call this before record_fee_payment to resolve a student name to an exact ID — never guess an ID.",
      input_schema: {
        type: "object" as const,
        properties: {
          name: {
            type: "string",
            description: "Full or partial student name to search for",
          },
        },
        required: ["name"],
      },
    },
    run: async (input, ctx) => {
      const name = String(input.name ?? "").trim();
      const fetchPage = (page: number) =>
        callBackend({
          path: "/admin/students",
          token: ctx.token,
          params: { search: name, limit: 100, page },
          timeout: 10000,
          unwrap: false, // keep the { data, pagination } envelope
        }) as Promise<{
          data?: Record<string, unknown>[];
          pagination?: { pages?: number };
          error?: string;
        }>;

      const first = await fetchPage(1);
      if (first?.error) return { error: first.error };

      let students: Record<string, unknown>[] = Array.isArray(first.data)
        ? first.data
        : [];

      // If the backend ignored `search` (more than one page came back),
      // page through the rest so the name filter below is reliable.
      const pages = first.pagination?.pages ?? 1;
      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2))
        );
        for (const r of rest) {
          if (Array.isArray(r?.data)) students = students.concat(r.data);
        }
      }

      // Client-side name filter — the fallback when the backend lacks search.
      const needle = name.toLowerCase();
      const matches = needle
        ? students.filter((s) =>
            String(s.fullName ?? "")
              .toLowerCase()
              .includes(needle)
          )
        : students;

      return { count: matches.length, students: matches.slice(0, 20) };
    },
  },

  // ─── Write actions (confirmation-gated) ───────────────────────────────────
  {
    kind: "write",
    def: {
      name: "post_announcement",
      description:
        "Post an announcement to this institution. Use when the administrator asks to announce, notify, broadcast, or tell people something.",
      input_schema: {
        type: "object" as const,
        properties: {
          title: { type: "string", description: "Short announcement title" },
          body: { type: "string", description: "Full announcement message" },
          targetRoles: {
            type: "array",
            items: {
              type: "string",
              enum: ["admin", "lecturer", "student", "parent"],
            },
            description:
              "Roles that should see the announcement. Omit to show everyone.",
          },
          expiresAt: {
            type: "string",
            description: "Optional ISO 8601 date when the announcement expires",
          },
        },
        required: ["title", "body"],
      },
    },
    run: (input, ctx) =>
      post("/announcements", ctx.token, {
        title: input.title,
        body: input.body,
        ...(Array.isArray(input.targetRoles) && input.targetRoles.length
          ? { targetRoles: input.targetRoles }
          : {}),
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      }),
    summarize: async (input) => {
      const roles =
        Array.isArray(input.targetRoles) && input.targetRoles.length
          ? (input.targetRoles as string[]).join(", ")
          : "Everyone";
      return {
        toolName: "post_announcement",
        title: "Post announcement",
        description: "This will publish an announcement to your institution.",
        fields: [
          { label: "Title", value: String(input.title ?? "") },
          { label: "Message", value: String(input.body ?? "") },
          { label: "Audience", value: roles },
          ...(input.expiresAt
            ? [{ label: "Expires", value: String(input.expiresAt) }]
            : []),
        ],
        warning: `Everyone in the selected audience (${roles}) will see this announcement.`,
        confirmLabel: "Post announcement",
      };
    },
  },
  {
    kind: "write",
    def: {
      name: "record_fee_payment",
      description:
        "Record a fee payment made by a student. You MUST resolve the student with find_student first — never guess a student ID.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: {
            type: "string",
            description: "The student's ID, obtained from find_student",
          },
          studentName: {
            type: "string",
            description: "The student's full name (for the confirmation card)",
          },
          amount: {
            type: "number",
            description: "Payment amount in NLe",
          },
          method: {
            type: "string",
            description:
              "Payment method, e.g. cash, bank transfer, mobile money",
          },
          reference: {
            type: "string",
            description: "Optional payment reference number",
          },
          notes: { type: "string", description: "Optional notes" },
        },
        required: ["studentId", "studentName", "amount", "method"],
      },
    },
    run: (input, ctx) =>
      post(`/admin/fees/student/${input.studentId}/payment`, ctx.token, {
        amount: Number(input.amount),
        method: input.method,
        ...(input.reference ? { reference: input.reference } : {}),
        ...(input.notes ? { notes: input.notes } : {}),
      }),
    summarize: async (input, ctx) => {
      // Best-effort balance lookup so the admin sees the impact.
      let balanceField: { label: string; value: string }[] = [];
      const fee = (await get(
        `/admin/fees/student/${input.studentId}`,
        ctx.token
      )) as Record<string, unknown> | null;
      const balance =
        fee && typeof fee === "object"
          ? (fee.balance ?? fee.outstanding ?? fee.amountDue)
          : undefined;
      if (typeof balance === "number") {
        balanceField = [
          {
            label: "Current balance",
            value: `NLe ${balance.toLocaleString()}`,
          },
        ];
      }
      return {
        toolName: "record_fee_payment",
        title: "Record fee payment",
        description: `Record a payment for ${String(input.studentName ?? "this student")}.`,
        fields: [
          { label: "Student", value: String(input.studentName ?? "") },
          ...balanceField,
          {
            label: "Amount (NLe)",
            value: String(input.amount ?? ""),
            editable: true,
            key: "amount",
          },
          { label: "Method", value: String(input.method ?? "") },
          ...(input.reference
            ? [{ label: "Reference", value: String(input.reference) }]
            : []),
          {
            label: "Notes",
            value: String(input.notes ?? ""),
            editable: true,
            key: "notes",
          },
        ],
        warning: "This records a real payment against the student's fees.",
        confirmLabel: "Record payment",
      };
    },
  },
];

// ─── System prompt ───────────────────────────────────────────────────────────

export function adminSystemPrompt(): string {
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

## Performing actions
You can perform actions, not only answer questions. Available actions: posting announcements (post_announcement) and recording fee payments (record_fee_payment).
- Before recording a fee payment, call find_student to resolve the student's name to an exact ID. Never invent or guess an ID.
- Clearly state what you are about to do before calling an action tool.
- Call at most one action tool per turn.
- Every action is shown to the administrator for explicit confirmation before it runs — you do not need to ask "are you sure"; the confirmation card handles that.

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
}

// ─── Chat route config ───────────────────────────────────────────────────────

export const adminChatConfig: ChatAgentConfig = {
  name: "admin-chat",
  requiredRole: "admin",
  model: MODELS.haiku,
  rateLimitMax: 40,
  maxMessages: 20,
  maxMessageLength: 2000,
  scrubKeepIds: true,
  includeToolMeta: true,
  tools: adminTools,
  buildSystemPrompt: adminSystemPrompt,
};
