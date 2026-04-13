"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  CheckCircle2,
  Building2,
  Clock,
  ShieldCheck,
  Users,
  GraduationCap,
  ArrowLeft,
} from "lucide-react";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "At least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

// ─── Shared blob ─────────────────────────────────────────────────────────────

function Blob({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      className={`absolute rounded-full opacity-20 blur-3xl ${className}`}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { icon: Building2, label: "Register your account" },
  { icon: Clock,     label: "Pending super-admin approval" },
  { icon: ShieldCheck, label: "Access granted & institute setup" },
];

function StepIndicator({ index }: { index: number }) {
  const [visible, setVisible] = useState(false);
  const { icon: Icon, label } = STEPS[index];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300 + index * 150);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      className={`flex items-center gap-3 transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
          {index + 1}
        </span>
        <p className="text-sm text-white/85">{label}</p>
      </div>
    </div>
  );
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessView() {
  return (
    <div className="flex min-h-screen">
      {/* Left */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 dark:bg-boxdark lg:w-[42%] lg:px-12">
        <div className="w-full max-w-sm text-center">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <svg width="52" height="52" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="80" height="80" rx="20" fill="#0F6E56"/>
              <polyline points="12,40 24,40 32,24 40,56 48,32 56,46 62,40 68,40" fill="none" stroke="#5DCAA5" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="48" cy="32" r="4" fill="#9FE1CB"/>
            </svg>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              Edu<span style={{ color: "#1D9E75" }}>Pulse</span>
            </h1>
          </div>

          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <h2 className="mt-5 text-xl font-bold text-black dark:text-white">Request submitted!</h2>
          <p className="mt-2 text-sm text-body">
            Your admin account request has been received. A super admin will review and approve it shortly.
          </p>
          <p className="mt-1 text-xs text-body">You'll be able to sign in once approved.</p>

          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>

      {/* Right — same gradient panel */}
      <RightPanel />
    </div>
  );
}

// ─── Right panel (shared) ─────────────────────────────────────────────────────

function RightPanel() {
  return (
    <div
      className="relative hidden flex-1 overflow-hidden lg:flex lg:flex-col lg:items-start lg:justify-center lg:px-14 lg:py-16"
      style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3c50e0 50%, #6d28d9 100%)" }}
    >
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

      <div className="relative z-10 max-w-md">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/20 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Admin Registration
        </div>

        {/* Headline */}
        <h2 className="text-3xl font-bold leading-tight text-white">
          Join EduPulse as
          <br />
          <span className="text-white/70">an institution admin.</span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Register your account and get access to the full suite of school management tools after approval by a super admin.
        </p>

        {/* How it works */}
        <div className="mt-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
            How it works
          </p>
          <div className="space-y-4">
            {STEPS.map((_, i) => (
              <StepIndicator key={i} index={i} />
            ))}
          </div>
        </div>

        {/* What you get */}
        <div className="mt-10 space-y-3 border-t border-white/10 pt-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
            What you get
          </p>
          {[
            { icon: Users,         text: "Manage students, teachers & parents" },
            { icon: GraduationCap, text: "Full results, fees & attendance control" },
            { icon: ShieldCheck,   text: "Secure role-based access for your institute" },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <Icon className="h-3.5 w-3.5 text-white/80" />
              </div>
              <p className="text-sm text-white/75">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRequestPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError("");
    try {
      await apiClient.post("/admin/admin-request", values);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Request failed. Please try again.";
      setError(msg);
    }
  };

  if (submitted) return <SuccessView />;

  return (
    <div className="flex min-h-screen">
      {/* ── Left: Registration form ──────────────────────────────────────── */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 dark:bg-boxdark lg:w-[42%] lg:px-12">
        <div className="w-full max-w-sm">
          {/* Logo — centred */}
          <div className="mb-10 flex flex-col items-center gap-2">
            <svg width="52" height="52" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="80" height="80" rx="20" fill="#0F6E56"/>
              <polyline points="12,40 24,40 32,24 40,56 48,32 56,46 62,40 68,40" fill="none" stroke="#5DCAA5" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="48" cy="32" r="4" fill="#9FE1CB"/>
            </svg>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              Edu<span style={{ color: "#1D9E75" }}>Pulse</span>
            </h1>
            <p className="text-center text-sm text-body">
              School Management System
            </p>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-xl font-bold text-black dark:text-white">Request admin access</h2>
            <p className="mt-1 text-sm text-body">
              Fill in your details. A super admin will review and approve your request.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Jane Doe"
              error={errors.fullName?.message}
              {...register("fullName")}
            />
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

            {error && (
              <p className="rounded-lg border border-meta-1/20 bg-meta-1/8 px-4 py-2.5 text-xs text-meta-1">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
              Submit Request
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-body">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right: Animated panel ────────────────────────────────────────── */}
      <RightPanel />
    </div>
  );
}
