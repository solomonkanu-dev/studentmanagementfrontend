"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

const tabs = [
  { label: "Fees Particulars", href: "/admin/settings/fees" },
  { label: "Invoice Accounts", href: "/admin/settings/accounts" },
  { label: "Marks Grading", href: "/admin/settings/grading" },
  { label: "Rules & Regulations", href: "/admin/settings/rules" },
  { label: "Theme", href: "/admin/settings/theme" },
  { label: "Account Settings", href: "/admin/settings/account" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-meta-2 dark:bg-meta-4">
          <Settings className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-black dark:text-white">
            Settings
          </h1>
          <p className="text-xs text-body">
            Manage institution-wide configuration
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-stroke dark:border-strokedark">
        <nav className="-mb-px flex gap-0.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  "flex-shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-body hover:text-black dark:hover:text-white hover:border-stroke dark:hover:border-strokedark",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
