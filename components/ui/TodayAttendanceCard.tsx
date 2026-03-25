"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/api/attendance";
import { Card, CardHeader, CardContent } from "./Card";
import {
  CalendarDays,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
} from "lucide-react";
import type { Class } from "@/lib/types";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  status: "present" | "absent" | "late";
}

interface ClassAttendanceData {
  className: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countRecords(records: AttendanceRecord[]) {
  let present = 0, absent = 0, late = 0;
  for (const rec of records) {
    if (rec.status === "present") present++;
    else if (rec.status === "absent") absent++;
    else if (rec.status === "late") late++;
  }
  return { present, absent, late };
}

function parseReport(data: unknown): { present: number; absent: number; late: number } {
  if (!data) return { present: 0, absent: 0, late: 0 };

  // Array — could be:
  //   a) Direct attendance records: [{ status, student }]
  //   b) Attendance documents:      [{ date, records: [{ status, student }] }]
  if (Array.isArray(data)) {
    if (data.length === 0) return { present: 0, absent: 0, late: 0 };

    // If first element has a `records` array, it's shape (b)
    const first = data[0] as Record<string, unknown>;
    if (Array.isArray(first?.records)) {
      const allRecords = (data as Record<string, unknown>[]).flatMap(
        (doc) => (doc.records as AttendanceRecord[]) ?? []
      );
      return countRecords(allRecords);
    }

    // Otherwise it's shape (a) — direct records
    return countRecords(data as AttendanceRecord[]);
  }

  const d = data as Record<string, unknown>;

  // Single document with nested records array
  const nested = d.records ?? d.attendances ?? d.attendance ?? d.data;
  if (Array.isArray(nested)) {
    return countRecords(nested as AttendanceRecord[]);
  }

  // Aggregated counts: { present: N, absent: N }
  if (typeof d.present === "number" || typeof d.absent === "number") {
    return {
      present: (d.present as number) ?? 0,
      absent: (d.absent as number) ?? 0,
      late: (d.late as number) ?? 0,
    };
  }

  // presentCount / absentCount variants
  if (typeof d.presentCount === "number" || typeof d.absentCount === "number") {
    return {
      present: (d.presentCount as number) ?? 0,
      absent: (d.absentCount as number) ?? 0,
      late: (d.lateCount as number) ?? 0,
    };
  }

  return { present: 0, absent: 0, late: 0 };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TodayAttendanceCard({ classes }: { classes: Class[] }) {
  const today = new Date().toISOString().split("T")[0];
  const [isDark, setIsDark] = useState(false);

  // Track dark mode toggling
  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // Fetch today's attendance for every class in parallel
  const classReports = useQueries({
    queries: classes.map((c: Class) => ({
      queryKey: ["attendance", "today", c._id, today],
      queryFn: () =>
        attendanceApi.getSubjectAttendance({ classId: c._id, date: today }),
      staleTime: 0,
      retry: false,
    })),
  });

  // Aggregate across all classes
  const classData: ClassAttendanceData[] = classes.map((c, i) => {
    const parsed = parseReport(classReports[i]?.data);
    return {
      className: c.name,
      ...parsed,
      total: parsed.present + parsed.absent + parsed.late,
    };
  });

  const totalPresent = classData.reduce((s, c) => s + c.present, 0);
  const totalAbsent = classData.reduce((s, c) => s + c.absent, 0);
  const totalLate = classData.reduce((s, c) => s + c.late, 0);
  const totalMarked = totalPresent + totalAbsent + totalLate;
  const rate =
    totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

  const isLoading = classReports.some((q) => q.isLoading);

  // ─── Chart options ──────────────────────────────────────────────────────────

  const donutLabels = [
    "Present",
    "Absent",
    ...(totalLate > 0 ? ["Late"] : []),
  ];
  const donutSeries = [
    totalPresent,
    totalAbsent,
    ...(totalLate > 0 ? [totalLate] : []),
  ];

  const donutOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "donut",
      background: "transparent",
      fontFamily: "Satoshi, sans-serif",
    },
    colors: ["#10B981", "#FA5252", "#F9C107"],
    labels: donutLabels,
    legend: {
      position: "bottom",
      fontFamily: "Satoshi, sans-serif",
      fontSize: "12px",
      labels: { colors: isDark ? "#ADB7C4" : "#637381" },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Rate",
              fontFamily: "Satoshi, sans-serif",
              fontWeight: "700",
              fontSize: "18px",
              color: isDark ? "#FFFFFF" : "#1A1A2E",
              formatter: () => `${rate}%`,
            },
            value: {
              fontFamily: "Satoshi, sans-serif",
              fontWeight: "600",
              fontSize: "16px",
              color: isDark ? "#FFFFFF" : "#1A1A2E",
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: [isDark ? "#24303F" : "#FFFFFF"] },
    theme: { mode: isDark ? "dark" : "light" },
    tooltip: { style: { fontFamily: "Satoshi, sans-serif" } },
  };

