"use client";

import { useState } from "react";
import { Monitor, Building2, TrendingUp, CreditCard, DollarSign, BarChart2 } from "lucide-react";
import { OnlineUsersCard } from "@/components/super-admin/monitor/OnlineUsersCard";
import { OverviewTab } from "@/components/super-admin/monitor/OverviewTab";
import { InstitutesTab } from "@/components/super-admin/monitor/InstitutesTab";
import { GrowthTab } from "@/components/super-admin/monitor/GrowthTab";
import { FeeRevenueTab } from "@/components/super-admin/monitor/FeeRevenueTab";
import { SalaryTab } from "@/components/super-admin/monitor/SalaryTab";
import { ReportsTab } from "@/components/super-admin/monitor/ReportsTab";

const TABS = [
  { id: "overview",  label: "Overview",    icon: Monitor },
  { id: "institutes", label: "Institutes",  icon: Building2 },
  { id: "growth",    label: "Growth",      icon: TrendingUp },
  { id: "fees",      label: "Fee Revenue", icon: CreditCard },
  { id: "salary",    label: "Salary",      icon: DollarSign },
  { id: "reports",   label: "Reports",     icon: BarChart2 },
] as const;
type TabId = typeof TABS[number]["id"];

export default function MonitorPage() {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
          <Monitor size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Monitoring</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Platform-wide health and performance</p>
        </div>
      </div>

      {/* Live online users */}
      <OnlineUsersCard />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? "bg-white text-red-600 shadow-sm dark:bg-gray-800 dark:text-red-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "overview"   && <OverviewTab />}
      {tab === "institutes" && <InstitutesTab />}
      {tab === "growth"     && <GrowthTab />}
      {tab === "fees"       && <FeeRevenueTab />}
      {tab === "salary"     && <SalaryTab />}
      {tab === "reports"    && <ReportsTab />}
    </div>
  );
}
