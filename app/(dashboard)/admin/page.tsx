"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { adminParentApi } from "@/lib/api/parent";
import { subjectApi } from "@/lib/api/subject";
import CardDataStats from "@/components/ui/CardDataStats";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import TodayAttendanceCard from "@/components/ui/TodayAttendanceCard";
import AcademicCalendarWidget from "@/components/ui/AcademicCalendarWidget";
import { useAuth } from "@/context/AuthContext";
import {
  GraduationCap,
  Users,
  School,
  BookOpen,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sun,
  Sunset,
  Moon,
  Heart,
} from "lucide-react";
import type { FeeByClass, FeeByStatus, FeeDefaulter, FeeCollectionTrend, AuthUser, LinkedStudent } from "@/lib/types";
import { useClassLabel } from "@/hooks/useClassLabel";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function fmt(n: number) {
  return `NLe ${n.toLocaleString()}`;
}

function statusVariant(status: string): "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "partial") return "warning";
  return "danger";
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ─── Welcome Banner ───────────────────────────────────────────────────────────

function WelcomeBanner({ name }: { name: string }) {
  const now = useClock();
  const hour = now.getHours();

  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const GreetIcon =
    hour < 12 ? Sun : hour < 17 ? Sunset : Moon;
  const gradients = [
    hour < 12
      ? "from-orange-400/20 to-yellow-300/10"
      : hour < 17
      ? "from-blue-500/20 to-indigo-400/10"
      : "from-violet-600/20 to-indigo-500/10",
  ][0];

  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const firstName = name.split(" ")[0];

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-linear-to-br from-primary to-indigo-700 p-6 shadow-lg`}>
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-7.5 left-[20%] h-40 w-40 rounded-full bg-white/5 blur-2xl" />

      <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        {/* Left — greeting */}
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm`}>
            <GreetIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-white/60 uppercase tracking-widest">{greeting}</p>
            <h1 className="text-2xl font-extrabold text-white">{firstName} 👋</h1>
            <p className="mt-0.5 text-sm text-white/60">Here&apos;s what&apos;s happening at your school today.</p>
          </div>
        </div>

        {/* Right — date & clock */}
        <div className="mt-4 flex flex-col items-start gap-1 rounded-xl bg-white/10 px-5 py-3 backdrop-blur-sm sm:mt-0 sm:items-end">
          <p className="text-2xl font-bold tabular-nums tracking-tight text-white">{timeStr}</p>
          <p className="text-xs text-white/60">{dateStr}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Collection Rate Bar ──────────────────────────────────────────────────────

