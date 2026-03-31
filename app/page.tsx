"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const roleRedirects: Record<string, string> = {
      admin: "/admin",
      lecturer: "/lecturer",
      student: "/student",
      super_admin: "/super-admin",
      parent: "/parent",
    };
    router.replace(roleRedirects[user.role] ?? "/login");
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
    </div>
  );
}
