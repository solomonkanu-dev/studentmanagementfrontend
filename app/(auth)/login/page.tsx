"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

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
    <div className="flex min-h-screen items-center justify-center bg-whiten px-4 dark:bg-boxdark-2">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-black dark:text-white">
            Student<span className="text-primary">MS</span>
          </h1>
          <p className="mt-1.5 text-sm text-body">Sign in to your account</p>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="px-8 py-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

              <label className="flex items-center gap-2 text-sm text-body cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSuperAdmin}
                  onChange={(e) => setIsSuperAdmin(e.target.checked)}
                  className="h-4 w-4 rounded border-stroke accent-primary"
                />
                Sign in as Super Admin
              </label>

              {error && (
                <p className="rounded border border-meta-1/20 bg-meta-1/10 px-3 py-2 text-xs text-meta-1">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
                Sign in
              </Button>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-body">
          New institute?{" "}
          <a href="/admin-request" className="font-medium text-primary hover:underline">
            Request admin access
          </a>
        </p>
      </div>
    </div>
  );
}
