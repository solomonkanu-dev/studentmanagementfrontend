"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  GraduationCap,
  BarChart3,
  Users,
  BookOpen,
  ClipboardList,
  Shield,
  Bell,
  CreditCard,
  CalendarCheck,
  FileText,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Globe,
  Menu,
  X,
  Bot,
  Sparkles,
  MessageCircle,
  Send,
} from "lucide-react";

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(36px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Stat counter ─────────────────────────────────────────────────────────────

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, visible } = useReveal();

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = target / 60;
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(t);
  }, [visible, target]);

  return (
    <span ref={ref}>
      {val.toLocaleString()}{suffix}
    </span>
  );
}

// ─── Dashboard mockup ─────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto animate-float-slow" style={{ filter: "drop-shadow(0 40px 80px rgba(60,80,224,0.35))" }}>
      {/* Main card */}
      <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl overflow-hidden ring-1 ring-white/30">
        {/* Header bar */}
        <div className="flex items-center gap-2 bg-white/10 px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
          <div className="ml-3 h-4 w-40 rounded-full bg-white/20" />
        </div>

        <div className="flex gap-3 p-4">
          {/* Sidebar strip */}
          <div className="flex flex-col gap-2.5 w-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`h-2 rounded-full ${i === 0 ? "bg-white/80 w-8" : "bg-white/25 w-6"}`} />
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Students", val: "1,248", color: "from-blue-400/40 to-blue-500/40" },
                { label: "Teachers", val: "64", color: "from-violet-400/40 to-violet-500/40" },
                { label: "Classes", val: "18", color: "from-emerald-400/40 to-emerald-500/40" },
              ].map(({ label, val, color }) => (
                <div key={label} className={`rounded-xl bg-gradient-to-br p-2.5 ${color}`}>
                  <p className="text-[9px] font-medium text-white/70">{label}</p>
                  <p className="text-sm font-bold text-white">{val}</p>
                </div>
              ))}
            </div>

            {/* Chart placeholder */}
            <div className="rounded-xl bg-white/10 p-3">
              <div className="mb-2 h-2 w-24 rounded bg-white/30" />
              <div className="flex items-end gap-1 h-14">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 68].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-400/60 to-violet-400/60"
                    style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }}
                  />
                ))}
              </div>
            </div>

            {/* Table rows */}
            <div className="space-y-1.5">
              {[
                { name: "James Okon", status: "Active", grade: "A" },
                { name: "Amaka Nwosu", status: "Active", grade: "B+" },
                { name: "Emeka Adeyemi", status: "Active", grade: "A-" },
              ].map(({ name, grade }) => (
                <div key={name} className="flex items-center gap-2 rounded-lg bg-white/8 px-2 py-1.5">
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400/60 to-violet-400/60 flex items-center justify-center text-[8px] font-bold text-white">
                    {name[0]}
                  </div>
                  <div className="flex-1 h-2 w-16 rounded bg-white/25" />
                  <span className="text-[9px] font-bold text-emerald-300">{grade}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating cards */}
      <div className="absolute -left-10 top-10 animate-drift" style={{ animationDelay: "0.5s" }}>
        <div className="rounded-xl bg-white px-3 py-2 shadow-xl ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-800">Payment Received</p>
              <p className="text-[9px] text-gray-500">NLe 45,000 · just now</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-8 bottom-14 animate-drift" style={{ animationDelay: "1.2s" }}>
        <div className="rounded-xl bg-white px-3 py-2 shadow-xl ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <Bell className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-800">Result Published</p>
              <p className="text-[9px] text-gray-500">Mathematics · Grade A</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-6 top-8 animate-drift" style={{ animationDelay: "0.8s" }}>
        <div className="rounded-xl bg-white px-3 py-2 shadow-xl ring-1 ring-black/5">
          <p className="text-[10px] font-semibold text-gray-800">Attendance</p>
          <div className="mt-1 flex gap-0.5">
            {[1,1,1,1,0,1,1,1,1,1].map((p, i) => (
              <div key={i} className={`h-2 w-2 rounded-sm ${p ? "bg-primary" : "bg-gray-200"}`} />
            ))}
          </div>
          <p className="mt-0.5 text-[9px] text-gray-500">90% this term</p>
        </div>
      </div>
    </div>
  );
}

