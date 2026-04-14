"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useClassLabel } from "@/hooks/useClassLabel";
import { announcementApi } from "@/lib/api/announcement";
import { chatApi } from "@/lib/api/chat";
import { subjectApi } from "@/lib/api/subject";
import { assignmentApi, submissionApi } from "@/lib/api/assignment";
import { superAdminApi } from "@/lib/api/superAdmin";
import { useSocket } from "@/context/SocketContext";
import type { Subject, Assignment, Submission } from "@/lib/types";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CalendarCheck,
  DollarSign,
  CreditCard,
  Building2,
  Palette,
  ShieldCheck,
  LogOut,
  School,
  FileText,
  ChevronDown,
  Settings,
  Activity,
  Monitor,
  Megaphone,
  Layers,
  Wrench,
  ScrollText,
  FolderOpen,
  CalendarDays,
  Sparkles,
  Heart,
  TableProperties,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SubItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: SubItem[];
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  {
    label: "Students",
    href: "/admin/students",
    icon: GraduationCap,
    children: [
      { label: "Overview", href: "/admin/students" },
      { label: "All Students", href: "/admin/students/list" },
    ],
  },
  {
    label: "Teachers",
    href: "/admin/lecturers",
    icon: Users,
    children: [
      { label: "Overview", href: "/admin/lecturers" },
      { label: "All Teachers", href: "/admin/lecturers/list" },
    ],
  },
  {
    label: "Classes",
    href: "/admin/classes",
    icon: School,
    children: [
      { label: "Overview", href: "/admin/classes" },
      { label: "All Classes", href: "/admin/classes/list" },
    ],
  },
  {
    label: "Subjects",
    href: "/admin/subjects",
    icon: BookOpen,
    children: [
      { label: "Overview", href: "/admin/subjects" },
      { label: "All Subjects", href: "/admin/subjects/list" },
    ],
  },
  { label: "Parents", href: "/admin/parents", icon: Heart },
  { label: "Timetable", href: "/admin/timetable", icon: TableProperties },
  { label: "Academic Calendar", href: "/admin/academic-calendar", icon: CalendarDays },
  { label: "Promote Students", href: "/admin/promote", icon: GraduationCap },
  { label: "Assignments", href: "/admin/assignments", icon: ClipboardList },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
  { label: "Results", href: "/admin/results", icon: FileText },
  { label: "Fees", href: "/admin/fees", icon: CreditCard },
  { label: "Terms", href: "/admin/terms", icon: CalendarDays },
  { label: "Salary", href: "/admin/salary", icon: DollarSign },
  { label: "Plan & Billing", href: "/admin/plan", icon: CreditCard },
  { label: "Institute", href: "/admin/institute", icon: Building2 },
  { label: "Theme", href: "/admin/theme", icon: Palette },
  { label: "Messages", href: "/admin/messages", icon: MessageSquare },
  { label: "AI Analytics", href: "/admin/ai-analytics", icon: Sparkles },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: Activity },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    children: [
      { label: "Fees Particulars", href: "/admin/settings/fees" },
      { label: "Invoice Accounts", href: "/admin/settings/accounts" },
      { label: "Marks Grading", href: "/admin/settings/grading" },
      { label: "Document Templates", href: "/admin/settings/documents" },
      { label: "Email Notifications", href: "/admin/settings/notifications" },
      { label: "Rules & Regulations", href: "/admin/settings/rules" },
      { label: "My Plan", href: "/admin/settings/plan" },
      { label: "Account Settings", href: "/admin/settings/account" },
    ],
  },
];

const lecturerNav: NavItem[] = [
  { label: "Dashboard", href: "/lecturer", icon: LayoutDashboard },
  { label: "Subjects", href: "/lecturer/subjects", icon: BookOpen },
  { label: "Classes", href: "/lecturer/classes", icon: School },
  { label: "Assignments", href: "/lecturer/assignments", icon: ClipboardList },
  { label: "Attendance", href: "/lecturer/attendance", icon: CalendarCheck },
  { label: "Results", href: "/lecturer/results", icon: FileText },
  { label: "Promote Students", href: "/lecturer/promote", icon: GraduationCap },
  { label: "Timetable", href: "/lecturer/timetable", icon: TableProperties },
  { label: "Academic Calendar", href: "/lecturer/academic-calendar", icon: CalendarDays },
  { label: "Salary", href: "/lecturer/salary", icon: DollarSign },
  { label: "Messages", href: "/lecturer/messages", icon: MessageSquare },
  { label: "Announcements", href: "/lecturer/announcements", icon: Megaphone },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Subjects", href: "/student/subjects", icon: BookOpen },
  { label: "Assignments", href: "/student/assignments", icon: ClipboardList },
  { label: "Attendance", href: "/student/attendance", icon: CalendarCheck },
  { label: "Results", href: "/student/results", icon: FileText },
  { label: "Fees", href: "/student/fees", icon: CreditCard },
  { label: "Documents", href: "/student/documents", icon: FolderOpen },
  { label: "Notification Preferences", href: "/student/notification-preferences", icon: Settings },
  { label: "Timetable", href: "/student/timetable", icon: TableProperties },
  { label: "Academic Calendar", href: "/student/academic-calendar", icon: CalendarDays },
  { label: "Messages", href: "/student/messages", icon: MessageSquare },
  { label: "Rules & Regulations", href: "/student/rules", icon: ScrollText },
  { label: "Announcements", href: "/student/announcements", icon: Megaphone },
];