function CollectionBar({ rate, size = "md" }: { rate: number; size?: "sm" | "md" }) {
  const pct = Math.min(100, Math.max(0, rate));
  const color = pct >= 75 ? "bg-meta-3" : pct >= 40 ? "bg-warning" : "bg-meta-1";
  return (
    <div className={`w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark ${size === "sm" ? "h-1.5" : "h-2"}`}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Summary stat card ────────────────────────────────────────────────────────

function FeeStat({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-body">{label}</p>
          <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-body">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color === "text-meta-3" ? "bg-meta-3/10" : color === "text-meta-1" ? "bg-meta-1/10" : "bg-primary/10"}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Chart colours ────────────────────────────────────────────────────────────

const CHART_COLORS = {
  primary:  "#3c50e0",
  success:  "#10b981",
  danger:   "#fb5454",
  warning:  "#f59e0b",
  indigo:   "#6366f1",
  stroke:   "#e2e8f0",
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const adminName = user?.fullName ?? user?.email ?? "Admin";
  const { plural: classesLabel } = useClassLabel();

  const { data: students = [] } = useQuery({ queryKey: ["admin-students"], queryFn: adminApi.getStudents });
  const { data: lecturers = [] } = useQuery({ queryKey: ["admin-lecturers"], queryFn: adminApi.getLecturers });
  const { data: classes = [] } = useQuery({ queryKey: ["admin-classes"], queryFn: adminApi.getClasses });
  const { data: assignments = [] } = useQuery({ queryKey: ["admin-assignments"], queryFn: adminApi.getAssignments });
  const { data: feeSummary } = useQuery({ queryKey: ["fee-summary"], queryFn: adminApi.getFeeSummary });
  const { data: feeByClass = [] } = useQuery({ queryKey: ["fee-by-class"], queryFn: adminApi.getFeeByClass });
  const { data: feeByStatus = [] } = useQuery({ queryKey: ["fee-by-status"], queryFn: adminApi.getFeeByStatus });
  const { data: defaulters = [] } = useQuery({ queryKey: ["fee-defaulters"], queryFn: () => adminApi.getFeeDefaulters(8) });
  const { data: trend = [] } = useQuery({ queryKey: ["fee-trend"], queryFn: adminApi.getFeeCollectionTrend });
  const { data: subjects = [] } = useQuery({ queryKey: ["admin-subjects"], queryFn: subjectApi.getAll });
  const { data: parents = [] } = useQuery({ queryKey: ["admin-parents"], queryFn: adminParentApi.getAll });

  const trendSlice = [...(trend as FeeCollectionTrend[])].slice(-6);

  // ── ApexChart: Collection Trend (grouped column) ────────────────────────────
  const trendChartOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: { type: "area", toolbar: { show: false }, background: "transparent" },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    dataLabels: { enabled: false },
    colors: [CHART_COLORS.primary, CHART_COLORS.success],
    xaxis: {
      categories: trendSlice.map((t) => `${MONTH_NAMES[t.month - 1]} ${t.year}`),
      labels: { style: { fontSize: "11px", colors: "#64748b" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (v: number) =>
          v >= 1_000_000
            ? `NLe ${(v / 1_000_000).toFixed(1)}M`
            : v >= 1_000
            ? `NLe ${(v / 1_000).toFixed(0)}k`
            : `NLe ${v}`,
        style: { fontSize: "11px", colors: "#64748b" },
      },
    },
    tooltip: {
      y: { formatter: (v: number) => `NLe ${v.toLocaleString()}` },
    },
    legend: { position: "top", fontSize: "12px" },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    theme: { mode: "light" },
  }), [trendSlice]); // eslint-disable-line react-hooks/exhaustive-deps
  const trendChartSeries = [
    { name: "Billed", data: trendSlice.map((t) => t.totalBilled) },
    { name: "Collected", data: trendSlice.map((t) => t.totalCollected) },
  ];

  // ── ApexChart: Fee Status Donut ─────────────────────────────────────────────
  const statusData = (feeByStatus as FeeByStatus[]);
  const donutSeries = statusData.map((s) => s.count);
  const donutLabels = statusData.map((s) => s.status.charAt(0).toUpperCase() + s.status.slice(1));
  const donutColors = statusData.map((s) =>
    s.status === "paid" ? CHART_COLORS.success : s.status === "partial" ? CHART_COLORS.warning : CHART_COLORS.danger
  );
  const donutOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: { type: "donut", background: "transparent" },
    labels: donutLabels,
    colors: donutColors,
    legend: { position: "bottom", fontSize: "12px" },
    dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(1)}%` },
    plotOptions: { pie: { donut: { size: "62%", labels: {
      show: true,
      total: {
        show: true,
        label: "Students",
        fontSize: "13px",
        color: "#64748b",
        formatter: () => String(donutSeries.reduce((a, b) => a + b, 0)),
      },
    } } } },
    tooltip: { y: { formatter: (v: number) => `${v} student${v !== 1 ? "s" : ""}` } },
    theme: { mode: "light" },
  }), [feeByStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ApexChart: Fee by Class horizontal bar ──────────────────────────────────
  const classBars = (feeByClass as FeeByClass[]).slice(0, 10);
  const classBarOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
    plotOptions: { bar: { horizontal: true, barHeight: "55%", borderRadius: 4 } },
    dataLabels: { enabled: true, formatter: (v: number) => `${v}%`, style: { fontSize: "11px" } },
    colors: [CHART_COLORS.primary],
    xaxis: {
      categories: classBars.map((c) => c.className),
      max: 100,
      labels: { formatter: (v: string) => `${v}%`, style: { fontSize: "11px", colors: "#64748b" } },
      axisBorder: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px", colors: "#64748b" } } },
    tooltip: {
      y: {
        formatter: (_v: number, opts?: { dataPointIndex?: number }) => {
          const c = classBars[opts?.dataPointIndex ?? -1];
          return c ? `${c.collectionRate}% — ${fmt(c.totalCollected)} / ${fmt(c.totalExpected)}` : "";
        },
      },
    },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    theme: { mode: "light" },
  }), [classBars]); // eslint-disable-line react-hooks/exhaustive-deps
  const classBarSeries = [{ name: "Collection Rate", data: classBars.map((c) => c.collectionRate) }];

  return (
    <div className="space-y-6">

      {/* ── Welcome Banner ─────────────────────────────────────────────────── */}
      <WelcomeBanner name={adminName} />

      {/* ── Top stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <CardDataStats title="Total Students" total={String(students.length)} rate="" levelUp>
          <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Teachers" total={String(lecturers.length)} rate="" levelUp>
          <Users className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title={classesLabel} total={String(classes.length)} rate="" levelUp>
          <School className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Assignments" total={String(assignments.length)} rate="" levelUp>
          <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Parents" total={String(parents.length)} rate="" levelUp>
          <Heart className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
      </div>

      {/* ── Today's Attendance ─────────────────────────────────────────────── */}
      <TodayAttendanceCard classes={classes} subjects={subjects} />

      {/* ── Fee Analysis header ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-black dark:text-white">Fee Analysis</h2>
        <p className="text-xs text-body">Overview of fee collection across the institution</p>
      </div>

      {/* ── Fee summary stat cards ─────────────────────────────────────────── */}
      {feeSummary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeeStat
            label="Total Expected"
            value={fmt(feeSummary.totalExpected)}
            sub={`${feeSummary.totalStudents} student${feeSummary.totalStudents !== 1 ? "s" : ""}`}
            icon={<DollarSign className="h-5 w-5 text-primary" />}
            color="text-primary"
          />
          <FeeStat
            label="Total Collected"
            value={fmt(feeSummary.totalCollected)}
            sub={`${feeSummary.collectionRate}% collection rate`}
            icon={<CheckCircle2 className="h-5 w-5 text-meta-3" />}
            color="text-meta-3"
          />
          <FeeStat
            label="Outstanding"
            value={fmt(feeSummary.totalOutstanding)}
            sub={`${feeSummary.unpaidCount + feeSummary.partialCount} unpaid / partial`}
            icon={<AlertCircle className="h-5 w-5 text-meta-1" />}
            color="text-meta-1"
          />
          <FeeStat
            label="Collection Rate"
            value={`${feeSummary.collectionRate}%`}
            sub={`${feeSummary.paidCount} fully paid`}
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
            color="text-primary"
          />
        </div>
      )}

      {/* ── Collection rate bar (full width) ──────────────────────────────── */}
      {feeSummary && (
        <div className="rounded-sm border border-stroke bg-white px-5 py-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-black dark:text-white">Overall Collection Rate</span>
            <span className="font-semibold text-primary">{feeSummary.collectionRate}%</span>
          </div>
          <CollectionBar rate={feeSummary.collectionRate} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-body">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-meta-3" />
              Paid: {feeSummary.paidCount}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-warning" />
              Partial: {feeSummary.partialCount}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-meta-1" />
              Unpaid: {feeSummary.unpaidCount}
            </span>
          </div>
        </div>
      )}

      {/* ── Charts row: Status Donut + Collection Trend ────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Fee Status Donut */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Fee Status Breakdown</h2>
            <p className="text-xs text-body">Distribution by payment status</p>
          </CardHeader>
          <CardContent>
            {donutSeries.length === 0 || donutSeries.every((v) => v === 0) ? (
              <p className="py-6 text-sm text-body">No fee data yet.</p>
            ) : (
              <>
                <ReactApexChart
                  type="donut"
                  series={donutSeries}
                  options={donutOptions}
                  height={260}
                />
                {/* Amount breakdown below donut */}
                <div className="mt-2 divide-y divide-stroke dark:divide-strokedark">
                  {statusData.map((s) => (
                    <div key={s.status} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2 text-xs">
                        {s.status === "paid" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-meta-3" />
                        ) : s.status === "partial" ? (
                          <Clock className="h-3.5 w-3.5 text-warning" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-meta-1" />
                        )}
                        <span className="capitalize text-black dark:text-white">{s.status}</span>
                      </div>
                      <div className="text-right text-xs">
                        <span className="font-semibold text-black dark:text-white">{fmt(s.totalCollected)}</span>
                        {s.totalOutstanding > 0 && (
                          <span className="ml-2 text-meta-1">{fmt(s.totalOutstanding)} due</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Collection Trend Area Chart */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Collection Trend</h2>
            <p className="text-xs text-body">Last {trendSlice.length} months — billed vs collected</p>
          </CardHeader>
          <CardContent>
            {trendSlice.length === 0 ? (
              <p className="py-6 text-sm text-body">No trend data yet.</p>
            ) : (
              <ReactApexChart
                type="area"
                series={trendChartSeries}
                options={trendChartOptions}
                height={280}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Fee by Class horizontal bar chart ──────────────────────────────── */}
      {classBars.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Collection Rate by Class</h2>
            <p className="text-xs text-body">Top {classBars.length} classes</p>
          </CardHeader>
          <CardContent>
            <ReactApexChart
              type="bar"
              series={classBarSeries}
              options={classBarOptions}
              height={Math.max(200, classBars.length * 42)}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Fee by Class detail table ───────────────────────────────────────── */}
      {(feeByClass as FeeByClass[]).length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Fee Collection by Class</h2>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-body">Class</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-body">Expected</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-body">Collected</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-body">Outstanding</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-body">Rate</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-body">Students</th>
                </tr>
              </thead>
              <tbody>
                {(feeByClass as FeeByClass[]).map((c) => (
                  <tr key={c.classId} className="border-b border-stroke last:border-b-0 hover:bg-meta-2 transition-colors dark:border-strokedark dark:hover:bg-meta-4">
                    <td className="px-5 py-3 font-medium text-black dark:text-white">{c.className}</td>
                    <td className="px-5 py-3 text-right text-body">{fmt(c.totalExpected)}</td>
                    <td className="px-5 py-3 text-right font-medium text-meta-3">{fmt(c.totalCollected)}</td>
                    <td className="px-5 py-3 text-right text-meta-1">{fmt(c.totalOutstanding)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <CollectionBar rate={c.collectionRate} size="sm" />
                        <span className="shrink-0 text-xs text-body">{c.collectionRate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center text-body">{c.totalStudents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Defaulters + Recent students ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Top Defaulters */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Top Defaulters</h2>
            <p className="text-xs text-body">Students with highest outstanding balance</p>
          </CardHeader>
          <CardContent className="p-0">
            {(defaulters as FeeDefaulter[]).length === 0 ? (
              <p className="px-5 py-6 text-sm text-body">No defaulters found.</p>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {(defaulters as FeeDefaulter[]).map((d) => (
                  <li key={d._id} className="flex items-center justify-between gap-2 px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-meta-1/10 text-xs font-bold text-meta-1 uppercase">
                        {d.student.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-black dark:text-white">{d.student.fullName}</p>
                        <p className="text-xs text-body">{d.class.name}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-meta-1">{fmt(d.balance)}</p>
                      <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Students */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Recent Students</h2>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <p className="px-5 py-6 text-sm text-body">No students yet.</p>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {students.slice(0, 6).map((s) => (
                  <li key={s._id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-meta-2 text-xs font-bold text-primary uppercase dark:bg-meta-4 dark:text-white">
                        {s.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black dark:text-white">{s.fullName}</p>
                        <p className="text-xs text-body">{s.email}</p>
                      </div>
                    </div>
                    <Badge variant={s.approved ? "success" : "warning"}>
                      {s.approved ? "Active" : "Pending"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Academic Calendar ─────────────────────────────────────────────── */}
      <AcademicCalendarWidget />

      {/* ── Parents Overview ───────────────────────────────────────────────── */}
      {(parents as (AuthUser & { linkedStudents?: LinkedStudent[] })[]).length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Parents Overview</h2>
            <p className="text-xs text-body">
              {parents.length} registered parent{parents.length !== 1 ? "s" : ""}
              {" — "}
              {(parents as (AuthUser & { linkedStudents?: LinkedStudent[] })[]).reduce(
                (acc, p) => acc + (p.linkedStudents?.length ?? 0), 0
              )} linked student{
                (parents as (AuthUser & { linkedStudents?: LinkedStudent[] })[]).reduce(
                  (acc, p) => acc + (p.linkedStudents?.length ?? 0), 0
                ) !== 1 ? "s" : ""
              }
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-stroke dark:divide-strokedark">
              {(parents as (AuthUser & { linkedStudents?: LinkedStudent[] })[]).slice(0, 8).map((p) => (
                <li key={p._id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-meta-2 text-xs font-bold text-primary uppercase dark:bg-meta-4 dark:text-white">
                      {p.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">{p.fullName}</p>
                      <p className="text-xs text-body">{p.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                      {p.linkedStudents?.length ?? 0} child{(p.linkedStudents?.length ?? 0) !== 1 ? "ren" : ""}
                    </span>
                    <Badge variant={p.isActive ? "success" : "danger"}>
                      {p.isActive ? "Active" : "Revoked"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