// ─── Features data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Student Management",
    desc: "Full student lifecycle — enrolment, profiles, promotions, alumni status, and document generation.",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: BarChart3,
    title: "Results & Grading",
    desc: "Assign marks, auto-calculate grades, generate report cards with rankings and performance analytics.",
    color: "from-violet-500 to-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Users,
    title: "Staff & Lecturers",
    desc: "Manage lecturer profiles, class assignments, salary records and performance tracking.",
    color: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: CreditCard,
    title: "Fee Management",
    desc: "Assign fee structures, record payments, issue receipts and track outstanding balances by class or student.",
    color: "from-orange-500 to-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: CalendarCheck,
    title: "Attendance Tracking",
    desc: "Mark daily attendance per subject, monitor trends and automatically alert students below 75%.",
    color: "from-pink-500 to-pink-600",
    bg: "bg-pink-50",
  },
  {
    icon: Bell,
    title: "Email Notifications",
    desc: "Automated emails for fee receipts, results, assignments, and attendance alerts via your own SMTP.",
    color: "from-cyan-500 to-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    icon: FileText,
    title: "Official Documents",
    desc: "Generate branded PDFs — Admission Letters, Transfer Certificates, Attestation Letters and ID Cards.",
    color: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    icon: ClipboardList,
    title: "Assignments",
    desc: "Create assignments, set due dates, track submissions and notify students automatically.",
    color: "from-teal-500 to-teal-600",
    bg: "bg-teal-50",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    desc: "Super Admin, Admin, Teacher, Student and Parent roles each with tailored dashboards and permissions.",
    color: "from-slate-600 to-slate-700",
    bg: "bg-slate-50",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    desc: "Built-in AI chat for every role — admins query live data, teachers get insights, students ask about results and fees.",
    color: "from-fuchsia-500 to-purple-600",
    bg: "bg-fuchsia-50",
  },
];

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    title: "Request Admin Access",
    desc: "Submit your institution's details. Your account is reviewed and approved by a super admin.",
    icon: Globe,
  },
  {
    n: "02",
    title: "Set Up Your Institution",
    desc: "Add classes, subjects, fee structures, lecturers and students — all from one dashboard.",
    icon: Zap,
  },
  {
    n: "03",
    title: "Everything Runs Smoothly",
    desc: "Manage daily operations — attendance, results, payments, documents — while stakeholders stay informed.",
    icon: CheckCircle,
  },
];

// ─── Roles ────────────────────────────────────────────────────────────────────

const ROLES = [
  {
    role: "Admin",
    emoji: "🏫",
    color: "border-blue-200 bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    perks: [
      "Full institution control",
      "Manage students & lecturers",
      "Fee & salary management",
      "Generate reports & documents",
      "Audit logs & notifications",
    ],
  },
  {
    role: "Teacher",
    emoji: "👨‍🏫",
    color: "border-violet-200 bg-violet-50",
    badge: "bg-violet-100 text-violet-700",
    perks: [
      "View assigned classes",
      "Mark attendance",
      "Publish results & grades",
      "Create & manage assignments",
      "View salary slips",
    ],
  },
  {
    role: "Student",
    emoji: "🎓",
    color: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    perks: [
      "View results & report cards",
      "Track attendance",
      "Download official documents",
      "View fee status & receipts",
      "Receive email notifications",
    ],
  },
  {
    role: "Parent",
    emoji: "👨‍👩‍👧",
    color: "border-orange-200 bg-orange-50",
    badge: "bg-orange-100 text-orange-700",
    perks: [
      "Monitor child's results",
      "Track attendance records",
      "View fee balances",
      "Receive announcements",
      "Linked to multiple children",
    ],
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: "Mr. Abu Bangura",
    role: "School Principal, Freetown",
    text: "EduPulse transformed how we manage our 1,200 students. The report card generation alone saves us 3 days every term.",
    stars: 5,
  },
  {
    name: "Mrs. Aminata Koroma",
    role: "Admin Officer, Bo",
    text: "Fee tracking used to be a nightmare. Now we see exactly who has paid, who owes, and receipts go out automatically.",
    stars: 5,
  },
  {
    name: "Mr. Ibrahim Sesay",
    role: "Head of Academics, Kenema",
    text: "Teachers adapted in one day. Marking attendance and publishing results is now a 2-minute job per class.",
    stars: 5,
  },
];

