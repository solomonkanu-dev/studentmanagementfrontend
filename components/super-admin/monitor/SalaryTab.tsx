"use client";

import { useQuery } from "@tanstack/react-query";
import { DollarSign, CheckCircle2, Clock, BarChart2 } from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import { fmt, ProgressBar, StatCard, Loader } from "./shared";

export function SalaryTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["monitor-salary"],
    queryFn: monitorApi.getSalaryExpenditure,
  });

  if (isLoading) return <Loader />;
  if (!data) return null;

  const summary = data.summary ?? {};
  const byStatus: typeof data.byStatus = Array.isArray(data.byStatus) ? data.byStatus : [];
  const byInstitute: typeof data.byInstitute = Array.isArray(data.byInstitute) ? data.byInstitute : [];
  const totalRecords = summary.totalRecords ?? 0;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Disbursed" value={fmt(summary.totalDisbursed ?? 0)} icon={DollarSign} color="bg-indigo-600" />
        <StatCard label="Paid" value={fmt(summary.totalPaid ?? 0)} sub={`${summary.paidCount ?? 0} payments`} icon={CheckCircle2} color="bg-emerald-600" />
        <StatCard label="Pending" value={fmt(summary.totalPending ?? 0)} sub={`${summary.pendingCount ?? 0} pending`} icon={Clock} color="bg-amber-500" />
        <StatCard label="Records" value={totalRecords.toLocaleString()} icon={BarChart2} color="bg-gray-600" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* By Status */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">By Payment Status</h3>
          {byStatus.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No salary records found.</p>
          ) : (
            <div className="space-y-3">
              {byStatus.map((s) => {
                const color = s.status === "paid" ? "bg-emerald-500" : s.status === "pending" ? "bg-amber-400" : "bg-red-500";
                const textColor = s.status === "paid" ? "text-emerald-600" : s.status === "pending" ? "text-amber-500" : "text-red-500";
                return (
                  <div key={s.status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={`font-medium capitalize ${textColor}`}>{s.status}</span>
                      <span className="text-gray-500">{s.count} · {fmt(s.totalAmount)}</span>
                    </div>
                    <ProgressBar value={s.count} max={totalRecords || 1} color={color} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By Institute */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-5 py-3 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">By Institute</h3>
          </div>
          {byInstitute.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              {totalRecords > 0 ? "Institute breakdown not available." : "No salary records found."}
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {byInstitute.map((inst) => (
                <div key={inst.instituteName} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{inst.instituteName}</p>
                    <p className="text-xs text-gray-400">{inst.staffCount} staff</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(inst.totalDisbursed)}</p>
                    <div className="flex justify-end gap-2 text-xs">
                      <span className="text-emerald-600">{fmt(inst.totalPaid)} paid</span>
                      {inst.totalPending > 0 && <span className="text-amber-500">{fmt(inst.totalPending)} pending</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
