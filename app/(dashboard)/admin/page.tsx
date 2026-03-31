"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { subjectApi } from "@/lib/api/subject";
import CardDataStats from "@/components/ui/CardDataStats";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import TodayAttendanceCard from "@/components/ui/TodayAttendanceCard";
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
} from "lucide-react";
import type { FeeByClass, FeeByStatus, FeeDefaulter, FeeCollectionTrend } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function fmt(n: number) {
  if (n >= 1_000_000) return `Nle ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Nle ${(n / 1_000).toFixed(1)}k`;
  return `Nle ${n.toLocaleString()}`;
}

function statusVariant(status: string): "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "partial") return "warning";
  return "danger";
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
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data: students = [] } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const { data: lecturers = [] } = useQuery({
    queryKey: ["admin-lecturers"],
    queryFn: adminApi.getLecturers,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["admin-classes"],
    queryFn: adminApi.getClasses,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: adminApi.getAssignments,
  });

  const { data: feeSummary } = useQuery({
    queryKey: ["fee-summary"],
    queryFn: adminApi.getFeeSummary,
  });

  const { data: feeByClass = [] } = useQuery({
    queryKey: ["fee-by-class"],
    queryFn: adminApi.getFeeByClass,
  });

  const { data: feeByStatus = [] } = useQuery({
    queryKey: ["fee-by-status"],
    queryFn: adminApi.getFeeByStatus,
  });

  const { data: defaulters = [] } = useQuery({
    queryKey: ["fee-defaulters"],
    queryFn: () => adminApi.getFeeDefaulters(8),
  });

  const { data: trend = [] } = useQuery({
    queryKey: ["fee-trend"],
    queryFn: adminApi.getFeeCollectionTrend,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: subjectApi.getAll,
  });

  // Derived
  const trendSlice = [...(trend as FeeCollectionTrend[])].slice(-6);
  const trendMax = Math.max(...trendSlice.map((t) => t.totalBilled), 1);

  return (
    <div className="space-y-6">
      {/* ── Top stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardDataStats title="Total Students" total={String(students.length)} rate="" levelUp>
          <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Lecturers" total={String(lecturers.length)} rate="" levelUp>
          <Users className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Classes" total={String(classes.length)} rate="" levelUp>
          <School className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Assignments" total={String(assignments.length)} rate="" levelUp>
          <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
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

      {/* ── Middle row: By Status + Collection Trend ───────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* By Status */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Fee Status Breakdown</h2>
          </CardHeader>
          <CardContent className="p-0">
            {(feeByStatus as FeeByStatus[]).length === 0 ? (
              <p className="px-5 py-6 text-sm text-body">No fee data yet.</p>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {(feeByStatus as FeeByStatus[]).map((s) => (
                  <li key={s.status} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {s.status === "paid" ? (
                        <CheckCircle2 className="h-4 w-4 text-meta-3" />
                      ) : s.status === "partial" ? (
                        <Clock className="h-4 w-4 text-warning" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-meta-1" />
                      )}
                      <div>
                        <p className="text-sm font-medium capitalize text-black dark:text-white">{s.status}</p>
                        <p className="text-xs text-body">{s.count} student{s.count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-black dark:text-white">{fmt(s.totalCollected)}</p>
                      {s.totalOutstanding > 0 && (
                        <p className="text-xs text-meta-1">{fmt(s.totalOutstanding)} due</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Collection Trend */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Collection Trend</h2>
            <p className="text-xs text-body">Last {trendSlice.length} months</p>
          </CardHeader>
          <CardContent>
            {trendSlice.length === 0 ? (
              <p className="py-6 text-sm text-body">No trend data yet.</p>
            ) : (
              <div className="space-y-3">
                {trendSlice.map((t) => {
                  const billedPct = (t.totalBilled / trendMax) * 100;
                  const collectedPct = trendMax > 0 ? (t.totalCollected / trendMax) * 100 : 0;
                  return (
                    <div key={`${t.year}-${t.month}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-body">{MONTH_NAMES[t.month - 1]} {t.year}</span>
                        <span className="font-medium text-black dark:text-white">
                          {fmt(t.totalCollected)} / {fmt(t.totalBilled)}
                        </span>
                      </div>
                      {/* billed (background) */}
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-stroke/60 dark:bg-strokedark/60" style={{ width: `${billedPct}%` }} />
                        <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${collectedPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Fee by Class table ──────────────────────────────────────────────── */}
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
                        <p className="truncate text-sm font-medium text-black dark:text-white">
                          {d.student.fullName}
                        </p>
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
    </div>
  );
}
