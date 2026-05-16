"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, ChevronLeft } from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import type { OnlineUserReport, DailyOnlineEntry } from "@/lib/types";
import { Loader } from "./shared";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function weekRangeLabel(weekStart: string, weekEnd: string) {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const fmt = (d: Date) =>
    d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}, ${start.getFullYear()}`;
}

function mostActiveRole(days: DailyOnlineEntry[]) {
  const totals = { student: 0, lecturer: 0, parent: 0, admin: 0 };
  for (const d of days) {
    totals.student += d.peakCounts.student;
    totals.lecturer += d.peakCounts.lecturer;
    totals.parent += d.peakCounts.parent;
    totals.admin += d.peakCounts.admin;
  }
  return Object.entries(totals).reduce(
    (best, [role, val]) => (val > best.val ? { role, val } : best),
    { role: "student", val: -1 }
  );
}

function ReportDetail({ report, onBack }: { report: OnlineUserReport; onBack: () => void }) {
  // Sort days Mon-first
  const slots: (DailyOnlineEntry | null)[] = Array(7).fill(null);
  for (const d of report.days) {
    slots[(d.dayOfWeek + 6) % 7] = d;
  }

  const presentDays = slots.filter(Boolean) as DailyOnlineEntry[];
  const peakDay = presentDays.reduce<DailyOnlineEntry | null>(
    (best, d) => (!best || d.peakTotal > best.peakTotal ? d : best),
    null
  );
  const avgDaily = presentDays.length
    ? Math.round(presentDays.reduce((s, d) => s + d.avgTotal, 0) / presentDays.length)
    : 0;
  const { role: activeRole, val: activeVal } = mostActiveRole(presentDays);

  const barSeries = [
    { name: "Students",  data: slots.map((d) => d?.peakCounts.student ?? 0) },
    { name: "Lecturers", data: slots.map((d) => d?.peakCounts.lecturer ?? 0) },
    { name: "Parents",   data: slots.map((d) => d?.peakCounts.parent ?? 0) },
    { name: "Admins",    data: slots.map((d) => d?.peakCounts.admin ?? 0) },
  ];

  const lineSeries = [{ name: "Peak Online", data: slots.map((d) => d?.peakTotal ?? 0) }];

  const chartCommon = {
    chart: { toolbar: { show: false }, background: "transparent" },
    grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
    xaxis: { categories: DAY_LABELS, labels: { style: { fontSize: "12px" } } },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    tooltip: { theme: "light" },
    legend: { position: "top" as const },
  };

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ChevronLeft size={16} />
        Back to reports list
      </button>

      {/* Week heading */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Week of {weekRangeLabel(report.weekStart, report.weekEnd)}
        </h2>
        <span
          className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            report.isComplete
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          }`}
        >
          {report.isComplete ? (
            "Complete"
          ) : (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
              </span>
              Live
            </>
          )}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Peak Day</p>
          {peakDay ? (
            <>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {DAY_LABELS[(peakDay.dayOfWeek + 6) % 7]}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{peakDay.peakTotal} users at peak</p>
            </>
          ) : (
            <p className="mt-1 text-xl font-bold text-gray-400">—</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Avg Daily Online</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{avgDaily}</p>
          <p className="mt-0.5 text-xs text-gray-500">average across captured days</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Most Active Role</p>
          <p className="mt-1 text-2xl font-bold capitalize text-gray-900 dark:text-white">{activeRole}</p>
          <p className="mt-0.5 text-xs text-gray-500">{activeVal} peak users (total across days)</p>
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Peak Users by Role per Day</h3>
        <ApexChart
          type="bar"
          height={300}
          series={barSeries}
          options={{
            ...chartCommon,
            chart: { ...chartCommon.chart, type: "bar", stacked: true },
            colors: ["#3c50e0", "#10b981", "#f59e0b", "#ef4444"],
            plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
          }}
        />
      </div>

      {/* Line chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Peak Total Trend</h3>
        <ApexChart
          type="line"
          height={240}
          series={lineSeries}
          options={{
            ...chartCommon,
            chart: { ...chartCommon.chart, type: "line" },
            colors: ["#3c50e0"],
            stroke: { width: 2, curve: "smooth" },
            markers: { size: 4 },
          }}
        />
      </div>
    </div>
  );
}

function ReportsList({ onSelect }: { onSelect: (report: OnlineUserReport) => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["online-reports", page],
    queryFn: () => monitorApi.getOnlineReports(page),
  });

  if (isLoading) return <Loader />;

  const reports = data?.data ?? [];
  const pagination = data?.pagination;

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
        <BarChart2 size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No reports yet — the first appears after the next hourly snapshot.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Week</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Peak Total</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Most Active Role</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {reports.map((report) => {
              const peak = report.days.reduce((max, d) => Math.max(max, d.peakTotal), 0);
              const { role } = mostActiveRole(report.days);
              return (
                <tr key={report._id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {weekRangeLabel(report.weekStart, report.weekEnd)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300">{peak}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      {role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {report.isComplete ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                        </span>
                        Live
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onSelect(report)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page {pagination.page} of {pagination.pages} ({pagination.total} reports)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportsTab() {
  const [selectedReport, setSelectedReport] = useState<OnlineUserReport | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">
          <BarChart2 size={17} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Weekly Online Reports</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Hourly snapshots aggregated by week</p>
        </div>
      </div>
      {selectedReport ? (
        <ReportDetail report={selectedReport} onBack={() => setSelectedReport(null)} />
      ) : (
        <ReportsList onSelect={setSelectedReport} />
      )}
    </div>
  );
}
