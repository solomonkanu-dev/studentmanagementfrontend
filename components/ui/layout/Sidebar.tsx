"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Students", href: "/admin/students", icon: GraduationCap },
  { label: "Lecturers", href: "/admin/lecturers", icon: Users },
  { label: "Classes", href: "/admin/classes", icon: School },
  { label: "Subjects", href: "/admin/subjects", icon: BookOpen },
  { label: "Assignments", href: "/admin/assignments", icon: ClipboardList },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
  { label: "Results", href: "/admin/results", icon: FileText },
  { label: "Fees", href: "/admin/fees", icon: CreditCard },
  { label: "Salary", href: "/admin/salary", icon: DollarSign },
  { label: "Institute", href: "/admin/institute", icon: Building2 },
  { label: "Theme", href: "/admin/theme", icon: Palette },
];

const lecturerNav: NavItem[] = [
  { label: "Dashboard", href: "/lecturer", icon: LayoutDashboard },
  { label: "Subjects", href: "/lecturer/subjects", icon: BookOpen },
  { label: "Classes", href: "/lecturer/classes", icon: School },
  { label: "Assignments", href: "/lecturer/assignments", icon: ClipboardList },
  { label: "Attendance", href: "/lecturer/attendance", icon: CalendarCheck },
  { label: "Salary", href: "/lecturer/salary", icon: DollarSign },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Subjects", href: "/student/subjects", icon: BookOpen },
  { label: "Assignments", href: "/student/assignments", icon: ClipboardList },
  { label: "Attendance", href: "/student/attendance", icon: CalendarCheck },
];

const superAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
  { label: "Admins", href: "/super-admin/admins", icon: ShieldCheck },
];

export function Sidebar() {
  const { user, logout, isRole } = useAuth();
  const pathname = usePathname();

  const navItems = isRole("admin")
    ? adminNav
    : isRole("lecturer")
    ? lecturerNav
    : isRole("student")
    ? studentNav
    : superAdminNav;

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-slate-100 px-5">
        <span className="text-base font-bold text-slate-900">
          Student<span className="text-slate-400">MS</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 uppercase shrink-0">
            {user?.fullName?.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">
              {user?.fullName}
            </p>
            <p className="truncate text-xs text-slate-400 capitalize">
              {user?.role?.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={logout}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
