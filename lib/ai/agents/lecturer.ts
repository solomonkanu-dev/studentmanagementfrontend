import { callBackend } from "@/lib/ai/backend";
import { MODELS } from "@/lib/ai/anthropic";
import type { ChatAgentConfig } from "@/lib/ai/handler";
import type { AgentTool } from "@/lib/ai/tools";

const get = (path: string, token: string, params?: Record<string, unknown>) =>
  callBackend({ path, token, params, timeout: 8000 });

const send = (
  path: string,
  token: string,
  method: "POST" | "PATCH",
  body: unknown
) => callBackend({ path, token, method, body, timeout: 8000 });

// ─── Read tools ────────────────────────────────────────────────────────────

export const lecturerTools: AgentTool[] = [
  {
    kind: "read",
    def: {
      name: "get_my_subjects",
      description:
        "Get the list of subjects this lecturer is assigned to teach, including subject name, class, and department. Use this for questions about their teaching load, which subjects or classes they handle, or their schedule.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/subject/lecturer", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_my_assignments",
      description:
        "Get all assignments created by this lecturer — title, subject, due date, total marks, and status (draft/published). Use this for questions about their assignments, deadlines, or how many assignments they have set.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/assignment/my", ctx.token),
  },
  {
    kind: "read",
    def: {
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
    run: (input, ctx) =>
      get("/attendance/report/class", ctx.token, {
        ...(input.classId ? { classId: input.classId } : {}),
      }),
  },
  {
    kind: "read",
    def: {
      name: "get_my_salary",
      description:
        "Get this lecturer's salary records — salary amounts, payment status (paid/pending), and payment dates. Use this for questions about their pay, salary slips, or pending payments.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get(`/salary/lecturer/${ctx.userId}`, ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_my_attendance",
      description:
        "Get this lecturer's own employee attendance record — days present, absent, and their attendance percentage. Use this for questions about their own punctuality or attendance status.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) =>
      get(`/attendance/employee/summary/${ctx.userId}`, ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_my_timetable",
      description:
        "Get the timetables for all classes in this institution, including days of the week, time slots, subjects, and assigned lecturers. Use this for questions about the weekly class schedule, which periods this teacher is assigned to, or what subjects run at what times.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/timetable", ctx.token),
  },
  {
    kind: "read",
    def: {
      name: "get_calendar_events",
      description:
        "Get the academic calendar events for this institution — holidays, exam dates, term start/end, and other school events. Use this for questions about upcoming events, when exams are scheduled, school holidays, or term dates.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    run: (_input, ctx) => get("/calendar", ctx.token),
  },

  // ─── Companion reads for write actions ────────────────────────────────────
  {
    kind: "read",
    def: {
      name: "list_class_students",
      description:
        "List the students in a class (with their student IDs) so attendance can be recorded. Pass the classId, and optionally a subjectId.",
      input_schema: {
        type: "object" as const,
        properties: {
          classId: { type: "string", description: "The class ID (required)" },
          subjectId: {
            type: "string",
            description: "Optional subject ID to scope the roster",
          },
        },
        required: ["classId"],
      },
    },
    run: async (input, ctx) =>
      input.classId
        ? get("/attendance/students", ctx.token, {
            classId: input.classId,
            ...(input.subjectId ? { subjectId: input.subjectId } : {}),
          })
        : { error: "classId is required for list_class_students" },
  },
  {
    kind: "read",
    def: {
      name: "list_submissions_for_assignment",
      description:
        "List all student submissions for one assignment, including submission IDs, student names, and current scores. Call this before grade_submission to resolve a student to a submission ID.",
      input_schema: {
        type: "object" as const,
        properties: {
          assignmentId: {
            type: "string",
            description: "The assignment ID (from get_my_assignments)",
          },
        },
        required: ["assignmentId"],
      },
    },
    run: async (input, ctx) =>
      input.assignmentId
        ? get(`/submission/assignment/${input.assignmentId}`, ctx.token)
        : { error: "assignmentId is required" },
  },

  // ─── Write actions (confirmation-gated) ───────────────────────────────────
  {
    kind: "write",
    def: {
      name: "mark_class_attendance",
      description:
        "Record attendance for a class on a given date. Call list_class_students first to get student IDs. Build one record per student.",
      input_schema: {
        type: "object" as const,
        properties: {
          classId: { type: "string", description: "The class ID" },
          className: {
            type: "string",
            description: "The class name (for the confirmation card)",
          },
          subjectId: {
            type: "string",
            description: "Optional subject ID the attendance is for",
          },
          date: {
            type: "string",
            description: "Attendance date in YYYY-MM-DD format",
          },
          records: {
            type: "array",
            description: "One entry per student",
            items: {
              type: "object",
              properties: {
                studentId: { type: "string" },
                studentName: { type: "string" },
                status: {
                  type: "string",
                  enum: ["present", "absent", "late"],
                },
              },
              required: ["studentId", "studentName", "status"],
            },
          },
        },
        required: ["classId", "className", "date", "records"],
      },
    },
    run: (input, ctx) => {
      const records = Array.isArray(input.records)
        ? (input.records as { studentId: string; status: string }[]).map(
            (r) => ({ studentId: r.studentId, status: r.status })
          )
        : [];
      return send("/attendance/mark-attendance", ctx.token, "POST", {
        classId: input.classId,
        date: input.date,
        ...(input.subjectId ? { subjectId: input.subjectId } : {}),
        records,
      });
    },
    summarize: async (input) => {
      const records = Array.isArray(input.records)
        ? (input.records as { studentName: string; status: string }[])
        : [];
      const present = records.filter((r) => r.status === "present").length;
      const absent = records.filter((r) => r.status === "absent").length;
      const late = records.filter((r) => r.status === "late").length;
      return {
        toolName: "mark_class_attendance",
        title: "Record class attendance",
        description: `Attendance for ${String(input.className ?? "this class")} on ${String(input.date ?? "")}.`,
        fields: [
          {
            label: "Summary",
            value: `${present} present · ${absent} absent · ${late} late`,
          },
          ...records.map((r) => ({
            label: r.studentName,
            value: r.status,
          })),
        ],
        warning: "This saves an attendance record for every listed student.",
        confirmLabel: "Save attendance",
      };
    },
  },
  {
    kind: "write",
    def: {
      name: "grade_submission",
      description:
        "Record a score and optional feedback for a student's assignment submission. Call list_submissions_for_assignment first to get the submission ID.",
      input_schema: {
        type: "object" as const,
        properties: {
          submissionId: {
            type: "string",
            description: "The submission ID (from list_submissions_for_assignment)",
          },
          studentName: {
            type: "string",
            description: "The student's name (for the confirmation card)",
          },
          assignmentTitle: {
            type: "string",
            description: "The assignment title (for the confirmation card)",
          },
          score: { type: "number", description: "The score to award" },
          feedback: {
            type: "string",
            description: "Optional written feedback for the student",
          },
        },
        required: ["submissionId", "studentName", "score"],
      },
    },
    run: (input, ctx) =>
      send(`/submission/${input.submissionId}/grade`, ctx.token, "PATCH", {
        score: Number(input.score),
        ...(input.feedback ? { feedback: input.feedback } : {}),
      }),
    summarize: async (input) => ({
      toolName: "grade_submission",
      title: "Grade submission",
      description: `Grade ${String(input.studentName ?? "this student")}'s submission${
        input.assignmentTitle ? ` for "${String(input.assignmentTitle)}"` : ""
      }.`,
      fields: [
        { label: "Student", value: String(input.studentName ?? "") },
        ...(input.assignmentTitle
          ? [{ label: "Assignment", value: String(input.assignmentTitle) }]
          : []),
        {
          label: "Score",
          value: String(input.score ?? ""),
          editable: true,
          key: "score",
        },
        {
          label: "Feedback",
          value: String(input.feedback ?? ""),
          editable: true,
          key: "feedback",
        },
      ],
      warning: "This records the grade on the student's submission.",
      confirmLabel: "Save grade",
    }),
  },
  {
    kind: "write",
    def: {
      name: "create_assignment",
      description:
        "Create a new assignment for a subject this lecturer teaches. Use get_my_subjects to find the subjectId.",
      input_schema: {
        type: "object" as const,
        properties: {
          subjectId: {
            type: "string",
            description: "The subject ID the assignment belongs to",
          },
          title: { type: "string", description: "Assignment title" },
          description: {
            type: "string",
            description: "Optional assignment description / instructions",
          },
          dueDate: {
            type: "string",
            description: "Due date in YYYY-MM-DD format",
          },
          totalMarks: {
            type: "number",
            description: "Total marks the assignment is out of",
          },
        },
        required: ["subjectId", "title", "dueDate", "totalMarks"],
      },
    },
    run: (input, ctx) =>
      send("/assignment/create-assignment", ctx.token, "POST", {
        subject: input.subjectId,
        subjectId: input.subjectId,
        title: input.title,
        ...(input.description ? { description: input.description } : {}),
        dueDate: input.dueDate,
        totalMarks: Number(input.totalMarks),
      }),
    summarize: async (input) => ({
      toolName: "create_assignment",
      title: "Create assignment",
      description: "This will create a new assignment for your students.",
      fields: [
        { label: "Title", value: String(input.title ?? "") },
        ...(input.description
          ? [{ label: "Description", value: String(input.description) }]
          : []),
        { label: "Due date", value: String(input.dueDate ?? "") },
        {
          label: "Total marks",
          value: String(input.totalMarks ?? ""),
          editable: true,
          key: "totalMarks",
        },
      ],
      confirmLabel: "Create assignment",
    }),
  },
];

// ─── System prompt ───────────────────────────────────────────────────────────

export function lecturerSystemPrompt(): string {
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

## Performing actions
You can perform actions, not only answer questions. Available actions: recording class attendance (mark_class_attendance), grading a submission (grade_submission), and creating an assignment (create_assignment).
- Before marking attendance, call list_class_students to get every student's ID. Before grading, call list_submissions_for_assignment to get the submission ID. Never invent or guess an ID.
- Clearly state what you are about to do before calling an action tool.
- Call at most one action tool per turn.
- Every action is shown to the teacher for explicit confirmation before it runs — you do not need to ask "are you sure"; the confirmation card handles that.
- Internal IDs are for tool calls only — never show them in your replies.

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;
}

// ─── Chat route config ───────────────────────────────────────────────────────

export const lecturerChatConfig: ChatAgentConfig = {
  name: "lecturer-chat",
  requiredRole: "lecturer",
  model: MODELS.haiku,
  rateLimitMax: 30,
  maxMessages: 20,
  maxMessageLength: 2000,
  scrubKeepIds: true, // write tools need student / submission / class IDs
  includeToolMeta: false,
  tools: lecturerTools,
  buildSystemPrompt: lecturerSystemPrompt,
};
