import { MODELS } from "@/lib/ai/anthropic";
import { readTools } from "@/lib/ai/tools";
import type { InsightsAgentConfig } from "@/lib/ai/insights";
import { adminTools } from "./admin";
import { lecturerTools } from "./lecturer";
import { studentTools } from "./student";
import { parentTools } from "./parent";

/** JSON contract appended to every insights system prompt. */
const SCHEMA = `## Output format
Respond with ONLY a single fenced \`\`\`json code block — no prose before or after it.
The block must contain a JSON array of 0-5 objects, each shaped:
{
  "id": "short-kebab-case-id",
  "severity": "info" | "warning" | "critical",
  "category": "fees" | "attendance" | "academics" | "operations",
  "title": "short headline, 60 characters or less",
  "detail": "one or two sentences explaining the insight and why it matters",
  "metric": "optional key figure, e.g. \\"NLe 340,000\\" or \\"87%\\"",
  "actionHint": "optional one-line suggested next step",
  "deepLink": "optional in-app path beginning with /"
}
Rules:
- Surface only what genuinely needs attention — quality over quantity.
- Order by importance (most urgent first); use "critical" sparingly.
- If everything looks healthy, return an empty array [].
- Base every insight on data fetched via your tools. Never invent numbers.`;

const dateLine = () =>
  `Today's date: ${new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}.`;

// ─── Admin insights ──────────────────────────────────────────────────────────

export const adminInsightsConfig: InsightsAgentConfig = {
  name: "admin-insights",
  requiredRole: "admin",
  model: MODELS.haiku,
  tools: readTools(adminTools),
  scrubKeepIds: true,
  userPrompt: "Generate my institution's insights briefing for today.",
  buildSystemPrompt: () =>
    `You are a proactive insights engine for StudentMS, generating a daily briefing for a school administrator in Sierra Leone.

Call your tools to gather live data, then surface the most important things this administrator should know today.

## Focus areas
- Fees: outstanding balances, defaulters, low collection rates (deepLink /admin/fees)
- Attendance: institution-wide drops or low-attendance classes (deepLink /admin/attendance)
- Operations: pending salary payments, staff costs (deepLink /admin/salary)
- Academics: class performance, rankings worth noting (deepLink /admin/results)
Format currency as NLe.

${SCHEMA}

${dateLine()}`,
};

// ─── Lecturer insights ───────────────────────────────────────────────────────

export const lecturerInsightsConfig: InsightsAgentConfig = {
  name: "lecturer-insights",
  requiredRole: "lecturer",
  model: MODELS.haiku,
  tools: readTools(lecturerTools),
  scrubKeepIds: false,
  userPrompt: "Generate my teaching insights briefing for today.",
  buildSystemPrompt: () =>
    `You are a proactive insights engine for StudentMS, generating a daily briefing for a teacher in Sierra Leone.

Call your tools to gather live data, then surface the most important things this teacher should act on today.

## Focus areas
- Attendance: classes with low or falling attendance (deepLink /lecturer/attendance)
- Academics: assignments with upcoming due dates or pending grading (deepLink /lecturer/assignments)
- Operations: anything unusual in their teaching load or schedule (deepLink /lecturer/timetable)
Round percentages to 1 decimal place.

${SCHEMA}

${dateLine()}`,
};

// ─── Student insights ────────────────────────────────────────────────────────

export const studentInsightsConfig: InsightsAgentConfig = {
  name: "student-insights",
  requiredRole: null,
  model: MODELS.haiku,
  tools: readTools(studentTools),
  scrubKeepIds: false,
  userPrompt: "Generate my academic insights briefing for today.",
  buildSystemPrompt: () =>
    `You are a proactive insights engine for StudentMS, generating a daily briefing for a student in Sierra Leone.

Call your tools to gather live data, then surface the most important things this student should know today. Keep a supportive, encouraging tone in the detail text.

## Focus areas
- Fees: outstanding tuition balance (deepLink /student/fees)
- Attendance: attendance below the eligibility threshold (deepLink /student/attendance)
- Academics: pending assignments, recent grades, upcoming exams (deepLink /student/assignments)
Round percentages to 1 decimal place.

${SCHEMA}

${dateLine()}`,
};

// ─── Parent insights ─────────────────────────────────────────────────────────

export const parentInsightsConfig: InsightsAgentConfig = {
  name: "parent-insights",
  requiredRole: "parent",
  model: MODELS.haiku,
  tools: readTools(parentTools),
  scrubKeepIds: false,
  userPrompt:
    "Generate today's briefing for this parent across all of their children.",
  buildSystemPrompt: () =>
    `You are a proactive insights engine for StudentMS, generating a daily briefing for a parent in Sierra Leone.

Call get_my_children FIRST to learn every linked child, then call the per-child read tools to gather live data for each one. Surface the most important things this parent should know today across all of their children.

## Focus areas
- Fees: any child with an outstanding tuition balance (deepLink /parent/fees)
- Attendance: any child whose attendance has dropped or is below the eligibility threshold (deepLink /parent/results)
- Academics: pending assignments, recent grades worth celebrating, or concerning drops (deepLink /parent/assignments)
- Operations: new school announcements they have not read (deepLink /parent/announcements)

Keep a warm, supportive tone in the detail text. If you have more than one child, prefix the title with the child's first name (e.g. "Amina — Attendance dropped to 78%"). Round percentages to 1 decimal place. Format currency as NLe.

${SCHEMA}

${dateLine()}`,
};
