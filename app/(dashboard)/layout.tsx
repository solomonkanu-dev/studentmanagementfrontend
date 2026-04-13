"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StudentChatWidget } from "@/components/ui/StudentChatWidget";
import { LecturerChatWidget } from "@/components/ui/LecturerChatWidget";
import { AdminChatWidget } from "@/components/ui/AdminChatWidget";
import { SocketProvider } from "@/context/SocketContext";
import { DashboardErrorBoundary } from "@/components/ui/DashboardErrorBoundary";
import useColorMode from "@/hooks/useColorMode";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useColorMode();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.isActive === false) { router.replace("/suspended"); return; }

    // Redirect admin to onboarding if institute isn't set up yet
    if (user.role === "admin") {
      const inst = user.institute;
      const onboardingDone =
        inst !== null && typeof inst === "object" ? inst.onboardingCompleted : false;
      const hasInstitute = !!inst;
      const isOnboardingRoute =
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/admin/onboarding");

      if ((!hasInstitute || !onboardingDone) && !isOnboardingRoute) {
        router.replace("/admin/onboarding");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-whiten"
        role="status"
        aria-label="Loading"
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  return (
    <SocketProvider>
    <div className="flex h-screen overflow-hidden bg-whiten dark:bg-boxdark-2">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} sidebarCollapsed={sidebarCollapsed} />
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />
        <main className="flex-1">
          <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
            <DashboardErrorBoundary>
              {children}
            </DashboardErrorBoundary>
          </div>
        </main>
      </div>

      {/* AI chat widgets — role-scoped */}
      {user.role === "student" && <StudentChatWidget />}
      {user.role === "lecturer" && <LecturerChatWidget />}
      {user.role === "admin" && <AdminChatWidget />}
    </div>
    </SocketProvider>
  );
}
