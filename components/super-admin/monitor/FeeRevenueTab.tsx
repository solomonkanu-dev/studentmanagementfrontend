"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart2, CheckCircle2, AlertCircle, CreditCard } from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import { fmt, pct, ProgressBar, StatCard, Loader } from "./shared";

export function FeeRevenueTab() {
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
        {/* By Status */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">By Status</h3>
          <div className="space-y-3">
            {byStatus.map((s) => {
              const color = s.status === "paid" ? "bg-emerald-500" : s.status === "partial" ? "bg-amber-400" : "bg-red-500";
              const textColor = s.status === "paid" ? "text-emerald-600" : s.status === "partial" ? "text-amber-500" : "text-red-500";
              return (
                <div key={s.status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className={`font-medium capitalize ${textColor}`}>{s.status}</span>
                    <span className="text-gray-500">{s.count} records · {fmt(s.totalAmount)}</span>
                  </div>
                  <ProgressBar value={s.count} max={summary.totalRecords ?? 1} color={color} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Institutes */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Top Institutes by Collection</h3>
          <div className="space-y-3">
            {topInstitutes.map((inst, i) => {
              const rate = pct(inst.totalCollected, inst.totalBilled);
              return (
                <div key={inst.instituteName} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600 dark:bg-red-900/30">
                        {i + 1}
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-35">{inst.instituteName}</span>
                    </div>
                    <span className="font-semibold text-emerald-600">{fmt(inst.totalCollected)}</span>
                  </div>
                  <ProgressBar value={inst.totalCollected} max={inst.totalBilled || 1} color="bg-emerald-500" />
                  <p className="text-xs text-gray-400">{rate}% collected · {fmt(inst.outstanding)} outstanding</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
