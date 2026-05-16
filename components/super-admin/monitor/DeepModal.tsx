"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import type { InstituteDeepReport } from "@/lib/types";
import { fmt, pct, ProgressBar } from "./shared";

interface Props {
  instituteId: string;
  name: string;
  onClose: () => void;
}

export function DeepModal({ instituteId, name, onClose }: Props) {
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
