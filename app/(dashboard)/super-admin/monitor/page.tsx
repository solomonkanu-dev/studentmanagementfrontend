"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  Monitor,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  DollarSign,
  TrendingUp,
  ChevronRight,
  X,
  BarChart2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import type { InstituteDeepReport, GrowthPoint } from "@/lib/types";

// ApexCharts — SSR-safe dynamic import
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `NLe ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `NLe ${(n / 1_000).toFixed(1)}K`;
  return `NLe ${n.toLocaleString()}`;
}

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthLabel(p: GrowthPoint) {
  return `${MONTH_NAMES[(p.month - 1) % 12]} ${String(p.year).slice(2)}`;
}

// Merge growth series into unified month slots
function mergeGrowthSeries(
  series: { label: string; color: string; data: GrowthPoint[] }[]
) {
  const keySet = new Set<string>();
  series.forEach((s) =>
    s.data.forEach((p) => keySet.add(`${p.year}-${p.month}`))
  );
  const keys = Array.from(keySet).sort();
  return keys.map((k) => {
    const [y, m] = k.split("-").map(Number);
    const label = monthLabel({ year: y, month: m, count: 0 });
    const vals: Record<string, number> = {};
    series.forEach((s) => {
      const found = s.data.find((p) => p.year === y && p.month === m);
      vals[s.label] = found?.count ?? 0;
    });
    return { label, ...vals };
  });
}

function ProgressBar({ value, max, color = "bg-indigo-500" }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
      <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",  label: "Overview",    icon: Monitor },
  { id: "institutes", label: "Institutes",  icon: Building2 },
  { id: "growth",    label: "Growth",      icon: TrendingUp },
  { id: "fees",      label: "Fee Revenue", icon: CreditCard },
  { id: "salary",    label: "Salary",      icon: DollarSign },
] as const;
type TabId = typeof TABS[number]["id"];

// ─── Institute deep-dive modal ─────────────────────────────────────────────────

function DeepModal({ instituteId, name, onClose }: { instituteId: string; name: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<InstituteDeepReport>({
    queryKey: ["monitor-deep", instituteId],
    queryFn: () => monitorApi.getInstituteDeep(instituteId),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{name}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Deep-dive report</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Users breakdown */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Users
                </h3>
                <div className="space-y-2">
                  {data.users.map((u) => (
                    <div key={u.role} className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                      <span className="w-24 text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
                        {u.role.replace("_", " ")}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{u.total}</span>
                      <span className="ml-auto flex gap-3 text-xs">
                        <span className="text-emerald-600">{u.active} active</span>
                        {u.suspended > 0 && <span className="text-red-500">{u.suspended} suspended</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Academics */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Academics
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Classes", value: data.academics.classes },
                    { label: "Subjects", value: data.academics.subjects },
                    { label: "Assignments", value: data.academics.assignments },
                    { label: "Results", value: data.academics.results },
                    { label: "Attendance", value: data.academics.attendanceRecords },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center dark:border-gray-700 dark:bg-gray-800">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{item.value.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fees */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Fees
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Billed</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{fmt(data.fees.totalBilled)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Collected</span>
                    <span className="font-semibold text-emerald-600">{fmt(data.fees.totalCollected)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Outstanding</span>
                    <span className="font-semibold text-red-500">{fmt(data.fees.outstanding)}</span>
                  </div>
                  <ProgressBar value={data.fees.totalCollected} max={data.fees.totalBilled} color="bg-emerald-500" />
                  <p className="text-xs text-gray-500">{pct(data.fees.totalCollected, data.fees.totalBilled)}% collected</p>
                </div>
              </div>

              {/* Salaries */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Salaries
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Disbursed</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{fmt(data.salaries.totalDisbursed)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Paid</span>
                    <span className="font-semibold text-emerald-600">{fmt(data.salaries.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Pending</span>
                    <span className="font-semibold text-amber-500">{fmt(data.salaries.totalPending)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gray-500">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["monitor-overview"],
    queryFn: monitorApi.getOverview,
  });

  if (isLoading) return <Loader />;

  const d = data!;
  const feeRate = pct(d.fees.totalCollected, d.fees.totalBilled);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Institutes & Users */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Platform</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Institutes" value={d.institutes.total} sub={`${d.institutes.active} active`} icon={Building2} color="bg-red-600" />
          <StatCard label="Admins" value={d.admins.total} sub={`${d.admins.pending} pending approval`} icon={ShieldCheck} color="bg-indigo-600" />
          <StatCard label="Students" value={d.students.total} sub={`${d.students.active} active`} icon={GraduationCap} color="bg-teal-600" />
          <StatCard label="Teachers" value={d.lecturers.total} sub={`${d.lecturers.active} active`} icon={BookOpen} color="bg-orange-500" />
        </div>
      </div>

      {/* Finance */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Finance</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Fees block — radial gauge */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Fee Revenue</h3>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {feeRate}% collected
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <ApexChart
                  type="radialBar"
                  height={160}
                  series={[feeRate]}
                  options={{
                    chart: { background: "transparent" },
                    plotOptions: {
                      radialBar: {
                        hollow: { size: "55%" },
                        dataLabels: {
                          name: { show: false },
                          value: { fontSize: "22px", fontWeight: "bold", color: "#10b981", offsetY: 8 },
                        },
                        track: { background: "#f0fdf4" },
                      },
                    },
                    colors: ["#10b981"],
                    theme: { mode: "light" },
                  }}
                />
              </div>
              <div className="space-y-2 text-sm min-w-0 flex-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Billed</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-xs">{fmt(d.fees.totalBilled)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Collected</span>
                  <span className="font-semibold text-emerald-600 text-xs">{fmt(d.fees.totalCollected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Outstanding</span>
                  <span className="font-semibold text-red-500 text-xs">{fmt(d.fees.totalOutstanding)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Salaries block — radial gauge */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Salary Expenditure</h3>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                {pct(d.salaries.totalPaid, d.salaries.totalDisbursed)}% paid
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <ApexChart
                  type="radialBar"
                  height={160}
                  series={[pct(d.salaries.totalPaid, d.salaries.totalDisbursed)]}
                  options={{
                    chart: { background: "transparent" },
                    plotOptions: {
                      radialBar: {
                        hollow: { size: "55%" },
                        dataLabels: {
                          name: { show: false },
                          value: { fontSize: "22px", fontWeight: "bold", color: "#6366f1", offsetY: 8 },
                        },
                        track: { background: "#eef2ff" },
                      },
                    },
                    colors: ["#6366f1"],
                    theme: { mode: "light" },
                  }}
                />
              </div>
              <div className="space-y-2 text-sm min-w-0 flex-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Disbursed</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-xs">{fmt(d.salaries.totalDisbursed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Paid</span>
                  <span className="font-semibold text-emerald-600 text-xs">{fmt(d.salaries.totalPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Pending</span>
                  <span className="font-semibold text-amber-500 text-xs">{fmt(d.salaries.totalPending)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suspended users alert */}
      {(d.admins.suspended + d.students.suspended + d.lecturers.suspended > 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Suspended accounts: </span>
            {d.admins.suspended > 0 && `${d.admins.suspended} admin${d.admins.suspended > 1 ? "s" : ""}, `}
            {d.lecturers.suspended > 0 && `${d.lecturers.suspended} lecturer${d.lecturers.suspended > 1 ? "s" : ""}, `}
            {d.students.suspended > 0 && `${d.students.suspended} student${d.students.suspended > 1 ? "s" : ""}`}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Institutes ──────────────────────────────────────────────────────────

function InstitutesTab() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["monitor-institutes"],
    queryFn: monitorApi.getInstitutes,
  });
  const [deep, setDeep] = useState<{ id: string; name: string } | null>(null);

  if (isLoading) return <Loader />;

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {["Institute","Students","Teachers","Classes","Subjects","Billed","Collected","Rate",""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {data.map((row) => {
                const rate = pct(row.fees.totalCollected, row.fees.totalBilled);
                return (
                  <tr key={row.institute.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{row.institute.name}</p>
                      {row.institute.email && <p className="text-xs text-gray-400">{row.institute.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.users.students}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.users.lecturers}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.academics.classes}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.academics.subjects}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmt(row.fees.totalBilled)}</td>
                    <td className="px-4 py-3 font-medium text-emerald-600">{fmt(row.fees.totalCollected)}</td>
                    <td className="px-4 py-3 min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={row.fees.totalCollected} max={row.fees.totalBilled} color={rate >= 70 ? "bg-emerald-500" : rate >= 40 ? "bg-amber-400" : "bg-red-500"} />
                        <span className={`text-xs font-semibold ${rate >= 70 ? "text-emerald-600" : rate >= 40 ? "text-amber-500" : "text-red-500"}`}>
                          {rate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeep({ id: row.institute.id, name: row.institute.name })}
                        className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        Details <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {deep && <DeepModal instituteId={deep.id} name={deep.name} onClose={() => setDeep(null)} />}
    </>
  );
}

// ─── Tab: Growth ──────────────────────────────────────────────────────────────

function GrowthTab() {
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useQuery({
    queryKey: ["monitor-growth", months],
    queryFn: () => monitorApi.getGrowth(months),
  });

  if (isLoading) return <Loader />;
  if (!data) return null;

  const SERIES = [
    { label: "students",   color: "bg-teal-500",   text: "text-teal-600" },
    { label: "lecturers",  color: "bg-orange-400",  text: "text-orange-600" },
    { label: "admins",     color: "bg-indigo-500",  text: "text-indigo-600" },
    { label: "institutes", color: "bg-red-500",     text: "text-red-600" },
  ] as const;

  const merged = mergeGrowthSeries(
    SERIES.map((s) => ({ label: s.label, color: s.color, data: data[s.label as keyof typeof data] as GrowthPoint[] }))
  );

  const maxVal = Math.max(1, ...merged.flatMap((m) => SERIES.map((s) => (m as unknown as Record<string, number>)[s.label] ?? 0)));

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {[3, 6, 12, 24].map((m) => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              months === m
                ? "bg-red-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {m}m
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {SERIES.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-full ${s.color}`} />
            <span className={`text-xs font-medium capitalize ${s.text}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ApexCharts area chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        {merged.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No registration data for this period</p>
        ) : (
          <ApexChart
            type="area"
            height={260}
            series={SERIES.map((s) => ({
              name: s.label.charAt(0).toUpperCase() + s.label.slice(1),
              data: merged.map((m) => (m as unknown as Record<string, number>)[s.label] ?? 0),
            }))}
            options={{
              chart: { toolbar: { show: false }, background: "transparent", sparkline: { enabled: false } },
              dataLabels: { enabled: false },
              stroke: { curve: "smooth", width: 2 },
              fill: { type: "gradient", gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
              colors: ["#14b8a6", "#f97316", "#6366f1", "#ef4444"],
              xaxis: {
                categories: merged.map((m) => m.label),
                labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
                axisBorder: { show: false },
                axisTicks: { show: false },
              },
              yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "11px" } }, min: 0 },
              tooltip: { shared: true, intersect: false },
              legend: { show: false },
              grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
              theme: { mode: "light" },
            }}
          />
        )}
      </div>

      {/* Table summary */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Month</th>
                {SERIES.map((s) => (
                  <th key={s.label} className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider capitalize ${s.text}`}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {merged.map((m) => (
                <tr key={m.label} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                  <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300">{m.label}</td>
                  {SERIES.map((s) => (
                    <td key={s.label} className={`px-4 py-2.5 text-right font-semibold ${s.text}`}>
                      {(m as unknown as Record<string, number>)[s.label] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Fee Revenue ─────────────────────────────────────────────────────────

function FeeRevenueTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["monitor-fee-revenue"],
    queryFn: monitorApi.getFeeRevenue,
  });

  if (isLoading) return <Loader />;
  if (!data) return null;

  const { summary, byStatus, topInstitutes } = data;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Billed" value={fmt(summary.totalBilled ?? 0)} icon={BarChart2} color="bg-gray-600" />
        <StatCard label="Collected" value={fmt(summary.totalCollected ?? 0)} sub={`${summary.collectionRate ?? 0}% rate`} icon={CheckCircle2} color="bg-emerald-600" />
        <StatCard label="Outstanding" value={fmt(summary.totalOutstanding ?? 0)} icon={AlertCircle} color="bg-red-500" />
        <StatCard label="Records" value={(summary.totalRecords ?? 0).toLocaleString()} sub={`${summary.paidCount} paid · ${summary.unpaidCount} unpaid`} icon={CreditCard} color="bg-indigo-600" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* By Status — donut chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Collection Status</h3>
          <ApexChart
            type="donut"
            height={240}
            series={byStatus.map((s) => s.count)}
            options={{
              labels: byStatus.map((s) => s.status.charAt(0).toUpperCase() + s.status.slice(1)),
              colors: byStatus.map((s) => s.status === "paid" ? "#10b981" : s.status === "partial" ? "#f59e0b" : "#ef4444"),
              legend: { position: "bottom", fontSize: "12px" },
              dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
              plotOptions: { pie: { donut: { size: "60%", labels: { show: true, total: { show: true, label: "Total", fontSize: "12px" } } } } },
              tooltip: { y: { formatter: (v: number) => `${v} records` } },
              chart: { background: "transparent" },
              theme: { mode: "light" },
            }}
          />
        </div>

        {/* Top Institutes — horizontal bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Top Institutes by Collection</h3>
          <ApexChart
            type="bar"
            height={240}
            series={[
              { name: "Collected", data: topInstitutes.map((i) => i.totalCollected) },
              { name: "Outstanding", data: topInstitutes.map((i) => i.outstanding) },
            ]}
            options={{
              chart: { toolbar: { show: false }, background: "transparent", stacked: false },
              plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: "top" } } },
              colors: ["#10b981", "#ef4444"],
              xaxis: {
                categories: topInstitutes.map((i) => i.instituteName.length > 16 ? i.instituteName.slice(0, 16) + "…" : i.instituteName),
                labels: { style: { colors: "#94a3b8", fontSize: "10px" }, formatter: (v: number) => fmt(v) },
              },
              yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "10px" } } },
              tooltip: { y: { formatter: (v: number) => fmt(v) } },
              legend: { position: "top", fontSize: "11px" },
              dataLabels: { enabled: false },
              grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
              theme: { mode: "light" },
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Salary Expenditure ──────────────────────────────────────────────────

function SalaryTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["monitor-salary"],
    queryFn: monitorApi.getSalaryExpenditure,
  });

  if (isLoading) return <Loader />;
  if (!data) return null;

  const { summary, byStatus, byInstitute } = data;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Disbursed" value={fmt(summary.totalDisbursed ?? 0)} icon={DollarSign} color="bg-indigo-600" />
        <StatCard label="Paid" value={fmt(summary.totalPaid ?? 0)} sub={`${summary.paidCount} payments`} icon={CheckCircle2} color="bg-emerald-600" />
        <StatCard label="Pending" value={fmt(summary.totalPending ?? 0)} sub={`${summary.pendingCount} pending`} icon={Clock} color="bg-amber-500" />
        <StatCard label="Records" value={(summary.totalRecords ?? 0).toLocaleString()} icon={BarChart2} color="bg-gray-600" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* By Status — donut */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Payment Status</h3>
          <ApexChart
            type="donut"
            height={240}
            series={byStatus.map((s) => s.count)}
            options={{
              labels: byStatus.map((s) => s.status.charAt(0).toUpperCase() + s.status.slice(1)),
              colors: byStatus.map((s) => s.status === "paid" ? "#10b981" : s.status === "pending" ? "#f59e0b" : "#ef4444"),
              legend: { position: "bottom", fontSize: "12px" },
              dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
              plotOptions: { pie: { donut: { size: "60%", labels: { show: true, total: { show: true, label: "Payments", fontSize: "12px" } } } } },
              tooltip: { y: { formatter: (v: number) => `${v} payments` } },
              chart: { background: "transparent" },
              theme: { mode: "light" },
            }}
          />
        </div>

        {/* By Institute — grouped bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Salary by Institute</h3>
          <ApexChart
            type="bar"
            height={240}
            series={[
              { name: "Paid", data: byInstitute.map((i) => i.totalPaid) },
              { name: "Pending", data: byInstitute.map((i) => i.totalPending) },
            ]}
            options={{
              chart: { toolbar: { show: false }, background: "transparent", stacked: true },
              plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
              colors: ["#10b981", "#f59e0b"],
              xaxis: {
                categories: byInstitute.map((i) => i.instituteName.length > 16 ? i.instituteName.slice(0, 16) + "…" : i.instituteName),
                labels: { style: { colors: "#94a3b8", fontSize: "10px" }, formatter: (v: number) => fmt(v) },
              },
              yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "10px" } } },
              tooltip: { y: { formatter: (v: number) => fmt(v) } },
              legend: { position: "top", fontSize: "11px" },
              dataLabels: { enabled: false },
              grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
              theme: { mode: "light" },
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Loader ───────────────────────────────────────────────────────────────────

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    </div>
  );
}
