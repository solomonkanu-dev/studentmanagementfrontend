import type { Role } from "@/lib/types";

export interface IntroStep {
  element?: string;
  title?: string;
  intro: string;
  position?: "top" | "bottom" | "left" | "right" | "floating";
  tooltipClass?: string;
}

const sharedSteps: IntroStep[] = [
  {
    element: "#sidebar",
    title: "Navigation Sidebar",
    intro:
      "This is your main navigation panel. Use it to move between all sections of the platform. On mobile, tap the menu icon in the header to open it.",
    position: "right",
  },
  {
    element: "#app-header",
    title: "Top Bar",
    intro:
      "The header gives you quick access to notifications (bell icon), dark mode toggle, and your profile menu for photo uploads and account options.",
    position: "bottom",
  },
];

const adminSteps: IntroStep[] = [
  {
    title: "Welcome to EduPulse!",
    intro:
      "Let's get your school set up. Follow this tour to learn the correct order for adding your school data — it matters!",
    position: "floating",
  },
  ...sharedSteps,
  {
    element: "#nav-teachers",
    title: "Step 1 of 4 — Add Teachers",
    intro:
      "<strong>Start here.</strong> Create your teachers before anything else.<br><br>Every class needs an assigned teacher, so this is always the first step.<br><br>Click <strong>Teachers</strong> in the sidebar to get started.",
    position: "right",
  },
  {
    element: "#nav-classes",
    title: "Step 2 of 4 — Create Classes",
    intro:
      "<strong>Classes come second.</strong> Once you have at least one teacher, create your classes or forms here.<br><br>A class teacher must be assigned from your existing teachers.<br><br>Click <strong>Classes</strong> in the sidebar.",
    position: "right",
  },
  {
    element: "#nav-students",
    title: "Step 3 of 4 — Enrol Students",
    intro:
      "<strong>Students come third.</strong> With classes in place, you can now add and enrol students.<br><br>Each student is assigned to a class — so classes must exist first.<br><br>Click <strong>Students</strong> in the sidebar.",
    position: "right",
  },
  {
    element: "#nav-subjects",
    title: "Step 4 of 4 — Add Subjects",
    intro:
      "<strong>Subjects come last.</strong> Subjects are linked to specific classes, so this step comes after your classes are set up.<br><br>Click <strong>Subjects</strong> in the sidebar.",
    position: "right",
  },
  {
    title: "You&rsquo;re all set!",
    intro:
      "The correct order is:<br><br><strong>1. Teachers → 2. Classes → 3. Students → 4. Subjects</strong><br><br>Your dashboard is ready. Explore fees, assignments, results, and more from the sidebar.",
    position: "floating",
  },
];

const lecturerSteps: IntroStep[] = [
  {
    title: "Welcome, Lecturer!",
    intro:
      "Welcome to your teaching dashboard. This tour will show you the key areas to help you manage your classes and students.",
    position: "floating",
  },
  ...sharedSteps,
  {
    title: "Your Dashboard",
    intro:
      "Your dashboard shows your subjects, classes, assignments created, and today's attendance count — all in one view.",
    position: "floating",
  },
  {
    title: "Assignments & Attendance",
    intro:
      "Use the Assignments link in the sidebar to create and grade work for your students. Use Attendance to record daily presence by subject.",
    position: "floating",
  },
];

const studentSteps: IntroStep[] = [
  {
    title: "Welcome, Student!",
    intro:
      "Welcome to your student portal. This tour will help you get familiar with everything available to you.",
    position: "floating",
  },
  ...sharedSteps,
  {
    title: "Your Dashboard",
    intro:
      "Your dashboard shows your enrolled subjects, assignment submissions, overall attendance percentage, and completed work count.",
    position: "floating",
  },
  {
    title: "Key Sections",
    intro:
      "Check Assignments for pending and submitted work. Visit Fees to view your balance and payment history. Documents holds any files issued by your school.",
    position: "floating",
  },
];

const parentSteps: IntroStep[] = [
  {
    title: "Welcome to the Parent Portal!",
    intro:
      "Welcome! This portal lets you monitor your child's academic progress, attendance, and fees.",
    position: "floating",
  },
  ...sharedSteps,
  {
    title: "Parent Dashboard",
    intro:
      "Here you can view your child's attendance records, exam results, and fee balance — all in read-only mode.",
    position: "floating",
  },
  {
    title: "Multiple Children",
    intro:
      "If you have more than one child linked to your account, use the selector at the top of the dashboard to switch between them.",
    position: "floating",
  },
];

const superAdminSteps: IntroStep[] = [
  {
    title: "Welcome, Super Admin!",
    intro:
      "Welcome to the platform control centre. This tour will walk you through the key areas of system management.",
    position: "floating",
  },
  ...sharedSteps,
  {
    title: "Platform KPIs",
    intro:
      "The stat cards at the top show platform-wide totals: active institutes, admins, teachers, and students across all schools.",
    position: "floating",
  },
  {
    title: "Platform Analytics",
    intro:
      "Scroll down to see growth trends, fee revenue by institute, salary expenditure breakdowns, and admin approval rates across the entire platform.",
    position: "floating",
  },
  {
    title: "Admin Approvals",
    intro:
      "Pending admin registration requests appear at the bottom of this page. You can also reach them via the Admins link in the sidebar.",
    position: "floating",
  },
];

export const INTRO_STEPS_BY_ROLE: Partial<Record<Role, IntroStep[]>> = {
  admin: adminSteps,
  lecturer: lecturerSteps,
  student: studentSteps,
  parent: parentSteps,
  super_admin: superAdminSteps,
};
