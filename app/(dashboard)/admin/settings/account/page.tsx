"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { UserCircle, Lock, CheckCircle2, AlertCircle } from "lucide-react";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ProfileSection user={user} />
      <PasswordSection userId={user?._id} />
    </div>
  );
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ user }: { user: ReturnType<typeof useAuth>["user"] }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
    },
  });

  async function onSubmit(values: ProfileForm) {
    setStatus("loading");
    setErrorMsg("");
    try {
      await apiClient.patch("/admin/profile", values);
      // Update stored user object
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem(
          "user",
          JSON.stringify({ ...parsed, ...values })
        );
      }
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update profile";
      setErrorMsg(msg);
      setStatus("error");
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3 border-b border-stroke px-5 py-4 dark:border-strokedark">
        <UserCircle className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-black dark:text-white">
          Profile Information
        </h2>
      </div>
      <CardContent>
        {/* Avatar placeholder */}
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white uppercase">
            {user?.fullName?.charAt(0) ?? "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-black dark:text-white">
              {user?.fullName}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="default" className="capitalize">
                {user?.role?.replace("_", " ")}
              </Badge>
              {user?.approved && (
                <Badge variant="success">Approved</Badge>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Your full name"
            error={errors.fullName?.message}
            {...register("fullName")}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register("email")}
          />

          {/* Read-only fields */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">
              Role
            </label>
            <div className="flex h-9 items-center rounded border border-stroke bg-meta-2 px-3 text-sm text-body dark:border-strokedark dark:bg-meta-4">
              {user?.role?.replace("_", " ")}
            </div>
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 rounded border border-meta-3/30 bg-meta-3/10 px-3 py-2 text-xs text-meta-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Profile updated successfully
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 rounded border border-meta-1/30 bg-meta-1/10 px-3 py-2 text-xs text-meta-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <Button type="submit" isLoading={status === "loading"} className="w-full">
            Save Profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection({ userId }: { userId?: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const newPass = watch("newPassword", "");

  const strength = getStrength(newPass);

  async function onSubmit(values: PasswordForm) {
    if (!userId) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      await apiClient.patch("/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setStatus("success");
      reset();
      setTimeout(() => setStatus("idle"), 4000);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to change password";
      setErrorMsg(msg);
      setStatus("error");
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3 border-b border-stroke px-5 py-4 dark:border-strokedark">
        <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-black dark:text-white">
          Change Password
        </h2>
      </div>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Current password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                placeholder="••••••••"
                className="h-9 w-full rounded border border-stroke bg-transparent px-3 pr-9 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:text-white"
                {...register("currentPassword")}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-body hover:text-black dark:hover:text-white"
              >
                {showCurrent ? "Hide" : "Show"}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-meta-1">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                placeholder="••••••••"
                className="h-9 w-full rounded border border-stroke bg-transparent px-3 pr-9 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:text-white"
                {...register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-body hover:text-black dark:hover:text-white"
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-meta-1">{errors.newPassword.message}</p>
            )}

            {/* Strength bar */}
            {newPass.length > 0 && (
              <div className="mt-1 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={[
                        "h-1 flex-1 rounded-full transition-all",
                        strength.score >= i
                          ? strength.score <= 1
                            ? "bg-meta-1"
                            : strength.score <= 2
                            ? "bg-yellow-400"
                            : strength.score <= 3
                            ? "bg-primary"
                            : "bg-meta-3"
                          : "bg-stroke dark:bg-strokedark",
                      ].join(" ")}
                    />
                  ))}
                </div>
                <p className="text-xs text-body">{strength.label}</p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {status === "success" && (
            <div className="flex items-center gap-2 rounded border border-meta-3/30 bg-meta-3/10 px-3 py-2 text-xs text-meta-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Password changed successfully
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 rounded border border-meta-1/30 bg-meta-1/10 px-3 py-2 text-xs text-meta-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <Button type="submit" isLoading={status === "loading"} className="w-full">
            Change Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────

function getStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const capped = Math.min(score, 4);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  return { score: capped, label: labels[capped] };
}
