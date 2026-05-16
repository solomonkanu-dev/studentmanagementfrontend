"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { monitorApi } from "@/lib/api/monitor";
import type { GrowthPoint } from "@/lib/types";
import { mergeGrowthSeries, Loader } from "./shared";

export function GrowthTab() {
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

      {/* Bar chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        {merged.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No registration data for this period</p>
        ) : (
          <div className="flex items-end gap-3 overflow-x-auto pb-2" style={{ minHeight: 180 }}>
            {merged.map((m) => (
              <div key={m.label} className="flex shrink-0 flex-col items-center gap-1">
                <div className="flex items-end gap-0.5" style={{ height: 140 }}>
                  {SERIES.map((s) => {
                    const val = (m as unknown as Record<string, number>)[s.label] ?? 0;
                    const h = Math.max(4, (val / maxVal) * 140);
                    return (
                      <div
                        key={s.label}
                        title={`${s.label}: ${val}`}
                        className={`w-4 rounded-t ${s.color} opacity-90 transition-all`}
                        style={{ height: h }}
                      />
                    );
                  })}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.label}</span>
              </div>
            ))}
          </div>
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