const parentNav: NavItem[] = [
  { label: "Dashboard", href: "/parent", icon: LayoutDashboard },
  { label: "Attendance", href: "/parent/attendance", icon: CalendarCheck },
  { label: "Results", href: "/parent/results", icon: FileText },
  { label: "Fees", href: "/parent/fees", icon: CreditCard },
  { label: "Timetable", href: "/parent/timetable", icon: TableProperties },
  { label: "Academic Calendar", href: "/parent/academic-calendar", icon: CalendarDays },
  { label: "Messages", href: "/parent/messages", icon: MessageSquare },
  { label: "Announcements", href: "/parent/announcements", icon: Megaphone },
];

const superAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
  { label: "Admins", href: "/super-admin/admins", icon: ShieldCheck },
  { label: "Institutes", href: "/super-admin/institutes", icon: Building2 },
  { label: "System Monitor", href: "/super-admin/monitor", icon: Monitor },
  { label: "AI Analytics", href: "/super-admin/ai-analytics", icon: Sparkles },
  { label: "Plans", href: "/super-admin/plans", icon: Layers },
  { label: "Announcements", href: "/super-admin/announcements", icon: Megaphone },
  { label: "System Config", href: "/super-admin/system", icon: Wrench },
  { label: "Audit Logs", href: "/super-admin/audit-logs", icon: Activity },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
}

