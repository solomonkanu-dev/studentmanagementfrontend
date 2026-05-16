"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, ShieldCheck, GraduationCap, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import { fmt, pct, ProgressBar, StatCard, Loader } from "./shared";

export function OverviewTab() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["monitor-overview"],
    queryFn: monitorApi.getOverview,
  });

  if (isLoading) return <Loader />;
  if (!data) return <p className="py-10 text-center text-sm text-gray-500">No overview data available.</p>;

  const d = data;
  const feeRate = pct(d.fees?.totalCollected ?? 0, d.fees?.totalBilled ?? 0);

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
          {/* Fees block */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Fee Revenue</h3>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {feeRate}% collected
              </span>
            </div>
            <div className="mb-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Billed</span>
                <span className="font-semibold text-gray-900 dark:text-white">{fmt(d.fees?.totalBilled ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Collected</span>
                <span className="font-semibold text-emerald-600">{fmt(d.fees?.totalCollected ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Outstanding</span>
                <span className="font-semibold text-red-500">{fmt(d.fees?.totalOutstanding ?? 0)}</span>
              </div>
            </div>
            <ProgressBar value={d.fees?.totalCollected ?? 0} max={d.fees?.totalBilled ?? 0} color="bg-emerald-500" />
          </div>

          {/* Salaries block */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Salary Expenditure</h3>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                {pct(d.salaries?.totalPaid ?? 0, d.salaries?.totalDisbursed ?? 0)}% paid
              </span>
            </div>
            <div className="mb-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Disbursed</span>
                <span className="font-semibold text-gray-900 dark:text-white">{fmt(d.salaries?.totalDisbursed ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Paid</span>
                <span className="font-semibold text-emerald-600">{fmt(d.salaries?.totalPaid ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Pending</span>
                <span className="font-semibold text-amber-500">{fmt(d.salaries?.totalPending ?? 0)}</span>
              </div>
            </div>
            <ProgressBar value={d.salaries?.totalPaid ?? 0} max={d.salaries?.totalDisbursed ?? 0} color="bg-indigo-500" />
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
