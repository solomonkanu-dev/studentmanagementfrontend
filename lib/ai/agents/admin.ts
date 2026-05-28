import { callBackend } from "@/lib/ai/backend";
import { MODELS } from "@/lib/ai/anthropic";
import type { ChatAgentConfig } from "@/lib/ai/handler";
import type { AgentTool } from "@/lib/ai/tools";

const get = (path: string, token: string, params?: Record<string, unknown>) =>
  callBackend({ path, token, params, timeout: 10000 });

const post = (path: string, token: string, body: unknown) =>
  callBackend({ path, token, method: "POST", body, timeout: 10000 });

const patch = (path: string, token: string, body?: unknown) =>
  callBackend({ path, token, method: "PATCH", body, timeout: 10000 });

const del = (path: string, token: string) =>
  callBackend({ path, token, method: "DELETE", timeout: 10000 });

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

  // ─── Students & enrollment (reads) ────────────────────────────────────────
  {
    kind: "read",
    def: {
      name: "get_student_details",
      description:
        "Get full details for one student: name, class, status, contact info, guardian, and enrollment data. Requires a studentId — call find_student first if you only have a name.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The student's ID" },
        },
        required: ["studentId"],
      },
    },
    run: async (input, ctx) =>
      input.studentId
        ? get(`/admin/students/${input.studentId}`, ctx.token)
        : { error: "studentId is required" },
  },
  {
    kind: "read",
    def: {
      name: "get_class_roster",
      description:
        "List every student in a specific class with names and basic info. Use this for class-roster questions, headcount per class, or before assigning fees to a class. Requires classId.",
      input_schema: {
        type: "object" as const,
        properties: {
          classId: { type: "string", description: "The class ID" },
        },
        required: ["classId"],
      },
    },
    run: async (input, ctx) =>
      input.classId
        ? get(`/admin/classes/${input.classId}/students`, ctx.token)
        : { error: "classId is required" },
  },
  {
    kind: "read",
    def: {
      name: "list_classes",
      description:
        "List every class in this institution with class IDs, names, and student counts. Use this whenever you need a classId for another tool, or for questions about how many classes the school runs.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/admin/classes", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_archived_students",
      description:
        "Get the list of archived (withdrawn / graduated / deactivated) students. Use this for questions about former students or before restoring an archived student.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/admin/archive/students", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_promotion_eligibility",
      description:
        "For a given class, get the list of students eligible to be promoted to the next class — based on their results and attendance. Call this BEFORE bulk_promote_students.",
      input_schema: {
        type: "object" as const,
        properties: {
          classId: {
            type: "string",
            description: "The class ID to check eligibility for",
          },
        },
        required: ["classId"],
      },
    },
    run: async (input, ctx) =>
      input.classId
        ? get(`/admin/promote/eligibility/${input.classId}`, ctx.token)
        : { error: "classId is required" },
  },

  // ─── Academics & grading (reads) ─────────────────────────────────────────
  {
    kind: "read",
    def: {
      name: "get_exams",
      description:
        "List every exam configured for this institution — name, subject/class, date, total marks. Use for questions about scheduled exams or to find an examId.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/exam", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_class_results",
      description:
        "Get exam results for every student in one class — names, subject scores, totals, percentages, and grades. Use this for class-level academic reviews. Requires classId.",
      input_schema: {
        type: "object" as const,
        properties: {
          classId: { type: "string", description: "The class ID" },
        },
        required: ["classId"],
      },
    },
    run: async (input, ctx) =>
      input.classId
        ? get(`/admin/results/class/${input.classId}`, ctx.token)
        : { error: "classId is required" },
  },
  {
    kind: "read",
    def: {
      name: "get_results_publish_status",
      description:
        "Get the current publish status for results across classes — whether each class's results are released to students/parents or still hidden. Use this before publish_results or unpublish_results.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/admin/results/publish-status", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_student_report_card",
      description:
        "Get a single student's full report card — subject-by-subject marks, grades, comments, and overall performance. Requires studentId.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The student's ID" },
        },
        required: ["studentId"],
      },
    },
    run: async (input, ctx) =>
      input.studentId
        ? get(`/admin/report-card/${input.studentId}`, ctx.token)
        : { error: "studentId is required" },
  },

  // ─── Communication (reads) ───────────────────────────────────────────────
  {
    kind: "read",
    def: {
      name: "get_announcement_read_status",
      description:
        "For one announcement, see who has and hasn't read it — counts and per-user breakdown. Use this for engagement / acknowledgment questions. Requires announcementId.",
      input_schema: {
        type: "object" as const,
        properties: {
          announcementId: {
            type: "string",
            description: "The announcement ID",
          },
        },
        required: ["announcementId"],
      },
    },
    run: async (input, ctx) =>
      input.announcementId
        ? get(`/announcements/${input.announcementId}/read-status`, ctx.token)
        : { error: "announcementId is required" },
  },
  {
    kind: "read",
    def: {
      name: "list_announcements",
      description:
        "List all announcements visible to this admin — title, body, audience, and date. Use this to find an announcementId before updating or deleting.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/announcements", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_email_logs",
      description:
        "Get recent outbound email delivery logs for this institution — recipient, subject, status (sent/failed), and timestamp. Use this for delivery-troubleshooting questions.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) =>
      get("/admin/notification-settings/logs", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_sms_logs",
      description:
        "Get recent SMS delivery logs for this institution — recipient, status, and timestamp. Use this for delivery-troubleshooting questions about SMS notifications.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) =>
      get("/admin/notification-settings/sms-logs", ctx.token),
  },

  // ─── Finance & billing (reads) ───────────────────────────────────────────
  {
    kind: "read",
    def: {
      name: "get_fee_by_class",
      description:
        "Get fee analytics broken down per class — billed, collected, outstanding, and collection rate per class. Use to compare classes or find under-collecting cohorts.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/admin/fee-analysis/by-class", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_fee_by_status",
      description:
        "Get fee analytics broken down by payment status (paid / partial / unpaid) — counts and amounts. Use for top-level payment-status questions.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/admin/fee-analysis/by-status", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_collection_trend",
      description:
        "Get fee collection trend over time — daily/weekly/monthly totals. Use for cash-flow or trend questions.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) =>
      get("/admin/fee-analysis/collection-trend", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "list_fee_structures",
      description:
        "List every fee structure (tuition, registration, etc.) — name, amount, applicable class, and term. Use this to find a feeStructureId before assigning fees.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/fee-structure", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_student_fee_detail",
      description:
        "Get a single student's full fee record — total billed, paid, outstanding, and itemised fee structures applied. Requires studentId.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The student's ID" },
        },
        required: ["studentId"],
      },
    },
    run: async (input, ctx) =>
      input.studentId
        ? get(`/admin/fees/student/${input.studentId}`, ctx.token)
        : { error: "studentId is required" },
  },
  {
    kind: "read",
    def: {
      name: "get_student_payments",
      description:
        "Get a student's full payment history — date, amount, method, reference, and running balance. Requires studentId.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The student's ID" },
        },
        required: ["studentId"],
      },
    },
    run: async (input, ctx) =>
      input.studentId
        ? get(`/admin/fees/student/${input.studentId}/payments`, ctx.token)
        : { error: "studentId is required" },
  },

  // ─── Students & enrollment (writes) ──────────────────────────────────────
  {
    kind: "write",
    def: {
      name: "create_student",
      description:
        "Create a new student record. Captures core identity, class assignment, and guardian contact. Use only when the admin asks to add/enroll a new student.",
      input_schema: {
        type: "object" as const,
        properties: {
          fullName: { type: "string", description: "Student's full name" },
          email: { type: "string", description: "Email (optional)" },
          phoneNumber: { type: "string", description: "Phone (optional)" },
          classId: { type: "string", description: "ID of the assigned class" },
          className: {
            type: "string",
            description: "Class name (for the confirmation card)",
          },
          gender: {
            type: "string",
            enum: ["male", "female", "other"],
            description: "Optional",
          },
          dateOfBirth: {
            type: "string",
            description: "Date of birth YYYY-MM-DD (optional)",
          },
        },
        required: ["fullName", "classId", "className"],
      },
    },
    run: (input, ctx) =>
      post("/admin/create-student", ctx.token, {
        fullName: input.fullName,
        classId: input.classId,
        ...(input.email ? { email: input.email } : {}),
        ...(input.phoneNumber ? { phoneNumber: input.phoneNumber } : {}),
        ...(input.gender ? { gender: input.gender } : {}),
        ...(input.dateOfBirth ? { dateOfBirth: input.dateOfBirth } : {}),
      }),
    summarize: async (input) => ({
      toolName: "create_student",
      title: "Create student",
      description: `Enroll ${String(input.fullName ?? "this student")} into ${String(input.className ?? "the chosen class")}.`,
      fields: [
        {
          label: "Full name",
          value: String(input.fullName ?? ""),
          editable: true,
          key: "fullName",
        },
        { label: "Class", value: String(input.className ?? "") },
        ...(input.email
          ? [{ label: "Email", value: String(input.email) }]
          : []),
        ...(input.phoneNumber
          ? [{ label: "Phone", value: String(input.phoneNumber) }]
          : []),
        ...(input.gender
          ? [{ label: "Gender", value: String(input.gender) }]
          : []),
        ...(input.dateOfBirth
          ? [{ label: "Date of birth", value: String(input.dateOfBirth) }]
          : []),
      ],
      warning:
        "This creates a real student record and counts against your plan's student limit.",
      confirmLabel: "Create student",
    }),
  },
  {
    kind: "write",
    def: {
      name: "archive_student",
      description:
        "Archive (withdraw / deactivate) a student. The student keeps history but loses login access. Use find_student first.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The student's user ID" },
          studentName: {
            type: "string",
            description: "Student's name (for the confirmation card)",
          },
          reason: { type: "string", description: "Optional reason" },
        },
        required: ["studentId", "studentName"],
      },
    },
    run: (input, ctx) =>
      patch(`/admin/archive/${input.studentId}`, ctx.token, {
        ...(input.reason ? { reason: input.reason } : {}),
      }),
    summarize: async (input) => ({
      toolName: "archive_student",
      title: "Archive student",
      description: `Archive ${String(input.studentName ?? "this student")} — they will lose login access.`,
      fields: [
        { label: "Student", value: String(input.studentName ?? "") },
        ...(input.reason
          ? [
              {
                label: "Reason",
                value: String(input.reason),
                editable: true,
                key: "reason",
              },
            ]
          : []),
      ],
      warning: "The student will no longer be able to sign in.",
      confirmLabel: "Archive student",
    }),
  },
  {
    kind: "write",
    def: {
      name: "restore_archived_student",
      description:
        "Restore a previously archived student so they regain access. Use get_archived_students to find the userId first.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: {
            type: "string",
            description: "The archived student's user ID",
          },
          studentName: {
            type: "string",
            description: "Student's name (for the confirmation card)",
          },
        },
        required: ["studentId", "studentName"],
      },
    },
    run: (input, ctx) =>
      patch(`/admin/archive/${input.studentId}/restore`, ctx.token),
    summarize: async (input) => ({
      toolName: "restore_archived_student",
      title: "Restore student",
      description: `Restore ${String(input.studentName ?? "this student")} so they can sign in again.`,
      fields: [{ label: "Student", value: String(input.studentName ?? "") }],
      confirmLabel: "Restore student",
    }),
  },
  {
    kind: "write",
    def: {
      name: "bulk_promote_students",
      description:
        "Promote a list of eligible students from one class to the next. Call get_promotion_eligibility first to confirm who is eligible.",
      input_schema: {
        type: "object" as const,
        properties: {
          fromClassId: { type: "string", description: "Source class ID" },
          fromClassName: {
            type: "string",
            description: "Source class name (for the confirmation card)",
          },
          toClassId: { type: "string", description: "Destination class ID" },
          toClassName: {
            type: "string",
            description: "Destination class name (for the confirmation card)",
          },
          studentIds: {
            type: "array",
            items: { type: "string" },
            description: "IDs of students to promote",
          },
          studentNames: {
            type: "array",
            items: { type: "string" },
            description: "Student names (for the confirmation card)",
          },
        },
        required: [
          "fromClassId",
          "fromClassName",
          "toClassId",
          "toClassName",
          "studentIds",
        ],
      },
    },
    run: (input, ctx) =>
      post("/admin/promote/bulk", ctx.token, {
        fromClassId: input.fromClassId,
        toClassId: input.toClassId,
        studentIds: Array.isArray(input.studentIds) ? input.studentIds : [],
      }),
    summarize: async (input) => {
      const ids = Array.isArray(input.studentIds) ? input.studentIds : [];
      const names = Array.isArray(input.studentNames)
        ? (input.studentNames as string[])
        : [];
      return {
        toolName: "bulk_promote_students",
        title: "Promote students",
        description: `Promote ${ids.length} student${ids.length === 1 ? "" : "s"} from ${String(input.fromClassName ?? "")} to ${String(input.toClassName ?? "")}.`,
        fields: [
          {
            label: "Count",
            value: `${ids.length} student${ids.length === 1 ? "" : "s"}`,
          },
          { label: "From", value: String(input.fromClassName ?? "") },
          { label: "To", value: String(input.toClassName ?? "") },
          ...(names.length
            ? [{ label: "Students", value: names.slice(0, 30).join(", ") }]
            : []),
        ],
        warning: `This permanently moves ${ids.length} students. Their academic history stays intact.`,
        confirmLabel: "Promote students",
      };
    },
  },
  {
    kind: "write",
    def: {
      name: "create_parent",
      description:
        "Create a parent account for a guardian. Use when the admin asks to register or invite a new parent.",
      input_schema: {
        type: "object" as const,
        properties: {
          fullName: { type: "string", description: "Parent's full name" },
          email: { type: "string", description: "Parent's email (login)" },
          phoneNumber: { type: "string", description: "Phone (optional)" },
        },
        required: ["fullName", "email"],
      },
    },
    run: (input, ctx) =>
      post("/admin/parents", ctx.token, {
        fullName: input.fullName,
        email: input.email,
        ...(input.phoneNumber ? { phoneNumber: input.phoneNumber } : {}),
      }),
    summarize: async (input) => ({
      toolName: "create_parent",
      title: "Create parent account",
      description: `Register ${String(input.fullName ?? "this parent")} and send them login details.`,
      fields: [
        { label: "Full name", value: String(input.fullName ?? "") },
        {
          label: "Email",
          value: String(input.email ?? ""),
          editable: true,
          key: "email",
        },
        ...(input.phoneNumber
          ? [{ label: "Phone", value: String(input.phoneNumber) }]
          : []),
      ],
      warning: "An invite/welcome email will be sent to this address.",
      confirmLabel: "Create parent",
    }),
  },
  {
    kind: "write",
    def: {
      name: "link_parent_to_student",
      description:
        "Link an existing parent account to a student so the parent can see that child's data. Use get_parents for the parentId and find_student for the studentId.",
      input_schema: {
        type: "object" as const,
        properties: {
          parentId: { type: "string", description: "The parent's ID" },
          parentName: { type: "string", description: "Parent's name (display)" },
          studentId: { type: "string", description: "The student's ID" },
          studentName: { type: "string", description: "Student's name (display)" },
        },
        required: ["parentId", "parentName", "studentId", "studentName"],
      },
    },
    run: (input, ctx) =>
      post("/admin/parents/link-student", ctx.token, {
        parentId: input.parentId,
        studentId: input.studentId,
      }),
    summarize: async (input) => ({
      toolName: "link_parent_to_student",
      title: "Link parent to student",
      description: `${String(input.parentName ?? "Parent")} will be linked to ${String(input.studentName ?? "the student")}.`,
      fields: [
        { label: "Parent", value: String(input.parentName ?? "") },
        { label: "Student", value: String(input.studentName ?? "") },
      ],
      confirmLabel: "Link parent",
    }),
  },
  {
    kind: "write",
    def: {
      name: "revoke_parent_access",
      description:
        "Revoke a parent's portal access (they keep the account but can no longer sign in).",
      input_schema: {
        type: "object" as const,
        properties: {
          parentId: { type: "string", description: "The parent's ID" },
          parentName: { type: "string", description: "Parent's name (display)" },
        },
        required: ["parentId", "parentName"],
      },
    },
    run: (input, ctx) =>
      patch(`/admin/parents/${input.parentId}/revoke`, ctx.token),
    summarize: async (input) => ({
      toolName: "revoke_parent_access",
      title: "Revoke parent access",
      description: `${String(input.parentName ?? "This parent")} will no longer be able to sign in.`,
      fields: [{ label: "Parent", value: String(input.parentName ?? "") }],
      warning: "The parent's data stays — only login is blocked.",
      confirmLabel: "Revoke access",
    }),
  },

  // ─── Academics & grading (writes) ────────────────────────────────────────
  {
    kind: "write",
    def: {
      name: "publish_results",
      description:
        "Publish results so students and parents can see them. Optionally scope to one class or one exam. Use get_results_publish_status first.",
      input_schema: {
        type: "object" as const,
        properties: {
          classId: {
            type: "string",
            description: "Class to publish for (optional)",
          },
          className: { type: "string", description: "Class name (display)" },
          examId: {
            type: "string",
            description: "Exam to publish for (optional)",
          },
          examName: { type: "string", description: "Exam name (display)" },
        },
        required: [],
      },
    },
    run: (input, ctx) =>
      patch("/admin/results/publish", ctx.token, {
        ...(input.classId ? { classId: input.classId } : {}),
        ...(input.examId ? { examId: input.examId } : {}),
      }),
    summarize: async (input) => ({
      toolName: "publish_results",
      title: "Publish results",
      description:
        "Results will become visible to students and linked parents.",
      fields: [
        ...(input.className
          ? [{ label: "Class", value: String(input.className) }]
          : []),
        ...(input.examName
          ? [{ label: "Exam", value: String(input.examName) }]
          : []),
        ...(!input.className && !input.examName
          ? [{ label: "Scope", value: "All applicable classes / exams" }]
          : []),
      ],
      warning:
        "Students and parents will see these results immediately after confirmation.",
      confirmLabel: "Publish results",
    }),
  },
  {
    kind: "write",
    def: {
      name: "unpublish_results",
      description:
        "Hide previously-published results from students and parents. Use sparingly — corrections only.",
      input_schema: {
        type: "object" as const,
        properties: {
          classId: { type: "string", description: "Class scope (optional)" },
          className: { type: "string", description: "Class name (display)" },
          examId: { type: "string", description: "Exam scope (optional)" },
          examName: { type: "string", description: "Exam name (display)" },
          reason: { type: "string", description: "Optional reason" },
        },
        required: [],
      },
    },
    run: (input, ctx) =>
      patch("/admin/results/unpublish", ctx.token, {
        ...(input.classId ? { classId: input.classId } : {}),
        ...(input.examId ? { examId: input.examId } : {}),
        ...(input.reason ? { reason: input.reason } : {}),
      }),
    summarize: async (input) => ({
      toolName: "unpublish_results",
      title: "Unpublish results",
      description:
        "These results will be hidden from students and parents again.",
      fields: [
        ...(input.className
          ? [{ label: "Class", value: String(input.className) }]
          : []),
        ...(input.examName
          ? [{ label: "Exam", value: String(input.examName) }]
          : []),
        ...(input.reason
          ? [
              {
                label: "Reason",
                value: String(input.reason),
                editable: true,
                key: "reason",
              },
            ]
          : []),
      ],
      warning:
        "Anyone who already viewed these results will lose access from this point.",
      confirmLabel: "Unpublish results",
    }),
  },
  {
    kind: "write",
    def: {
      name: "assign_marks",
      description:
        "Record marks for a single student on a single subject for one exam. Use find_student and list_classes / get_exams to get IDs first.",
      input_schema: {
        type: "object" as const,
        properties: {
          studentId: { type: "string", description: "The student's ID" },
          studentName: { type: "string", description: "Student name (display)" },
          subjectId: { type: "string", description: "The subject's ID" },
          subjectName: { type: "string", description: "Subject name (display)" },
          examId: { type: "string", description: "The exam's ID" },
          examName: { type: "string", description: "Exam name (display)" },
          marks: { type: "number", description: "Marks scored" },
          totalMarks: { type: "number", description: "Total possible marks" },
        },
        required: [
          "studentId",
          "studentName",
          "subjectId",
          "subjectName",
          "examId",
          "examName",
          "marks",
          "totalMarks",
        ],
      },
    },
    run: (input, ctx) =>
      post("/admin/result/assign-marks", ctx.token, {
        studentId: input.studentId,
        subjectId: input.subjectId,
        examId: input.examId,
        marks: Number(input.marks),
        totalMarks: Number(input.totalMarks),
      }),
    summarize: async (input) => ({
      toolName: "assign_marks",
      title: "Record marks",
      description: `Record ${String(input.studentName ?? "")}'s marks for ${String(input.subjectName ?? "")} (${String(input.examName ?? "")}).`,
      fields: [
        { label: "Student", value: String(input.studentName ?? "") },
        { label: "Subject", value: String(input.subjectName ?? "") },
        { label: "Exam", value: String(input.examName ?? "") },
        {
          label: "Marks",
          value: String(input.marks ?? ""),
          editable: true,
          key: "marks",
        },
        { label: "Out of", value: String(input.totalMarks ?? "") },
      ],
      confirmLabel: "Record marks",
    }),
  },
  {
    kind: "write",
    def: {
      name: "create_exam",
      description:
        "Create a new exam for the institution. Use only when explicitly asked to add an exam to the schedule.",
      input_schema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Exam name" },
          classId: { type: "string", description: "Class the exam is for" },
          className: { type: "string", description: "Class name (display)" },
          subjectId: { type: "string", description: "Subject (optional)" },
          subjectName: {
            type: "string",
            description: "Subject name (display, optional)",
          },
          examDate: {
            type: "string",
            description: "Date in YYYY-MM-DD (optional)",
          },
          totalMarks: { type: "number", description: "Total marks" },
        },
        required: ["name", "classId", "className", "totalMarks"],
      },
    },
    run: (input, ctx) =>
      post("/exam", ctx.token, {
        name: input.name,
        classId: input.classId,
        ...(input.subjectId ? { subjectId: input.subjectId } : {}),
        ...(input.examDate ? { examDate: input.examDate } : {}),
        totalMarks: Number(input.totalMarks),
      }),
    summarize: async (input) => ({
      toolName: "create_exam",
      title: "Create exam",
      description: `Add a new exam "${String(input.name ?? "")}" for ${String(input.className ?? "this class")}.`,
      fields: [
        {
          label: "Name",
          value: String(input.name ?? ""),
          editable: true,
          key: "name",
        },
        { label: "Class", value: String(input.className ?? "") },
        ...(input.subjectName
          ? [{ label: "Subject", value: String(input.subjectName) }]
          : []),
        ...(input.examDate
          ? [{ label: "Date", value: String(input.examDate) }]
          : []),
        {
          label: "Total marks",
          value: String(input.totalMarks ?? ""),
          editable: true,
          key: "totalMarks",
        },
      ],
      confirmLabel: "Create exam",
    }),
  },

  // ─── Communication (writes) ──────────────────────────────────────────────
  {
    kind: "write",
    def: {
      name: "update_announcement",
      description:
        "Edit an existing announcement's title or body. Use list_announcements first to find the announcementId.",
      input_schema: {
        type: "object" as const,
        properties: {
          announcementId: {
            type: "string",
            description: "The announcement ID",
          },
          currentTitle: {
            type: "string",
            description: "Current title (for the confirmation card)",
          },
          title: { type: "string", description: "New title (optional)" },
          body: { type: "string", description: "New body (optional)" },
        },
        required: ["announcementId", "currentTitle"],
      },
    },
    run: (input, ctx) =>
      patch(`/announcements/${input.announcementId}`, ctx.token, {
        ...(input.title ? { title: input.title } : {}),
        ...(input.body ? { body: input.body } : {}),
      }),
    summarize: async (input) => ({
      toolName: "update_announcement",
      title: "Edit announcement",
      description: `Update "${String(input.currentTitle ?? "this announcement")}".`,
      fields: [
        ...(input.title
          ? [
              {
                label: "New title",
                value: String(input.title),
                editable: true,
                key: "title",
              },
            ]
          : []),
        ...(input.body
          ? [
              {
                label: "New body",
                value: String(input.body),
                editable: true,
                key: "body",
              },
            ]
          : []),
      ],
      confirmLabel: "Save changes",
    }),
  },
  {
    kind: "write",
    def: {
      name: "delete_announcement",
      description:
        "Permanently delete an announcement. Use list_announcements to find the announcementId.",
      input_schema: {
        type: "object" as const,
        properties: {
          announcementId: { type: "string", description: "Announcement ID" },
          title: { type: "string", description: "Title (for the confirmation card)" },
        },
        required: ["announcementId", "title"],
      },
    },
    run: (input, ctx) => del(`/announcements/${input.announcementId}`, ctx.token),
    summarize: async (input) => ({
      toolName: "delete_announcement",
      title: "Delete announcement",
      description: `Permanently delete "${String(input.title ?? "this announcement")}".`,
      fields: [{ label: "Title", value: String(input.title ?? "") }],
      warning: "This cannot be undone.",
      confirmLabel: "Delete",
    }),
  },

  // ─── Finance & billing (writes) ──────────────────────────────────────────
  {
    kind: "write",
    def: {
      name: "assign_fees_to_class",
      description:
        "Apply a fee structure to every student in a class — bulk fee assignment. Use list_classes and list_fee_structures to find IDs.",
      input_schema: {
        type: "object" as const,
        properties: {
          classId: { type: "string", description: "Class ID" },
          className: { type: "string", description: "Class name (display)" },
          feeStructureId: { type: "string", description: "Fee structure ID" },
          feeStructureName: {
            type: "string",
            description: "Fee structure name (display)",
          },
          feeAmount: {
            type: "number",
            description: "Per-student amount (display, in NLe)",
          },
          studentCount: {
            type: "number",
            description: "How many students will be billed (for the card)",
          },
        },
        required: ["classId", "className", "feeStructureId", "feeStructureName"],
      },
    },
    run: (input, ctx) =>
      post("/admin/fees/assign/class", ctx.token, {
        classId: input.classId,
        feeStructureId: input.feeStructureId,
      }),
    summarize: async (input) => {
      const count =
        typeof input.studentCount === "number" ? input.studentCount : null;
      const total =
        typeof input.feeAmount === "number" && count !== null
          ? input.feeAmount * count
          : null;
      return {
        toolName: "assign_fees_to_class",
        title: "Assign fee to class",
        description: `Charge "${String(input.feeStructureName ?? "")}" to every student in ${String(input.className ?? "")}.`,
        fields: [
          { label: "Class", value: String(input.className ?? "") },
          { label: "Fee", value: String(input.feeStructureName ?? "") },
          ...(typeof input.feeAmount === "number"
            ? [
                {
                  label: "Per student",
                  value: `NLe ${input.feeAmount.toLocaleString()}`,
                },
              ]
            : []),
          ...(count !== null
            ? [
                {
                  label: "Students billed",
                  value: `${count}`,
                },
              ]
            : []),
          ...(total !== null
            ? [
                {
                  label: "Total billed",
                  value: `NLe ${total.toLocaleString()}`,
                },
              ]
            : []),
        ],
        warning:
          "This bills every student currently in the class. New students added later will not be auto-billed.",
        confirmLabel: "Assign fees",
      };
    },
  },
  {
    kind: "write",
    def: {
      name: "create_fee_structure",
      description:
        "Define a new fee structure (e.g. tuition, registration, exam fee). Use only when explicitly asked to add a new fee type.",
      input_schema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Fee structure name" },
          amount: { type: "number", description: "Amount in NLe" },
          frequency: {
            type: "string",
            enum: ["one-time", "monthly", "termly", "yearly"],
            description: "Billing frequency",
          },
          description: {
            type: "string",
            description: "Optional description",
          },
        },
        required: ["name", "amount", "frequency"],
      },
    },
    run: (input, ctx) =>
      post("/fee-structure", ctx.token, {
        name: input.name,
        amount: Number(input.amount),
        frequency: input.frequency,
        ...(input.description ? { description: input.description } : {}),
      }),
    summarize: async (input) => ({
      toolName: "create_fee_structure",
      title: "Create fee structure",
      description: `Add a new fee type "${String(input.name ?? "")}".`,
      fields: [
        {
          label: "Name",
          value: String(input.name ?? ""),
          editable: true,
          key: "name",
        },
        {
          label: "Amount",
          value: `NLe ${Number(input.amount ?? 0).toLocaleString()}`,
          editable: true,
          key: "amount",
        },
        { label: "Frequency", value: String(input.frequency ?? "") },
        ...(input.description
          ? [{ label: "Description", value: String(input.description) }]
          : []),
      ],
      confirmLabel: "Create fee structure",
    }),
  },
  {
    kind: "write",
    def: {
      name: "pay_salary",
      description:
        "Record a salary payment for a staff member. Pulls from active salary records — use get_salary_records first to find the salary record.",
      input_schema: {
        type: "object" as const,
        properties: {
          lecturerId: { type: "string", description: "Lecturer's user ID" },
          lecturerName: { type: "string", description: "Name (display)" },
          amount: { type: "number", description: "Net amount paid (NLe)" },
          bonus: { type: "number", description: "Bonus (optional)" },
          deductions: { type: "number", description: "Deductions (optional)" },
          salaryMonth: {
            type: "string",
            description: "YYYY-MM the salary covers",
          },
          method: {
            type: "string",
            description: "Payment method (e.g. bank transfer)",
          },
        },
        required: [
          "lecturerId",
          "lecturerName",
          "amount",
          "salaryMonth",
          "method",
        ],
      },
    },
    run: (input, ctx) =>
      post("/salary/pay-salary", ctx.token, {
        lecturerId: input.lecturerId,
        amount: Number(input.amount),
        salaryMonth: input.salaryMonth,
        method: input.method,
        ...(typeof input.bonus === "number" ? { bonus: input.bonus } : {}),
        ...(typeof input.deductions === "number"
          ? { deductions: input.deductions }
          : {}),
      }),
    summarize: async (input) => ({
      toolName: "pay_salary",
      title: "Pay salary",
      description: `Pay ${String(input.lecturerName ?? "this staff member")}'s salary for ${String(input.salaryMonth ?? "")}.`,
      fields: [
        { label: "Recipient", value: String(input.lecturerName ?? "") },
        { label: "Month", value: String(input.salaryMonth ?? "") },
        {
          label: "Amount",
          value: `NLe ${Number(input.amount ?? 0).toLocaleString()}`,
          editable: true,
          key: "amount",
        },
        ...(typeof input.bonus === "number"
          ? [{ label: "Bonus", value: `NLe ${input.bonus.toLocaleString()}` }]
          : []),
        ...(typeof input.deductions === "number"
          ? [
              {
                label: "Deductions",
                value: `NLe ${input.deductions.toLocaleString()}`,
              },
            ]
          : []),
        { label: "Method", value: String(input.method ?? "") },
      ],
      warning: "This records an actual salary payment.",
      confirmLabel: "Record salary payment",
    }),
  },
  {
    kind: "write",
    def: {
      name: "mark_salary_paid",
      description:
        "Mark an existing pending salary record as paid (use when the salary was already issued out-of-band). Use get_salary_records to find the salaryId.",
      input_schema: {
        type: "object" as const,
        properties: {
          salaryId: { type: "string", description: "The salary record ID" },
          lecturerName: { type: "string", description: "Name (display)" },
          salaryMonth: { type: "string", description: "Month (display)" },
          amount: { type: "number", description: "Amount (display, NLe)" },
        },
        required: ["salaryId", "lecturerName"],
      },
    },
    run: (input, ctx) =>
      patch(`/salary/${input.salaryId}/mark-paid`, ctx.token),
    summarize: async (input) => ({
      toolName: "mark_salary_paid",
      title: "Mark salary paid",
      description: `Flag ${String(input.lecturerName ?? "this staff")}'s salary record as paid.`,
      fields: [
        { label: "Recipient", value: String(input.lecturerName ?? "") },
        ...(input.salaryMonth
          ? [{ label: "Month", value: String(input.salaryMonth) }]
          : []),
        ...(typeof input.amount === "number"
          ? [
              {
                label: "Amount",
                value: `NLe ${input.amount.toLocaleString()}`,
              },
            ]
          : []),
      ],
      confirmLabel: "Mark as paid",
    }),
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
You can perform many actions, not just answer questions. Categories of actions you can take:
- **Communication**: post_announcement, update_announcement, delete_announcement
- **Enrollment**: create_student, archive_student, restore_archived_student, bulk_promote_students, create_parent, link_parent_to_student, revoke_parent_access
- **Academics**: publish_results, unpublish_results, assign_marks, create_exam
- **Finance**: record_fee_payment, assign_fees_to_class, create_fee_structure, pay_salary, mark_salary_paid

Rules for every action:
- ALWAYS resolve real IDs with the matching read tool first — never guess. Examples:
  - find_student → studentId
  - list_classes → classId
  - get_parents → parentId
  - list_fee_structures → feeStructureId
  - list_announcements → announcementId
  - get_promotion_eligibility → list of eligible studentIds before bulk_promote_students
  - get_salary_records → salaryId for mark_salary_paid
- Clearly state what you are about to do before calling an action tool.
- Call at most one action tool per turn.
- Every action is shown to the administrator for explicit confirmation before it runs — you do not need to ask "are you sure"; the confirmation card handles that.
- Internal IDs are for tool calls only — never show them in your replies.

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
