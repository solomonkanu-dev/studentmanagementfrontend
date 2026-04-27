"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/superAdmin";
import { monitorApi } from "@/lib/api/monitor";
import { auditLogApi } from "@/lib/api/auditLog";
import { planApi } from "@/lib/api/plan";
import { adminParentApi } from "@/lib/api/parent";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import CardDataStats from "@/components/ui/CardDataStats";
import {
  Building2,
  Users,
  GraduationCap,
  ShieldCheck,
  Clock,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Activity,
  CheckCircle2,
  UserCheck,
  CreditCard,
  BookOpen,
  Zap,
  Users2,
} from "lucide-react";
import type { PendingAdmin, InstituteHealthReport, GrowthTrends, FeeRevenueReport, SalaryExpenditureReport, SystemOverview, AuditLog, Plan, AuditLogSummary } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const C = {
  primary: "#3c50e0",
  success: "#10b981",
  danger:  "#fb5454",
  warning: "#f59e0b",
  indigo:  "#6366f1",
  violet:  "#8b5cf6",
  teal:    "#14b8a6",
  body:    "#64748b",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currency(n: number) {
  if (n >= 1_000_000) return `NLe ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `NLe ${(n / 1_000).toFixed(1)}K`;
  return `NLe ${n.toLocaleString()}`;
}

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

const baseChart: ApexCharts.ApexOptions = {
  chart: { toolbar: { show: false }, background: "transparent", fontFamily: "inherit" },
  grid: { borderColor: "#e2e8f0", strokeDashArray: 4, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
  tooltip: { theme: "light" },
  legend: { fontSize: "12px", labels: { colors: C.body } },
  dataLabels: { enabled: false },
};

// ─── Platform Growth Chart ────────────────────────────────────────────────────

function GrowthChart({ data }: { data: GrowthTrends }) {
  const series = useMemo(() => {
    // Merge all series into unified month slots
    const raw = [
      { label: "Students",  color: C.primary, points: data.students },
      { label: "Teachers",  color: C.success, points: data.lecturers },
      { label: "Institutes",color: C.warning, points: data.institutes },
    ];
    const keySet = new Set<string>();
    raw.forEach((s) => s.points.forEach((p) => keySet.add(`${p.year}-${p.month}`)));
    const keys = Array.from(keySet).sort();
    const categories = keys.map((k) => {
      const [y, m] = k.split("-").map(Number);
      return `${MONTH_NAMES[m - 1]} ${String(y).slice(2)}`;
    });
    const seriesData = raw.map((s) => ({
      name: s.label,
      data: keys.map((k) => {
        const [y, m] = k.split("-").map(Number);
        return s.points.find((p) => p.year === y && p.month === m)?.count ?? 0;
      }),
    }));
    return { categories, seriesData };
  }, [data]);

  const options: ApexCharts.ApexOptions = {
    ...baseChart,
    chart: { ...baseChart.chart, type: "area" },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0.02 } },
    colors: [C.primary, C.success, C.warning],
    xaxis: {
      categories: series.categories,
      labels: { style: { fontSize: "11px", colors: C.body } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px", colors: C.body }, formatter: (v) => String(Math.round(v)) } },
    legend: { position: "top", fontSize: "12px", labels: { colors: C.body } },
    tooltip: { shared: true, intersect: false },
  };

  return (
    <ReactApexChart
      type="area"
      series={series.seriesData}
      options={options}
      height={240}
    />
  );
}

// ─── User Status Donut ────────────────────────────────────────────────────────

function UserStatusDonut({ overview }: { overview: SystemOverview }) {
  const series = [
    overview.students.active,
    overview.lecturers.active,
    overview.admins.active,
    overview.students.suspended + overview.lecturers.suspended + overview.admins.suspended,
  ];
  const options: ApexCharts.ApexOptions = {
    ...baseChart,
    chart: { ...baseChart.chart, type: "donut" },
    colors: [C.primary, C.success, C.indigo, C.danger],
    labels: ["Active Students", "Active Teachers", "Active Admins", "Suspended"],
    plotOptions: { pie: { donut: { size: "65%", labels: { show: true, total: { show: true, label: "Total Users", fontSize: "12px", color: C.body } } } } },
    legend: { position: "bottom", fontSize: "11px", labels: { colors: C.body } },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => `${v} users` } },
  };

  return <ReactApexChart type="donut" series={series} options={options} height={240} />;
}

// ─── Fee Revenue Bar Chart ────────────────────────────────────────────────────

function FeeRevenueChart({ data }: { data: FeeRevenueReport }) {
  const top = data.topInstitutes.slice(0, 6);
  const options: ApexCharts.ApexOptions = {
    ...baseChart,
    chart: { ...baseChart.chart, type: "bar" },
    plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 4 } },
    colors: [C.primary, C.success, C.danger],
    xaxis: {
      categories: top.map((i) => i.instituteName.length > 12 ? i.instituteName.slice(0, 12) + "…" : i.instituteName),
      labels: { style: { fontSize: "10px", colors: C.body } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px", colors: C.body }, formatter: (v) => currency(v) } },
    tooltip: { y: { formatter: (v) => currency(v) } },
    legend: { position: "top", fontSize: "12px", labels: { colors: C.body } },
  };

  const series = [
    { name: "Billed",      data: top.map((i) => i.totalBilled) },
    { name: "Collected",   data: top.map((i) => i.totalCollected) },
    { name: "Outstanding", data: top.map((i) => i.outstanding) },
  ];

  return <ReactApexChart type="bar" series={series} options={options} height={240} />;
}

// ─── Fee Status Donut ─────────────────────────────────────────────────────────

function FeeStatusDonut({ data }: { data: FeeRevenueReport }) {
  const byStatus = data.byStatus;
  const series = byStatus.map((s) => s.count);
  const labels = byStatus.map((s) => s.status.charAt(0).toUpperCase() + s.status.slice(1));
  const colors = byStatus.map((s) =>
    s.status === "paid" ? C.success : s.status === "partial" ? C.warning : C.danger
  );

  const options: ApexCharts.ApexOptions = {
    ...baseChart,
    chart: { ...baseChart.chart, type: "donut" },
    colors,
    labels,
    plotOptions: { pie: { donut: { size: "60%", labels: { show: true, total: { show: true, label: "Records", fontSize: "12px", color: C.body } } } } },
    legend: { position: "bottom", fontSize: "11px", labels: { colors: C.body } },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => `${v} records` } },
  };

  return <ReactApexChart type="donut" series={series} options={options} height={220} />;
}

// ─── Salary Chart ─────────────────────────────────────────────────────────────

function SalaryChart({ data }: { data: SalaryExpenditureReport }) {
  const top = data.byInstitute.slice(0, 6);
  const options: ApexCharts.ApexOptions = {
    ...baseChart,
    chart: { ...baseChart.chart, type: "bar" },
    plotOptions: { bar: { horizontal: true, barHeight: "55%", borderRadius: 4 } },
    colors: [C.success, C.warning],
    xaxis: {
      labels: { style: { fontSize: "11px", colors: C.body }, formatter: (v) => currency(Number(v)) },
      axisBorder: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: "10px", colors: C.body },
        formatter: (v: string | number) => String(v).length > 14 ? String(v).slice(0, 14) + "…" : String(v),
      },
    },
    tooltip: { y: { formatter: (v) => currency(v) } },
    legend: { position: "top", fontSize: "12px", labels: { colors: C.body } },
  };

  const series = [
    { name: "Paid",    data: top.map((i) => ({ x: i.instituteName, y: i.totalPaid })) },
    { name: "Pending", data: top.map((i) => ({ x: i.instituteName, y: i.totalPending })) },
  ];

  return <ReactApexChart type="bar" series={series} options={options} height={240} />;
}

// ─── Admin Approval Radial ────────────────────────────────────────────────────

function AdminApprovalRadial({ approved, pending }: { approved: number; pending: number }) {
  const total = approved + pending;
  const rate = total > 0 ? Math.round((approved / total) * 100) : 0;

  const options: ApexCharts.ApexOptions = {
    ...baseChart,
    chart: { ...baseChart.chart, type: "radialBar" },
    colors: [C.success],
    plotOptions: {
      radialBar: {
        hollow: { size: "55%" },
        dataLabels: {
          name: { fontSize: "13px", color: C.body, offsetY: -8 },
          value: { fontSize: "22px", fontWeight: 700, color: "#1e293b", offsetY: 4, formatter: (v) => `${v}%` },
        },
      },
    },
    labels: ["Approval Rate"],
  };

  return <ReactApexChart type="radialBar" series={[rate]} options={options} height={200} />;
}

// ─── Institute Health Bars ────────────────────────────────────────────────────

function InstituteHealthBars({ institutes }: { institutes: InstituteHealthReport[] }) {
  const top = institutes.slice(0, 6);
  const maxStudents = Math.max(...top.map((i) => i.users.students), 1);

  return (
    <ul className="space-y-3">
      {top.map((r) => {
        const feeRate = pct(r.fees.totalCollected, r.fees.totalBilled);
        const feeColor = feeRate >= 80 ? "bg-meta-3" : feeRate >= 50 ? "bg-warning" : "bg-meta-1";
        const barW = Math.round((r.users.students / maxStudents) * 100);
        return (
          <li key={r.institute.id}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="truncate max-w-[140px] font-medium text-black dark:text-white">
                {r.institute.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-body">{r.users.students} students</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${feeColor}`}>
                  {feeRate}% fees
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${barW}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Plan Distribution ────────────────────────────────────────────────────────

function PlanDistributionSection({ plans, isLoading }: { plans: Plan[]; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Plan Distribution</h2>
          </div>
          <Link href="/super-admin/plans" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Manage Plans <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          </div>
        ) : plans.length === 0 ? (
          <p className="py-6 text-center text-sm text-body">No plans configured.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan._id}
                className="rounded-sm border border-stroke bg-whiter p-4 dark:border-strokedark dark:bg-meta-4"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-black dark:text-white">
                      {plan.displayName ?? plan.name}
                    </p>
                    {plan.description && (
                      <p className="mt-0.5 text-xs text-body line-clamp-2">{plan.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    {plan.price ? `NLe ${plan.price}/yr` : "Free"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-stroke bg-white px-2 py-0.5 text-[10px] font-medium text-body dark:border-strokedark dark:bg-boxdark">
                    {plan.limits.maxStudents} Students
                  </span>
                  <span className="rounded-full border border-stroke bg-white px-2 py-0.5 text-[10px] font-medium text-body dark:border-strokedark dark:bg-boxdark">
                    {plan.limits.maxLecturers} Teachers
                  </span>
                  <span className="rounded-full border border-stroke bg-white px-2 py-0.5 text-[10px] font-medium text-body dark:border-strokedark dark:bg-boxdark">
                    {plan.limits.maxClasses} Classes
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Parent Portal Adoption ───────────────────────────────────────────────────

interface ParentRecord {
  _id: string;
  linkedStudents?: unknown[];
}

function ParentAdoptionCard({
  parents,
  isLoading,
  totalStudents,
}: {
  parents: ParentRecord[];
  isLoading: boolean;
  totalStudents: number;
}) {
  const totalParents = parents.length;
  const linkedStudents = parents.reduce((sum, p) => sum + (p.linkedStudents?.length ?? 0), 0);
  const adoptionRate = Math.min(Math.round((totalParents / Math.max(totalStudents, 1)) * 100), 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Parent Portal Adoption</h2>
          </div>
          <Link href="/admin/parents" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View Parents <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {[
                { label: "Total Parents", value: totalParents, color: "text-primary" },
                { label: "Students Linked", value: linkedStudents, color: "text-meta-3" },
                { label: "Total Students", value: totalStudents, color: "text-black dark:text-white" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-body">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-body">Adoption Rate</span>
                <span className="text-xs font-bold text-primary">{adoptionRate}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${adoptionRate}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Platform Activity Chart ──────────────────────────────────────────────────

function formatActionLabel(action: string) {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function PlatformActivityChart({
  summary,
  isLoading,
}: {
  summary: AuditLogSummary | undefined;
  isLoading: boolean;
}) {
  const top8 = useMemo(() => (summary?.byAction ?? []).slice(0, 8), [summary]);
  const totalEvents = useMemo(
    () => (summary?.byAction ?? []).reduce((s, a) => s + a.count, 0),
    [summary]
  );

  const options: ApexCharts.ApexOptions = useMemo(
    () => ({
      ...baseChart,
      chart: { ...baseChart.chart, type: "bar" },
      plotOptions: { bar: { horizontal: true, barHeight: "60%", borderRadius: 3 } },
      colors: [C.primary],
      xaxis: {
        labels: { style: { fontSize: "11px", colors: C.body } },
        axisBorder: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontSize: "10px", colors: C.body },
          formatter: (v: string | number) => formatActionLabel(String(v)),
        },
      },
      tooltip: { y: { formatter: (v: number) => `${v} events` } },
      categories: top8.map((a) => a.action),
    }),
    [top8]
  );

  const series = useMemo(
    () => [{ name: "Events", data: top8.map((a) => ({ x: a.action, y: a.count })) }],
    [top8]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Platform Activity
              {totalEvents > 0 && (
                <span className="ml-1.5 text-xs font-normal text-body">({totalEvents.toLocaleString()} total events)</span>
              )}
            </h2>
          </div>
          <Link href="/super-admin/audit-logs" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View All Logs <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-60">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          </div>
        ) : top8.length === 0 ? (
          <p className="py-10 text-center text-sm text-body">No activity data available.</p>
        ) : (
          <ReactApexChart type="bar" series={series} options={options} height={260} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Recent Audit Feed ────────────────────────────────────────────────────────

function auditBadgeClass(action: string): string {
  if (action === "LOGIN") return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300";
  if (action.startsWith("CREATE_")) return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  if (action.startsWith("DELETE_") || action.startsWith("SUSPEND_") || action.startsWith("ARCHIVE_"))
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  if (
    action.startsWith("UPDATE_") ||
    action.startsWith("RESET_") ||
    action.startsWith("UNSUSPEND_") ||
    action.startsWith("RESTORE_")
  )
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function RecentAuditFeed({
  logs,
  isLoading,
}: {
  logs: AuditLog[];
  isLoading: boolean;
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Recent Audit Feed</h2>
          </div>
          <Link href="/super-admin/audit-logs" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View All <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-body">No recent activity.</p>
        ) : (
          <ul className="divide-y divide-stroke dark:divide-strokedark">
            {logs.map((log) => (
              <li key={log._id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`shrink-0 max-w-[100px] truncate rounded px-1.5 py-0.5 text-[10px] font-semibold ${auditBadgeClass(log.action)}`}
                  title={log.action}
                >
                  {log.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-black dark:text-white">
                    {log.userFullName}
                  </p>
                  <p className="truncate text-[10px] text-body">{log.userEmail}</p>
                </div>
                <span className="shrink-0 text-[10px] text-body">{relativeTime(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Newly Onboarded Institutes ───────────────────────────────────────────────

function NewInstitutesList({
  growth,
  institutes,
}: {
  growth: GrowthTrends | undefined;
  institutes: InstituteHealthReport[];
}) {
  const recent6 = useMemo(() => {
    if (!growth) return [];
    return growth.institutes.slice(-6);
  }, [growth]);

  const maxCount = useMemo(() => Math.max(...recent6.map((p) => p.count), 1), [recent6]);

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Institute Onboarding</h2>
          </div>
          <Link href="/super-admin/institutes" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View All <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {recent6.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-body">Last 6 Months</p>
            <div className="flex items-end gap-1" style={{ height: 48 }}>
              {recent6.map((p) => {
                const barH = Math.max(Math.round((p.count / maxCount) * 100), 8);
                const label = `${MONTH_NAMES[(p.month ?? 1) - 1]} ${String(p.year ?? "").slice(2)}`;
                return (
                  <div key={`${p.year}-${p.month}`} className="flex flex-1 flex-col items-center gap-0.5">
                    <span className="text-[9px] font-bold text-primary">{p.count}</span>
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${barH}%` }}
                      title={`${label}: ${p.count}`}
                    />
                    <span className="text-[8px] text-body">{MONTH_NAMES[(p.month ?? 1) - 1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {institutes.length === 0 ? (
          <p className="py-4 text-center text-xs text-body">No institutes found.</p>
        ) : (
          <ul className="space-y-2.5">
            {institutes.slice(0, 6).map((r) => {
              const feeRate = pct(r.fees.totalCollected, r.fees.totalBilled);
              const feeColor =
                feeRate >= 80 ? "bg-meta-3" : feeRate >= 50 ? "bg-warning" : "bg-meta-1";
              return (
                <li key={r.institute.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-black dark:text-white">
                    {r.institute.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[10px] text-body">{r.users.students} stu</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white ${feeColor}`}>
                      {feeRate}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({ queryKey: ["super-stats"], queryFn: superAdminApi.getStats });
  const { data: overview } = useQuery<SystemOverview>({ queryKey: ["monitor-overview"], queryFn: monitorApi.getOverview });
  const { data: growth } = useQuery<GrowthTrends>({ queryKey: ["monitor-growth"], queryFn: () => monitorApi.getGrowth(6) });
  const { data: feeRevenue } = useQuery<FeeRevenueReport>({ queryKey: ["monitor-fee-revenue"], queryFn: monitorApi.getFeeRevenue });
  const { data: salary, isLoading: salaryLoading } = useQuery<SalaryExpenditureReport>({ queryKey: ["monitor-salary"], queryFn: monitorApi.getSalaryExpenditure });
  const { data: institutes = [] } = useQuery<InstituteHealthReport[]>({ queryKey: ["monitor-institutes"], queryFn: monitorApi.getInstitutes });
  const { data: pendingList = [] } = useQuery({ queryKey: ["pending-admins"], queryFn: superAdminApi.getPendingAdmins });

  const { data: auditFeed, isLoading: auditFeedLoading } = useQuery({
    queryKey: ["audit-feed"],
    queryFn: () => auditLogApi.getAll({ limit: 8, page: 1 }),
  });
  const { data: auditSummary, isLoading: auditSummaryLoading } = useQuery({
    queryKey: ["audit-summary"],
    queryFn: auditLogApi.getSummary,
  });
  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["plans-all"],
    queryFn: planApi.getAll,
  });
  const { data: parentsRaw = [], isLoading: parentsLoading } = useQuery<ParentRecord[]>({
    queryKey: ["admin-parents"],
    queryFn: adminParentApi.getAll as () => Promise<ParentRecord[]>,
  });

  const pendingAdmins = (pendingList as PendingAdmin[]).filter((a) => !a.approved);

  const approveMutation = useMutation({
    mutationFn: superAdminApi.approveAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-admins"] });
      queryClient.invalidateQueries({ queryKey: ["super-stats"] });
      queryClient.invalidateQueries({ queryKey: ["monitor-overview"] });
    },
  });

  // Platform totals
  const totalFeeCollectionRate = feeRevenue
    ? pct(feeRevenue.summary.totalCollected, feeRevenue.summary.totalBilled)
    : null;

  return (
    <div className="space-y-6">

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CardDataStats title="Institutes" total={String(stats?.institutes?.total ?? "—")} rate="" levelUp>
          <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Admins" total={String(stats?.admins?.total ?? "—")} rate={stats?.admins?.pending ? `${stats.admins.pending} pending` : ""} levelUp={false}>
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Teachers" total={String(stats?.lecturers?.total ?? "—")} rate="" levelUp>
          <Users className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Students" total={String(stats?.students?.total ?? "—")} rate="" levelUp>
          <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
      </div>

      {/* ── Revenue + Suspension summary row ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Total Fee Billed",
            value: overview ? currency(overview.fees.totalBilled) : "—",
            sub: "platform-wide",
            icon: <DollarSign className="h-5 w-5 text-primary" />,
            bg: "bg-primary/10",
          },
          {
            label: "Fee Collected",
            value: overview ? currency(overview.fees.totalCollected) : "—",
            sub: totalFeeCollectionRate != null ? `${totalFeeCollectionRate}% rate` : "",
            icon: <CheckCircle2 className="h-5 w-5 text-meta-3" />,
            bg: "bg-meta-3/10",
          },
          {
            label: "Salary Disbursed",
            value: overview ? currency(overview.salaries.totalDisbursed) : "—",
            sub: overview ? `${currency(overview.salaries.totalPending)} pending` : "",
            icon: <TrendingUp className="h-5 w-5 text-indigo-500" />,
            bg: "bg-indigo-500/10",
          },
          {
            label: "Suspended Users",
            value: overview
              ? String(overview.students.suspended + overview.lecturers.suspended + overview.admins.suspended)
              : "—",
            sub: "students + teachers + admins",
            icon: <Activity className="h-5 w-5 text-meta-1" />,
            bg: "bg-meta-1/10",
          },
        ].map(({ label, value, sub, icon, bg }) => (
          <div key={label} className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-body">{label}</p>
                <p className="mt-1 text-lg font-bold text-black dark:text-white truncate">{value}</p>
                {sub && <p className="mt-0.5 text-xs text-body">{sub}</p>}
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
                {icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Growth chart + User status donut ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Platform Growth (last 6 months)</h2>
          </CardHeader>
          <CardContent>
            {growth ? (
              <GrowthChart data={growth} />
            ) : (
              <div className="flex items-center justify-center h-60">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">User Status Breakdown</h2>
          </CardHeader>
          <CardContent>
            {overview ? (
              <UserStatusDonut overview={overview} />
            ) : (
              <div className="flex items-center justify-center h-60">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Fee revenue + Fee status donut ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Fee Revenue by Institute (Top 6)</h2>
          </CardHeader>
          <CardContent>
            {feeRevenue && feeRevenue.topInstitutes.length > 0 ? (
              <FeeRevenueChart data={feeRevenue} />
            ) : (
              <div className="flex items-center justify-center h-60">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Fee Payment Status</h2>
          </CardHeader>
          <CardContent>
            {feeRevenue && feeRevenue.byStatus.length > 0 ? (
              <>
                <FeeStatusDonut data={feeRevenue} />
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-body">Billed</p>
                    <p className="text-sm font-bold text-black dark:text-white">{currency(feeRevenue.summary.totalBilled)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-body">Collected</p>
                    <p className="text-sm font-bold text-meta-3">{currency(feeRevenue.summary.totalCollected)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-body">Outstanding</p>
                    <p className="text-sm font-bold text-meta-1">{currency(feeRevenue.summary.totalOutstanding)}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-60">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Salary chart + Admin approval radial ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Salary: Paid vs Pending by Institute</h2>
          </CardHeader>
          <CardContent>
            {salaryLoading ? (
              <div className="flex items-center justify-center h-60">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            ) : salary && Array.isArray(salary.byInstitute) && salary.byInstitute.length > 0 ? (
              <SalaryChart data={salary} />
            ) : (
              <div className="flex flex-col items-center justify-center h-60 gap-2 text-center">
                <p className="text-sm text-body">
                  {salary && (salary.summary?.totalRecords ?? 0) > 0
                    ? "Institute breakdown not available — records exist but aren't grouped by institute yet."
                    : "No salary records found."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Admin Approval Rate</h2>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {stats ? (
              <>
                <AdminApprovalRadial
                  approved={stats.admins.approved}
                  pending={stats.admins.pending}
                />
                <div className="mt-2 flex w-full justify-around text-center">
                  <div>
                    <p className="text-xs text-body">Approved</p>
                    <p className="text-lg font-bold text-meta-3">{stats.admins.approved}</p>
                  </div>
                  <div>
                    <p className="text-xs text-body">Pending</p>
                    <p className="text-lg font-bold text-warning">{stats.admins.pending}</p>
                  </div>
                  <div>
                    <p className="text-xs text-body">Total</p>
                    <p className="text-lg font-bold text-black dark:text-white">{stats.admins.total}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-52">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Institute health bars + Pending approvals ───────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-black dark:text-white">Institute Enrollment (Top 6)</h2>
              <Link href="/super-admin/institutes" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {institutes.length > 0 ? (
              <InstituteHealthBars institutes={institutes} />
            ) : (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-black dark:text-white">Pending Admin Requests</h2>
                {pendingAdmins.length > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-meta-1 px-1.5 text-[10px] font-bold text-white">
                    {pendingAdmins.length}
                  </span>
                )}
              </div>
              <Link href="/super-admin/admins" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingAdmins.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <ShieldCheck className="h-8 w-8 text-meta-3" aria-hidden="true" />
                <p className="text-sm text-body">All admin requests are approved.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {pendingAdmins.slice(0, 5).map((admin: PendingAdmin) => (
                  <li key={admin._id} className="flex items-center justify-between px-5 py-3.5 hover:bg-whiter transition-colors dark:hover:bg-meta-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                        {admin.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black dark:text-white">{admin.fullName}</p>
                        <p className="text-xs text-body">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="warning">
                        <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                        Pending
                      </Badge>
                      <Button
                        size="sm"
                        isLoading={approveMutation.isPending && approveMutation.variables === admin._id}
                        onClick={() => approveMutation.mutate(admin._id)}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Approve
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>


      {/* ── Row A: Parent Adoption + Platform Activity ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ParentAdoptionCard
          parents={parentsRaw}
          isLoading={parentsLoading}
          totalStudents={overview?.students.total ?? 0}
        />
        <PlatformActivityChart
          summary={auditSummary}
          isLoading={auditSummaryLoading}
        />
      </div>

      {/* ── Row B: Recent Audit Feed + New Institutes ──────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentAuditFeed
          logs={auditFeed?.data ?? []}
          isLoading={auditFeedLoading}
        />
        <NewInstitutesList
          growth={growth}
          institutes={institutes}
        />
      </div>

      {/* ── Row C: Plan Distribution ───────────────────────────────────────── */}
      <PlanDistributionSection plans={plans} isLoading={plansLoading} />

    </div>
  );
}