// ─── Ticker items ─────────────────────────────────────────────────────────────

const TICKER = [
  "Student Enrolment", "Fee Management", "Results & Grading", "Attendance Tracking",
  "Document Generation", "Email Notifications", "Role-Based Access", "Salary Management",
  "Assignment Tracking", "Parent Portal", "Analytics Dashboard", "Audit Logs", "AI Assistant",
];

// ─── AI Chat Mockup ───────────────────────────────────────────────────────────

const AI_MESSAGES = [
  {
    role: "Admin",
    color: "bg-blue-500",
    question: "How many students haven't paid fees this term?",
    answer: "15 students have outstanding balances totalling NLe 45,000. Class 3B has the highest default rate at 40%.",
    delay: 0,
  },
  {
    role: "Teacher",
    color: "bg-violet-500",
    question: "What's the average grade for Form 2A in Maths?",
    answer: "Class average is 72.4%. Top performer is Abu Bangura with 94%. 3 students are below the pass threshold.",
    delay: 0.6,
  },
  {
    role: "Student",
    color: "bg-emerald-500",
    question: "What is my attendance rate this term?",
    answer: "Your attendance is 87% — 26 days present, 4 absent. You need 75% minimum to sit exams. You're good!",
    delay: 1.2,
  },
];

function AIChatMockup() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((v) => (v + 1) % AI_MESSAGES.length), 3500);
    return () => clearInterval(t);
  }, []);

  const msg = AI_MESSAGES[active];

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-fuchsia-500/30 to-purple-600/30 blur-3xl" />

      <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden ring-1 ring-white/15">
        {/* Title bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">EduPulse AI</p>
            <p className="text-[10px] text-white/50">Always available · Role-aware</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Online
          </span>
        </div>

        {/* Chat area */}
        <div className="space-y-4 p-5 min-h-[220px]">
          {/* Role indicator */}
          <div
            key={active + "-role"}
            className="flex items-center gap-2"
            style={{ animation: "fade-in 0.4s ease" }}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-full ${msg.color} text-[10px] font-bold text-white`}>
              {msg.role[0]}
            </div>
            <span className="text-[11px] font-medium text-white/50">{msg.role}</span>
          </div>

          {/* User question bubble */}
          <div
            key={active + "-q"}
            className="flex justify-end"
            style={{ animation: "fade-in 0.4s ease 0.1s both" }}
          >
            <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-white/15 px-4 py-2.5">
              <p className="text-sm text-white">{msg.question}</p>
            </div>
          </div>

          {/* AI response */}
          <div
            key={active + "-a"}
            className="flex items-start gap-2.5"
            style={{ animation: "fade-in 0.5s ease 0.5s both" }}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 px-4 py-2.5 ring-1 ring-white/10">
              <p className="text-sm leading-relaxed text-white/90">{msg.answer}</p>
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
          <input
            readOnly
            value="Ask anything about your school…"
            className="flex-1 bg-transparent text-sm text-white/30 outline-none"
          />
          <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg transition-transform hover:scale-105">
            <Send className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Role tab dots */}
      <div className="mt-4 flex justify-center gap-2">
        {AI_MESSAGES.map((m, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-fuchsia-400" : "w-1.5 bg-white/20"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 shadow-sm backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <svg width="36" height="36" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <rect x="0" y="0" width="80" height="80" rx="20" fill="#0F6E56"/>
            <polyline points="12,40 24,40 32,24 40,56 48,32 56,46 62,40 68,40" fill="none" stroke="#5DCAA5" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="48" cy="32" r="4" fill="#9FE1CB"/>
          </svg>
          <span className={`text-lg font-bold transition-colors ${scrolled ? "text-black" : "text-white"}`}>
            Edu<span style={{ color: "#5DCAA5" }}>Pulse</span>
          </span>
        </div>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {["Features", "AI Assistant", "How It Works", "Roles", "Testimonials"].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, "-")}`}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                scrolled ? "text-gray-600" : "text-white/80"
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              scrolled ? "text-gray-600" : "text-white/80"
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/admin-request"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className={`md:hidden transition-colors ${scrolled ? "text-gray-700" : "text-white"}`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-stroke px-6 py-4 shadow-lg space-y-4">
          {["Features", "AI Assistant", "How It Works", "Roles", "Testimonials"].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, "-")}`}
              className="block text-sm font-medium text-gray-700 hover:text-primary"
              onClick={() => setOpen(false)}
            >
              {label}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            <Link href="/login" className="flex-1 rounded-xl border border-stroke py-2 text-center text-sm font-medium text-gray-700">
              Sign in
            </Link>
            <Link href="/admin-request" className="flex-1 rounded-xl bg-primary py-2 text-center text-sm font-semibold text-white">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect logged-in users straight to their dashboard
  useEffect(() => {
    if (isLoading || !user) return;
    const map: Record<string, string> = {
      admin: "/admin",
      lecturer: "/lecturer",
      student: "/student",
      super_admin: "/super-admin",
      parent: "/parent",
    };
    router.replace(map[user.role] ?? "/login");
  }, [user, isLoading, router]);

  return (
    <div className="overflow-x-hidden bg-white font-sans">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 45%, #3730a3 75%, #4c1d95 100%)" }}
      >
        {/* Animated blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-10%] top-[15%] h-96 w-96 animate-drift rounded-full bg-blue-600/20 blur-3xl" style={{ animationDelay: "0s" }} />
          <div className="absolute right-[-5%] top-[20%] h-80 w-80 animate-drift rounded-full bg-violet-600/25 blur-3xl" style={{ animationDelay: "2s" }} />
          <div className="absolute bottom-[10%] left-[30%] h-72 w-72 animate-drift rounded-full bg-indigo-500/20 blur-3xl" style={{ animationDelay: "1s" }} />
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          {/* Text */}
          <div>
            {/* Badge */}
            <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              Smart School Management · Now with AI Assistant
            </div>

            <h1
              className="animate-fade-up text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "0.1s" }}
            >
              Smart school
              <br />
              <span
                className="animate-shimmer bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(90deg, #a5b4fc, #818cf8, #c4b5fd, #818cf8, #a5b4fc)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                }}
              >
                management
              </span>
              <br />
              powered by AI.
            </h1>

            <p
              className="animate-fade-up mt-6 max-w-lg text-lg leading-relaxed text-white/65"
              style={{ animationDelay: "0.25s" }}
            >
              EduPulse is the smart way to run your school — enrolment, results,
              fees, attendance, assignments, documents and a built-in AI assistant.
              One platform. Every role. Sierra Leone.
            </p>

            <div
              className="animate-fade-up mt-8 flex flex-wrap gap-4"
              style={{ animationDelay: "0.4s" }}
            >
              <Link
                href="/admin-request"
                className="group flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-primary shadow-xl shadow-black/20 transition-all hover:shadow-2xl hover:scale-105"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Sign In
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Social proof */}
            <div
              className="animate-fade-up mt-10 flex items-center gap-4"
              style={{ animationDelay: "0.55s" }}
            >
              <div className="flex -space-x-2">
                {["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ec4899"].map((c, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: c }}
                  >
                    {["JO","AK","EM","FK","BI"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                </div>
                <p className="text-xs text-white/60 mt-0.5">Trusted by 500+ institutions</p>
              </div>
            </div>
          </div>

          {/* Mockup */}
          <div className="animate-fade-in flex justify-center" style={{ animationDelay: "0.3s" }}>
            <DashboardMockup />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-bounce">
          <p className="text-xs text-white/40">Scroll to explore</p>
          <div className="h-5 w-3 rounded-full border border-white/30 flex justify-center pt-1">
            <div className="h-1.5 w-0.5 rounded-full bg-white/60" />
          </div>
        </div>
      </section>

      {/* ── Ticker ────────────────────────────────────────────────────────── */}
      <div className="border-y border-stroke bg-gray-50 py-3 overflow-hidden">
        <div className="animate-ticker flex whitespace-nowrap gap-0" style={{ width: "max-content" }}>
          {[...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-6 text-sm font-medium text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { label: "Students Managed", target: 10000, suffix: "+" },
              { label: "Institutions", target: 500, suffix: "+" },
              { label: "Documents Generated", target: 25000, suffix: "+" },
              { label: "Uptime", target: 99, suffix: ".9%" },
            ].map(({ label, target, suffix }, i) => (
              <Reveal key={label} delay={i * 0.1} className="text-center">
                <p className="text-4xl font-extrabold text-black sm:text-5xl">
                  <Counter target={target} suffix={suffix} />
                </p>
                <p className="mt-2 text-sm text-body">{label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="text-center mb-16">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-4">
              Everything You Need
            </span>
            <h2 className="text-3xl font-extrabold text-black sm:text-4xl">
              A complete toolkit for modern schools
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-body">
              Every feature you need to run a school efficiently — no separate tools, no integrations required.
            </p>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
              <Reveal key={title} delay={Math.min(i * 0.08, 0.5)}>
                <div className="group flex flex-col gap-4 rounded-2xl border border-stroke bg-white p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color} shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-black">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-body">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Assistant ──────────────────────────────────────────────────── */}
      <section id="ai-assistant" className="py-24 overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #2e1065 100%)" }}>
        {/* Blobs */}
        <div className="pointer-events-none absolute left-[-10%] h-96 w-96 animate-drift rounded-full bg-fuchsia-600/15 blur-3xl" />
        <div className="pointer-events-none absolute right-[-5%] h-80 w-80 animate-drift rounded-full bg-purple-600/20 blur-3xl" style={{ animationDelay: "1.5s" }} />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            {/* Text side */}
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-1.5 text-xs font-semibold text-fuchsia-300 mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Powered by Claude AI
              </span>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl leading-tight">
                Your school has its own
                <br />
                <span className="bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                  AI assistant
                </span>
              </h2>
              <p className="mt-5 text-lg text-white/60 leading-relaxed max-w-lg">
                Every role gets a context-aware AI that knows your live school data — no copy-paste, no switching tabs.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: Bot,
                    title: "Admin AI — Data on demand",
                    desc: "Query fee collection rates, attendance trends, student performance and more in plain English.",
                    color: "text-blue-400",
                    bg: "bg-blue-400/10",
                  },
                  {
                    icon: MessageCircle,
                    title: "Teacher AI — Class insights",
                    desc: "Ask about class averages, struggling students, or assignment submission rates instantly.",
                    color: "text-violet-400",
                    bg: "bg-violet-400/10",
                  },
                  {
                    icon: GraduationCap,
                    title: "Student AI — Personal guide",
                    desc: "Students can ask about results, attendance, fees, or upcoming deadlines at any time.",
                    color: "text-emerald-400",
                    bg: "bg-emerald-400/10",
                  },
                ].map(({ icon: Icon, title, desc, color, bg }) => (
                  <div key={title} className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-white/50">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Chat mockup side */}
            <Reveal delay={0.2}>
              <AIChatMockup />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="text-center mb-16">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-4">
              Simple Onboarding
            </span>
            <h2 className="text-3xl font-extrabold text-black sm:text-4xl">
              Up and running in minutes
            </h2>
          </Reveal>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Connector line */}
            <div className="absolute top-16 left-[16%] right-[16%] hidden h-px bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 md:block" />

            {STEPS.map(({ n, title, desc, icon: Icon }, i) => (
              <Reveal key={n} delay={i * 0.15}>
                <div className="relative flex flex-col items-center text-center px-4">
                  <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/30">
                    <Icon className="h-7 w-7 text-white" />
                    <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-primary shadow-md ring-2 ring-primary/20">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-black">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-body">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ─────────────────────────────────────────────────────────── */}
      <section id="roles" className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="text-center mb-16">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-4">
              Built for Every Role
            </span>
            <h2 className="text-3xl font-extrabold text-black sm:text-4xl">
              Tailored dashboards for everyone
            </h2>
            <p className="mt-4 text-body max-w-lg mx-auto">
              Each user type gets a purpose-built experience with exactly what they need.
            </p>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {ROLES.map(({ role, emoji, color, badge, perks }, i) => (
              <Reveal key={role} delay={i * 0.1}>
                <div className={`flex flex-col rounded-2xl border ${color} p-6 h-full`}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-3xl">{emoji}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge}`}>
                      {role}
                    </span>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {perks.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="text-center mb-16">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-4">
              Testimonials
            </span>
            <h2 className="text-3xl font-extrabold text-black sm:text-4xl">
              Schools love EduPulse
            </h2>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map(({ name, role, text, stars }, i) => (
              <Reveal key={name} delay={i * 0.15}>
                <div className="flex flex-col gap-4 rounded-2xl border border-stroke bg-white p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="flex text-yellow-400">
                    {[...Array(stars)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-gray-700">&quot;{text}&quot;</p>
                  <div className="flex items-center gap-3 border-t border-stroke pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">{name}</p>
                      <p className="text-xs text-body">{role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <Reveal>
          <div
            className="mx-auto max-w-4xl rounded-3xl p-12 text-center overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3c50e0 50%, #6d28d9 100%)" }}
          >
            {/* Blobs */}
            <div className="absolute left-[-40px] top-[-40px] h-48 w-48 animate-drift rounded-full bg-white/10 blur-2xl" />
            <div className="absolute right-[-40px] bottom-[-40px] h-56 w-56 animate-drift rounded-full bg-violet-300/20 blur-2xl" style={{ animationDelay: "1.5s" }} />

            <div className="relative z-10">
              <div className="mb-4 inline-flex items-center justify-center">
                <svg width="56" height="56" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="0" width="80" height="80" rx="20" fill="rgba(255,255,255,0.15)"/>
                  <polyline points="12,40 24,40 32,24 40,56 48,32 56,46 62,40 68,40" fill="none" stroke="#9FE1CB" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="48" cy="32" r="4" fill="#E1F5EE"/>
                </svg>
              </div>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Ready to modernise your school?
              </h2>
              <p className="mt-4 text-white/70 max-w-lg mx-auto">
                Join hundreds of institutions already using EduPulse. Request admin access today — setup takes less than 10 minutes.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/admin-request"
                  className="group flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-primary shadow-xl transition-all hover:scale-105"
                >
                  Request Access
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-stroke bg-gray-50 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <svg width="36" height="36" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <rect x="0" y="0" width="80" height="80" rx="20" fill="#0F6E56"/>
                <polyline points="12,40 24,40 32,24 40,56 48,32 56,46 62,40 68,40" fill="none" stroke="#5DCAA5" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="48" cy="32" r="4" fill="#9FE1CB"/>
              </svg>
              <span className="text-lg font-bold text-black">
                Edu<span style={{ color: "#1D9E75" }}>Pulse</span>
              </span>
            </div>
            <p className="text-xs text-body text-center">
              © {new Date().getFullYear()} EduPulse. Built for schools that want to do more.
            </p>
            <div className="flex gap-6">
              <Link href="/login" className="text-xs text-body hover:text-primary">Sign In</Link>
              <Link href="/admin-request" className="text-xs text-body hover:text-primary">Get Started</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