  const radialColor =
    rate >= 75 ? "#10B981" : rate >= 50 ? "#F9C107" : "#FA5252";

  const radialOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "radialBar",
      background: "transparent",
      fontFamily: "Satoshi, sans-serif",
    },
    colors: [radialColor],
    plotOptions: {
      radialBar: {
        hollow: { size: "55%", background: "transparent" },
        track: {
          background: isDark ? "#2E3A4E" : "#EBF0FA",
          strokeWidth: "100%",
        },
        dataLabels: {
          name: {
            offsetY: -8,
            fontSize: "11px",
            fontFamily: "Satoshi, sans-serif",
            color: isDark ? "#ADB7C4" : "#637381",
          },
          value: {
            offsetY: 6,
            fontSize: "24px",
            fontFamily: "Satoshi, sans-serif",
            fontWeight: "700",
            color: isDark ? "#FFFFFF" : "#1A1A2E",
            formatter: (val) => `${val}%`,
          },
        },
      },
    },
    labels: ["Today"],
    theme: { mode: isDark ? "dark" : "light" },
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays
              className="h-4 w-4 text-primary"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Today&apos;s Attendance
            </h2>
          </div>
          <span className="text-xs text-body">{formattedDate}</span>
        </div>
      </CardHeader>

      <CardContent>
        {/* ── Stat pills ──────────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            label="Total Marked"
            value={totalMarked}
            color="default"
            loading={isLoading}
          />
          <StatPill
            icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
            label="Present"
            value={totalPresent}
            color="green"
            loading={isLoading}
          />
          <StatPill
            icon={<UserX className="h-4 w-4" aria-hidden="true" />}
            label="Absent"
            value={totalAbsent}
            color="red"
            loading={isLoading}
          />
          <StatPill
            icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
            label="Rate"
            value={`${rate}%`}
            color={rate >= 75 ? "green" : rate >= 50 ? "yellow" : "red"}
            loading={isLoading}
          />
        </div>

        {/* ── Charts ──────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="h-7 w-7 animate-spin rounded-full border-2 border-stroke border-t-primary"
              role="status"
              aria-label="Loading attendance"
            />
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarDays className="h-8 w-8 text-body" aria-hidden="true" />
            <p className="text-sm text-body">No classes found.</p>
          </div>
        ) : totalMarked === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarDays className="h-8 w-8 text-body" aria-hidden="true" />
            <p className="text-sm font-medium text-black dark:text-white">
              No attendance marked today
            </p>
            <p className="text-xs text-body">
              Mark attendance from the Attendance page.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Donut — breakdown */}
            <div>
              <p className="mb-1 text-center text-xs font-medium text-body">
                Breakdown
              </p>
              <ReactApexChart
                type="donut"
                series={donutSeries}
                options={donutOptions}
                height={260}
              />
            </div>

            {/* Right column: radial + class list */}
            <div className="flex flex-col gap-5">
              {/* Radial — rate */}
              <div>
                <p className="mb-1 text-center text-xs font-medium text-body">
                  Overall Rate
                </p>
                <ReactApexChart
                  type="radialBar"
                  series={[rate]}
                  options={radialOptions}
                  height={200}
                />
              </div>

              {/* Per-class breakdown */}
              <div className="space-y-3">
                {classData
                  .filter((c) => c.total > 0)
                  .map((c) => (
                    <ClassRow key={c.className} data={c} />
                  ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type PillColor = "default" | "green" | "red" | "yellow";

const pillColors: Record<PillColor, string> = {
  default: "bg-meta-2 text-primary dark:bg-meta-4 dark:text-white",
  green: "bg-meta-3/10 text-meta-3",
  red: "bg-meta-1/10 text-meta-1",
  yellow:
    "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
};

function StatPill({
  icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: PillColor;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-stroke bg-white p-3 dark:border-strokedark dark:bg-boxdark">
      <div
        className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full ${pillColors[color]}`}
      >
        {icon}
      </div>
      <p className="text-xs text-body">{label}</p>
      {loading ? (
        <div className="mt-1 h-5 w-12 animate-pulse rounded bg-stroke dark:bg-strokedark" />
      ) : (
        <p className="mt-0.5 text-lg font-bold text-black dark:text-white">
          {value}
        </p>
      )}
    </div>
  );
}

function ClassRow({ data }: { data: ClassAttendanceData }) {
  const pct =
    data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
  const bar =
    pct >= 75 ? "bg-meta-3" : pct >= 50 ? "bg-yellow-400" : "bg-meta-1";

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-meta-2 text-xs font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
        {data.className.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="truncate text-xs font-medium text-black dark:text-white">
            {data.className}
          </span>
          <span className="ml-2 shrink-0 text-xs text-body">
            {data.present}/{data.total}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
          <div
            className={`h-full rounded-full transition-all duration-500 ${bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
