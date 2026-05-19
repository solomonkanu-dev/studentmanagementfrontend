/**
 * Per-role AI metadata — shared by the floating chat widget and the dedicated
 * AI Agent page so they never drift apart.
 *
 * The two surfaces are deliberately different:
 * - the floating widget is a read-only "quick chat" helper, and
 * - the AI Agent page is the action-capable agent (writes, with confirmation).
 */
export type AIAgentRole = "admin" | "lecturer" | "student";

export interface AIAgentMeta {
  /** AI route both surfaces POST to. */
  endpoint: string;

  // ── Floating widget (quick chat) ──────────────────────────────────────────
  title: string;
  subtitle: string;
  intro: string;
  suggestedPrompts: string[];
  placeholder: string;
  /** Used in widget aria-labels, e.g. "admin assistant". */
  ariaName: string;
  accent: "primary" | "meta-5";

  // ── AI Agent page (action-capable) ────────────────────────────────────────
  agentIntro: string;
  agentPrompts: string[];
  /** "What it can do" — the capability list shown on the AI Agent page. */
  capabilities: string[];
  /** Whether any capability performs a write action (needs confirmation). */
  confirmsActions: boolean;
}

export const AI_AGENTS: Record<AIAgentRole, AIAgentMeta> = {
  admin: {
    endpoint: "/api/ai/admin-chat",
    title: "Admin Assistant",
    subtitle: "Quick chat · read-only",
    ariaName: "admin assistant",
    accent: "primary",
    placeholder: "Ask a quick question…",
    intro:
      "Hi! I'm your quick-chat assistant. Ask me anything about your institution's fees, attendance, enrolment, salary or results. To perform actions, open the AI Agent from the sidebar.",
    suggestedPrompts: [
      "Give me an overview of my institution",
      "What is our fee collection rate?",
      "Which students have outstanding fees?",
      "How is student attendance this month?",
    ],
    agentIntro:
      "Hi! I'm your AI Agent. I can answer questions about your institution using live data — and I can also take actions for you. Just ask, and I'll confirm anything before it happens.",
    agentPrompts: [
      "Post an announcement about the mid-term break",
      "Record a fee payment for a student",
      "Which students have outstanding fees?",
      "Give me a full overview of my institution",
    ],
    capabilities: [
      "Post announcements to your institution",
      "Record fee payments for students",
      "Report on fees, collection rates and defaulters",
      "Summarise attendance, enrolment and results",
      "Look up salaries, timetables, parents and class rankings",
    ],
    confirmsActions: true,
  },
  lecturer: {
    endpoint: "/api/ai/lecturer-chat",
    title: "Teaching Assistant",
    subtitle: "Quick chat · read-only",
    ariaName: "teaching assistant",
    accent: "meta-5",
    placeholder: "Ask a quick question…",
    intro:
      "Hi! I'm your quick-chat assistant. Ask me anything about your subjects, classes, attendance, assignments or salary. To perform actions, open the AI Agent from the sidebar.",
    suggestedPrompts: [
      "Which subjects am I teaching?",
      "How is attendance looking in my classes?",
      "What assignments have I set?",
      "Show me my salary records",
    ],
    agentIntro:
      "Hi! I'm your AI Agent. I can answer questions about your classes — and I can also mark attendance, grade submissions and create assignments for you. I'll confirm anything before it happens.",
    agentPrompts: [
      "Mark today's attendance for one of my classes",
      "Grade a submission for one of my assignments",
      "Create a new assignment",
      "How is attendance looking in my classes?",
    ],
    capabilities: [
      "Mark attendance for your classes",
      "Grade student submissions",
      "Create new assignments",
      "Review your subjects, classes and assignment list",
      "Check class attendance and student performance",
    ],
    confirmsActions: true,
  },
  student: {
    endpoint: "/api/ai/student-chat",
    title: "Academic Assistant",
    subtitle: "Quick chat",
    ariaName: "academic assistant",
    accent: "primary",
    placeholder: "Ask a quick question…",
    intro:
      "Hi! I'm your quick-chat assistant. Ask me anything about your attendance, grades, fees, assignments or class ranking.",
    suggestedPrompts: [
      "What's my attendance rate?",
      "How are my grades looking?",
      "Do I have any outstanding fees?",
      "What's my class ranking?",
    ],
    agentIntro:
      "Hi! I'm your AI Agent. Ask me anything about your academic record — grades, attendance, fees, assignments and ranking — and I'll explain it using your live data.",
    agentPrompts: [
      "How are my grades looking this term?",
      "Is my attendance high enough?",
      "Do I have any pending assignments?",
      "What's my class ranking?",
    ],
    capabilities: [
      "Check your grades and exam results",
      "Track your attendance and eligibility",
      "See your fee balance and payments",
      "Review your assignments and submissions",
      "Find your class ranking and timetable",
    ],
    confirmsActions: false,
  },
};
