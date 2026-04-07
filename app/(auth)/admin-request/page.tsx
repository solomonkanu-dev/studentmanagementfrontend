"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

const schema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "At least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

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
          ?.message ?? "Request failed. Try again.";
      setError(msg);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">Request submitted</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your admin request is pending approval.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-slate-700 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Request Admin Access</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Create your admin account
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Jane Doe"
              error={errors.fullName?.message}
              {...register("fullName")}
            />
            <Input
              label="Email"
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
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
              Submit Request
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-slate-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
