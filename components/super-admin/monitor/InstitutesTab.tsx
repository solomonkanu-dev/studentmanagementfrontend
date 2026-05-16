"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import { fmt, pct, ProgressBar, Loader } from "./shared";
import { DeepModal } from "./DeepModal";

export function InstitutesTab() {
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
