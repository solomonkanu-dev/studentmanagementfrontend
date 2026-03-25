"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { announcementApi } from "@/lib/api/announcement";
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
    label: "Lecturers",
    href: "/admin/lecturers",
    icon: Users,
    children: [
      { label: "Overview", href: "/admin/lecturers" },
      { label: "All Lecturers", href: "/admin/lecturers/list" },
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
  { label: "Assignments", href: "/admin/assignments", icon: ClipboardList },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
  { label: "Results", href: "/admin/results", icon: FileText },
  { label: "Fees", href: "/admin/fees", icon: CreditCard },
  { label: "Salary", href: "/admin/salary", icon: DollarSign },
  { label: "Institute", href: "/admin/institute", icon: Building2 },
  { label: "Theme", href: "/admin/theme", icon: Palette },
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
  { label: "Salary", href: "/lecturer/salary", icon: DollarSign },
  { label: "Announcements", href: "/lecturer/announcements", icon: Megaphone },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Subjects", href: "/student/subjects", icon: BookOpen },
  { label: "Assignments", href: "/student/assignments", icon: ClipboardList },
  { label: "Attendance", href: "/student/attendance", icon: CalendarCheck },
  { label: "Announcements", href: "/student/announcements", icon: Megaphone },
];

const superAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
  { label: "Admins", href: "/super-admin/admins", icon: ShieldCheck },
  { label: "System Monitor", href: "/super-admin/monitor", icon: Monitor },
  { label: "Plans", href: "/super-admin/plans", icon: Layers },
  { label: "Announcements", href: "/super-admin/announcements", icon: Megaphone },
  { label: "System Config", href: "/super-admin/system", icon: Wrench },
  { label: "Audit Logs", href: "/super-admin/audit-logs", icon: Activity },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const { user, logout, isRole } = useAuth();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);

  const navItems = isRole("admin")
    ? adminNav
    : isRole("lecturer")
    ? lecturerNav
    : isRole("student")
    ? studentNav
    : superAdminNav;

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: announcementApi.getAll,
    refetchInterval: 60_000,
  });
  const unreadAnnouncements = (announcements as { isRead?: boolean }[]).filter((a) => !a.isRead).length;

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
          "fixed left-0 top-0 z-30 flex h-screen w-64 flex-col bg-boxdark",
          "transition-transform duration-300 ease-in-out",
          "lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-strokedark px-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-base font-bold text-white">
              Student<span className="text-bodydark">MS</span>
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
        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4">
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
                      onClick={() => toggleGroup(href)}
                      className={[
                        "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isChildActive
                          ? "bg-meta-4 text-white"
                          : "text-bodydark hover:bg-meta-4 hover:text-white",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {label}
                      </span>
                      <ChevronDown
                        className={[
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          isOpen ? "rotate-180" : "",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                    </button>

                    {/* Sub-items */}
                    <div
                      className="overflow-hidden transition-all duration-200"
                      style={{
                        maxHeight: isOpen ? `${children.length * 40 + 8}px` : "0px",
                        marginTop: isOpen ? "2px" : "0px",
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
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className={[
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-white"
                        : "text-bodydark hover:bg-meta-4 hover:text-white",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    {isAnnouncements && unreadAnnouncements > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-meta-1 px-1 text-[10px] font-bold text-white">
                        {unreadAnnouncements > 99 ? "99+" : unreadAnnouncements}
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
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white uppercase">
              {user?.fullName?.charAt(0) ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {user?.fullName}
              </p>
              <p className="truncate text-xs text-bodydark capitalize">
                {user?.role?.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={logout}
              className="shrink-0 rounded p-1 text-bodydark hover:text-white transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
