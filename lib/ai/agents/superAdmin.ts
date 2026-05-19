import { callBackend } from "@/lib/ai/backend";
import { MODELS } from "@/lib/ai/anthropic";
import type { ChatAgentConfig } from "@/lib/ai/handler";
import type { AgentTool } from "@/lib/ai/tools";

const get = (path: string, token: string, params?: Record<string, unknown>) =>
  callBackend({ path, token, params, timeout: 10000 });

// ─── Read tools ────────────────────────────────────────────────────────────

export const superAdminTools: AgentTool[] = [
  {
    kind: "read",
    def: {
      name: "get_system_overview",
      description:
        "Get a high-level overview of the entire platform: total institutes, admins (active/pending/suspended), students, lecturers, total fees billed vs collected vs outstanding, and total salary expenditure. Use this for broad platform health questions or when the user asks for a summary.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/super-admin/monitor/overview", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_institute_health",
      description:
        "Get a health report for every institution on the platform — student/lecturer/admin counts, classes, subjects, fee billed vs collected, and salary disbursed per institution. Use this to compare institutions, find the highest/lowest performing ones, or answer questions about specific schools.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/super-admin/monitor/institutes", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_fee_revenue",
      description:
        "Get a detailed fee revenue report across all institutions: total billed, collected, outstanding, collection rate, breakdown by payment status, and a ranked list of top institutions by fee collection. Use this for questions about fee defaults, revenue, payment rates, or financial performance.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/super-admin/monitor/fee-revenue", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_salary_expenditure",
      description:
        "Get a salary expenditure report across all institutions: total disbursed, paid vs pending, breakdown by status, and per-institution salary data with staff counts. Use this for payroll questions, pending salary issues, or per-institution staff costs.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) =>
      get("/super-admin/monitor/salary-expenditure", ctx.token),
  },
  {
    kind: "read",
    def: {
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
    run: (input, ctx) =>
      get("/super-admin/monitor/growth", ctx.token, {
        months: input.months ?? 6,
      }),
  },
  {
    kind: "read",
    def: {
      name: "get_attendance_summary",
      description:
        "Get platform-wide attendance statistics: overall attendance rate, total present/absent counts, period-over-period delta, and a breakdown by class. Optionally filter by institution or date range. Use this for attendance rate questions, absence trends, or class-level attendance comparisons.",
      input_schema: {
        type: "object" as const,
        properties: {
          from: {
            type: "string",
            description: "Start date (ISO 8601), e.g. 2025-01-01",
          },
          to: {
            type: "string",
            description: "End date (ISO 8601), e.g. 2025-03-31",
          },
          institution: {
            type: "string",
            description: "Institution ID to scope results (optional)",
          },
        },
        required: [],
      },
    },
    run: (input, ctx) =>
      get("/analytics/attendance-summary", ctx.token, {
        from: input.from,
        to: input.to,
        institution: input.institution,
      }),
  },
  {
    kind: "read",
    def: {
      name: "get_fee_defaults",
      description:
        "Get fee default and collection analytics: default rate, collection rate, total outstanding balance, breakdown by payment status (paid/partial/unpaid), and top defaulting institutions. Use this for default rate questions, collection performance, or identifying schools with high outstanding balances.",
      input_schema: {
        type: "object" as const,
        properties: {
          from: { type: "string", description: "Start date (ISO 8601)" },
          to: { type: "string", description: "End date (ISO 8601)" },
          institution: {
            type: "string",
            description: "Institution ID to scope results (optional)",
          },
        },
        required: [],
      },
    },
    run: (input, ctx) =>
      get("/analytics/fee-defaults", ctx.token, {
        from: input.from,
        to: input.to,
        institution: input.institution,
      }),
  },
  {
    kind: "read",
    def: {
      name: "get_assignment_completion",
      description:
        "Get assignment submission and completion analytics: total assignments, submission count, completion rate, on-time vs late submissions, graded vs pending, and a per-class breakdown. Use this for assignment compliance questions, late submission trends, or class-level engagement.",
      input_schema: {
        type: "object" as const,
        properties: {
          from: { type: "string", description: "Start date (ISO 8601)" },
          to: { type: "string", description: "End date (ISO 8601)" },
          institution: {
            type: "string",
            description: "Institution ID to scope results (optional)",
          },
        },
        required: [],
      },
    },
    run: (input, ctx) =>
      get("/analytics/assignment-completion", ctx.token, {
        from: input.from,
        to: input.to,
        institution: input.institution,
      }),
  },
  {
    kind: "read",
    def: {
      name: "get_enrollment_trends",
      description:
        "Get student enrollment trends: total enrolled, active/inactive counts, monthly breakdown, and per-institution or per-class distribution. Use this for enrollment growth questions, active student counts, or institution-level enrollment comparisons.",
      input_schema: {
        type: "object" as const,
        properties: {
          from: { type: "string", description: "Start date (ISO 8601)" },
          to: { type: "string", description: "End date (ISO 8601)" },
          institution: {
            type: "string",
            description: "Institution ID to scope results (optional)",
          },
          cohort: {
            type: "string",
            description:
              "Class ID to scope results to a single cohort (optional)",
          },
        },
        required: [],
      },
    },
    run: (input, ctx) =>
      get("/analytics/enrollment-trends", ctx.token, {
        from: input.from,
        to: input.to,
        institution: input.institution,
        cohort: input.cohort,
      }),
  },
];

// ─── System prompt ───────────────────────────────────────────────────────────

export function superAdminSystemPrompt(): string {
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

// ─── Chat route config ───────────────────────────────────────────────────────

export const superAdminChatConfig: ChatAgentConfig = {
  name: "super-admin-chat",
  requiredRole: "super_admin",
  model: MODELS.sonnet,
  rateLimitMax: 60,
  maxMessages: 30,
  maxMessageLength: 3000,
  scrubKeepIds: true,
  includeToolMeta: true,
  noAnswerText: "I couldn't generate a response.",
  tools: superAdminTools,
  buildSystemPrompt: superAdminSystemPrompt,
};
