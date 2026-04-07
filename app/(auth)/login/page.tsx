"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  GraduationCap,
  Users,
  BookOpen,
  BarChart3,
  ClipboardList,
  Shield,
} from "lucide-react";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

// ─── Animated feature cards (right panel) ────────────────────────────────────

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Student Management",
    desc: "Enroll, track and manage every student from admission to graduation.",
  },
  {
    icon: BarChart3,
    title: "Results & Analytics",
    desc: "Publish grades, generate report cards and visualise performance trends.",
  },
  {
    icon: Users,
    title: "Staff & Lecturers",
    desc: "Manage lecturer profiles, class assignments and salary records.",
  },
  {
    icon: BookOpen,
    title: "Assignments & Subjects",
    desc: "Create assignments, track submissions and organise subjects per class.",
  },
  {
    icon: ClipboardList,
    title: "Attendance Tracking",
    desc: "Mark daily attendance and receive automatic alerts for low attendance.",
  },
  {
    icon: Shield,
    title: "Secure & Role-Based",
    desc: "Super admin, admin, lecturer and student roles with full access control.",
  },
];

// ─── Floating blob ────────────────────────────────────────────────────────────

function Blob({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`absolute rounded-full opacity-20 blur-3xl ${className}`}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

// ─── Animated feature card ────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  desc,
  index,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  index: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200 + index * 120);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      className={`flex items-start gap-3 transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/65">{desc}</p>
      </div>
    </div>
  );
}

// ─── Cycling headline ─────────────────────────────────────────────────────────

const HEADLINES = [
  "Everything your institution needs.",
  "From enrolment to graduation.",
  "Smart tools for modern schools.",
  "One platform. Every role.",
];

function CyclingHeadline() {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % HEADLINES.length);
        setFading(false);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <p
      className={`text-lg font-medium text-white/80 transition-opacity duration-400 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {HEADLINES[idx]}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError("");
    try {
      await login(values.email, values.password, isSuperAdmin);
      router.replace("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Invalid credentials";
      setError(msg);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left: Login form ────────────────────────────────────────────── */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 dark:bg-boxdark lg:w-[42%] lg:px-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-10">
            <div className="mb-4">
              <svg width="48" height="48" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="80" height="80" rx="20" fill="#0F6E56"/>
                <polyline points="12,40 24,40 32,24 40,56 48,32 56,46 62,40 68,40" fill="none" stroke="#5DCAA5" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="48" cy="32" r="4" fill="#9FE1CB"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              Edu<span style={{ color: "#1D9E75" }}>Pulse</span>
            </h1>
            <p className="mt-1 text-sm text-body">Welcome back — sign in to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-body">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isSuperAdmin}
                  onChange={(e) => setIsSuperAdmin(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-stroke bg-transparent transition-colors peer-checked:border-primary peer-checked:bg-primary dark:border-strokedark">
                  <svg
                    className="hidden h-3 w-3 text-white peer-checked:block"
                    viewBox="0 0 12 10"
                    fill="none"
                  >
                    <path
                      d="M1 5l3 3 7-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              Sign in as Super Admin
            </label>

            {error && (
              <p className="rounded-lg border border-meta-1/20 bg-meta-1/8 px-4 py-2.5 text-xs text-meta-1">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-body">
            New institution?{" "}
            <a href="/admin-request" className="font-medium text-primary hover:underline">
              Request admin access
            </a>
          </p>
        </div>
      </div>

      {/* ── Right: Animated panel ────────────────────────────────────────── */}
      <div className="relative hidden flex-1 overflow-hidden lg:flex lg:flex-col lg:items-start lg:justify-center lg:px-14 lg:py-16"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3c50e0 50%, #6d28d9 100%)" }}
      >
        {/* Blobs */}
        <Blob className="left-[-80px] top-[-80px] h-72 w-72 animate-pulse bg-white" delay={0} />
        <Blob className="right-[-60px] bottom-[-60px] h-80 w-80 animate-pulse bg-violet-300" delay={1.5} />
        <Blob className="right-[20%] top-[30%] h-48 w-48 animate-pulse bg-blue-300" delay={0.8} />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-md">
          {/* Headline */}
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/20 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              School Management Platform
            </div>
            <h2 className="text-3xl font-bold leading-tight text-white">
              Manage your school
              <br />
              <span className="text-white/70">smarter, not harder.</span>
            </h2>
            <div className="mt-3">
              <CyclingHeadline />
            </div>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>

          {/* Stats strip */}
          <div className="mt-10 flex gap-8 border-t border-white/10 pt-8">
            {[
              { value: "10k+", label: "Students managed" },
              { value: "500+", label: "Institutions" },
              { value: "99.9%", label: "Uptime" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-white/55">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