export function Sidebar({ sidebarOpen, setSidebarOpen, sidebarCollapsed }: SidebarProps) {
  const { user, logout, isRole } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const { plural: classesLabel } = useClassLabel();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);

  // Build dynamic nav with the right class/form label — memoized so the
  // auto-open useEffect only fires when pathname truly changes, not on every render.
  const dynamicAdminNav = useMemo<NavItem[]>(() => adminNav.map((item) =>
    item.href === "/admin/classes"
      ? {
          ...item,
          label: classesLabel,
          children: item.children?.map((c) =>
            c.href === "/admin/classes/list" ? { ...c, label: `All ${classesLabel}` } : c
          ),
        }
      : item
  ), [classesLabel]);

  const dynamicLecturerNav = useMemo<NavItem[]>(() => lecturerNav.map((item) =>
    item.href === "/lecturer/classes" ? { ...item, label: `My ${classesLabel}` } : item
  ), [classesLabel]);

  const role = user?.role;
  const navItems = useMemo<NavItem[]>(() =>
    role === "admin" ? dynamicAdminNav
    : role === "lecturer" ? dynamicLecturerNav
    : role === "student" ? studentNav
    : role === "parent" ? parentNav
    : superAdminNav,
  [role, dynamicAdminNav, dynamicLecturerNav]);

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: announcementApi.getAll,
    staleTime: 60_000,
  });
  const unreadAnnouncements = (announcements as { isRead?: boolean }[]).filter((a) => !a.isRead).length;

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ["chat-unread-count"],
    queryFn: chatApi.getUnreadCount,
    staleTime: 60_000,
  });

  // Increment unread message count when a new message arrives via socket
  useEffect(() => {
    if (!socket) return;
    function onNewMessage() {
      queryClient.setQueryData<number>(["chat-unread-count"], (prev = 0) => prev + 1);
    }
    socket.on("new_message", onNewMessage);
    return () => { socket.off("new_message", onNewMessage); };
  }, [socket, queryClient]);

  // Super-admin: pending admin requests badge
  const isSuperAdmin = isRole("super_admin");
  const { data: pendingAdmins = [] } = useQuery({
    queryKey: ["pending-admins"],
    queryFn: superAdminApi.getPendingAdmins,
    enabled: isSuperAdmin,
    staleTime: 60_000,
  });
  const pendingAdminCount = (pendingAdmins as { _id: string }[]).length;

  // Real-time: increment badge and refresh list when a new admin registers
  useEffect(() => {
    if (!socket || !isSuperAdmin) return;
    function onNewNotification(n: { type?: string }) {
      if (n?.type === "new_admin_signup") {
        queryClient.invalidateQueries({ queryKey: ["pending-admins"] });
        queryClient.invalidateQueries({ queryKey: ["super-admins-all"] });
      }
    }
    socket.on("new_notification", onNewNotification);
    return () => { socket.off("new_notification", onNewNotification); };
  }, [socket, isSuperAdmin, queryClient]);

  // Student-only: pending assignments badge
  // staleTime matches refetchInterval so navigation between pages doesn't
  // re-fire the N subject-assignment requests on every mount.
  const FIVE_MIN = 5 * 60_000;
  const isStudent = isRole("student");
  const { data: studentSubjects = [] } = useQuery({
    queryKey: ["student-subjects"],
    queryFn: subjectApi.getForStudent,
    enabled: isStudent,
    staleTime: FIVE_MIN,
    refetchInterval: FIVE_MIN,
  });
  const subjectIds = (studentSubjects as Subject[]).map((s) => s._id);
  const { data: mySubmissions = [] } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: submissionApi.getMine,
    enabled: isStudent,
    staleTime: FIVE_MIN,
    refetchInterval: FIVE_MIN,
  });
  const { data: allSubjectAssignments = [] } = useQuery({
    // Stable key: sorted ids so order changes don't invalidate cache
    queryKey: ["sidebar-student-assignments", [...subjectIds].sort()],
    queryFn: async () => {
      const results = await Promise.all(
        (studentSubjects as Subject[]).map((s) => assignmentApi.getBySubject(s._id))
      );
      return results.flat() as Assignment[];
    },
    enabled: isStudent && subjectIds.length > 0,
    staleTime: FIVE_MIN,
    refetchInterval: FIVE_MIN,
  });
  const submittedIds = new Set(
    (mySubmissions as Submission[]).map((s) =>
      typeof s.assignment === "string" ? s.assignment : (s.assignment as Assignment)._id
    )
  );
  const pendingAssignments = isStudent
    ? (allSubjectAssignments as Assignment[]).filter((a) => !submittedIds.has(a._id)).length
    : 0;

  // Track which dropdown groups are open
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    navItems.forEach((item) => {
      if (item.children && pathname.startsWith(item.href)) {
        initial.add(item.href);
      }
    });
    return initial;
  });

  const toggleGroup = (href: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  // Auto-open group when navigating into it
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children && pathname.startsWith(item.href)) {
        setOpenGroups((prev) => {
          if (prev.has(item.href)) return prev;
          const next = new Set(prev);
          next.add(item.href);
          return next;
        });
      }
    });
  }, [pathname, navItems]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setSidebarOpen]);

  // Click outside to close on mobile
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    };
    if (sidebarOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar"
        ref={sidebarRef}
        className={[
          "fixed left-0 top-0 z-30 flex h-screen flex-col bg-boxdark",
          "transition-all duration-300 ease-in-out",
          "lg:static lg:translate-x-0",
          sidebarCollapsed ? "lg:w-16" : "lg:w-64",
          "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className={[
          "flex h-14 items-center border-b border-strokedark px-3",
          sidebarCollapsed ? "lg:justify-center" : "justify-between px-5",
        ].join(" ")}>
          <Link href="/" className="flex items-center gap-2">
            {/* Icon mark — always visible */}
            <svg width="32" height="32" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <rect x="0" y="0" width="80" height="80" rx="20" fill="#1D9E75"/>
              <polyline points="12,40 24,40 32,24 40,56 48,32 56,46 62,40 68,40" fill="none" stroke="#E1F5EE" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="48" cy="32" r="4" fill="#9FE1CB"/>
            </svg>
            {/* Wordmark — hidden when collapsed on desktop */}
            <span className={["text-base font-semibold text-white", sidebarCollapsed ? "lg:hidden" : ""].join(" ")}>
              Edu<span style={{ color: "#5DCAA5" }}>Pulse</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1 text-bodydark hover:text-white transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className={["flex-1 overflow-y-auto no-scrollbar py-4", sidebarCollapsed ? "lg:px-1 px-3" : "px-3"].join(" ")}>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const { label, href, icon: Icon, children } = item;

              // ─── Dropdown nav item ──────────────────────────
              if (children) {
                const isOpen = openGroups.has(href);
                const isChildActive = children.some((c) => pathname === c.href);

                return (
                  <li key={href}>
                    <button
                      onClick={() => !sidebarCollapsed && toggleGroup(href)}
                      title={sidebarCollapsed ? label : undefined}
                      className={[
                        "flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        sidebarCollapsed ? "lg:justify-center lg:px-0" : "justify-between",
                        isChildActive
                          ? "bg-meta-4 text-white"
                          : "text-bodydark hover:bg-meta-4 hover:text-white",
                      ].join(" ")}
                    >
                      <span className={["flex items-center gap-3", sidebarCollapsed ? "lg:gap-0" : ""].join(" ")}>
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className={sidebarCollapsed ? "lg:hidden" : ""}>{label}</span>
                      </span>
                      <ChevronDown
                        className={[
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          isOpen ? "rotate-180" : "",
                          sidebarCollapsed ? "lg:hidden" : "",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                    </button>

                    {/* Sub-items */}
                    <div
                      className="overflow-hidden transition-all duration-200"
                      style={{
                        maxHeight: !sidebarCollapsed && isOpen ? `${children.length * 40 + 8}px` : "0px",
                        marginTop: !sidebarCollapsed && isOpen ? "2px" : "0px",
                      }}
                    >
                      <ul className="space-y-0.5 pl-4">
                        {children.map((child) => {
                          const childActive = pathname === child.href;
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={() => setSidebarOpen(false)}
                                className={[
                                  "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                                  childActive
                                    ? "bg-primary text-white"
                                    : "text-bodydark hover:bg-meta-4 hover:text-white",
                                ].join(" ")}
                              >
                                <span
                                  className={[
                                    "h-1.5 w-1.5 shrink-0 rounded-full",
                                    childActive ? "bg-white" : "bg-bodydark",
                                  ].join(" ")}
                                  aria-hidden="true"
                                />
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </li>
                );
              }

              // ─── Plain nav item ─────────────────────────────
              const active = pathname === href;
              const isAnnouncements = href.endsWith("/announcements");
              const isAssignments = href.endsWith("/assignments");
              const isMessages = href.endsWith("/messages");
              const isAdmins = href === "/super-admin/admins";
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    title={sidebarCollapsed ? label : undefined}
                    className={[
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      sidebarCollapsed ? "lg:justify-center lg:px-0 lg:gap-0" : "",
                      active
                        ? "bg-primary text-white"
                        : "text-bodydark hover:bg-meta-4 hover:text-white",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className={["flex-1", sidebarCollapsed ? "lg:hidden" : ""].join(" ")}>{label}</span>
                    {isAnnouncements && unreadAnnouncements > 0 && (
                      <span className={["flex h-5 min-w-5 items-center justify-center rounded-full bg-meta-1 px-1 text-[10px] font-bold text-white", sidebarCollapsed ? "lg:hidden" : ""].join(" ")}>
                        {unreadAnnouncements > 99 ? "99+" : unreadAnnouncements}
                      </span>
                    )}
                    {isAssignments && isStudent && pendingAssignments > 0 && (
                      <span className={["flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500 px-1 text-[10px] font-bold text-white", sidebarCollapsed ? "lg:hidden" : ""].join(" ")}>
                        {pendingAssignments > 99 ? "99+" : pendingAssignments}
                      </span>
                    )}
                    {isMessages && (unreadMessages as number) > 0 && (
                      <span className={["flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white", sidebarCollapsed ? "lg:hidden" : ""].join(" ")}>
                        {(unreadMessages as number) > 99 ? "99+" : unreadMessages}
                      </span>
                    )}
                    {isAdmins && pendingAdminCount > 0 && (
                      <span className={["flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500 px-1 text-[10px] font-bold text-white", sidebarCollapsed ? "lg:hidden" : ""].join(" ")}>
                        {pendingAdminCount > 99 ? "99+" : pendingAdminCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="border-t border-strokedark p-3">
          <div className={["flex items-center gap-3 rounded-md px-2 py-2", sidebarCollapsed ? "lg:justify-center lg:px-0" : ""].join(" ")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white uppercase overflow-hidden">
              {user?.profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profilePhoto} alt={user.fullName} className="h-full w-full object-cover" />
              ) : (
                user?.fullName?.charAt(0) ?? "?"
              )}
            </div>
            <div className={["min-w-0 flex-1", sidebarCollapsed ? "lg:hidden" : ""].join(" ")}>
              <p className="truncate text-xs font-semibold text-white">
                {user?.fullName}
              </p>
              <p className="truncate text-xs text-bodydark capitalize">
                {user?.role?.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className={["shrink-0 rounded p-1 text-bodydark hover:text-white transition-colors", sidebarCollapsed ? "lg:hidden" : ""].join(" ")}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout confirm dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-80 rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-meta-1/10">
              <LogOut className="h-6 w-6 text-meta-1" aria-hidden="true" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-black dark:text-white">Sign out?</h3>
            <p className="mb-5 text-sm text-body">Are you sure you want to log out of your account?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded border border-stroke py-2 text-sm font-medium text-black transition-colors hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); logout(); }}
                className="flex-1 rounded bg-meta-1 py-2 text-sm font-medium text-white transition-colors hover:bg-meta-1/90"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
