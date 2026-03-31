"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { parentApi } from "@/lib/api/parent";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CalendarCheck, GraduationCap } from "lucide-react";
import type { LinkedStudent } from "@/lib/types";

function AttendancePage() {
  const searchParams = useSearchParams();
  const urlChild = searchParams.get("child");

  const { data: children = [] } = useQuery({
    queryKey: ["parent-children"],
    queryFn: parentApi.getMyChildren,
  });

  const [selectedId, setSelectedId] = useState<string | null>(urlChild);
  const childId =
    selectedId ??
    (children as LinkedStudent[])[0]?._id ??
    null;

  const { data: attendance, isLoading } = useQuery({
    queryKey: ["parent-attendance", childId],
    queryFn: () => parentApi.getChildAttendance(childId!),
    enabled: !!childId,
  });

  const selectedChild = (children as LinkedStudent[]).find((c) => c._id === childId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-meta-3/10">
          <CalendarCheck className="h-5 w-5 text-meta-3" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white">Attendance</h1>
          <p className="text-sm text-body">View your child's attendance record</p>
        </div>
      </div>

      {/* Child selector */}
      {(children as LinkedStudent[]).length > 1 && (
        <div className="flex flex-wrap gap-2">
          {(children as LinkedStudent[]).map((child) => (
            <button
              key={child._id}
              onClick={() => setSelectedId(child._id)}
              className={[
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                childId === child._id
                  ? "border-meta-3 bg-meta-3/10 text-meta-3"
                  : "border-stroke text-body hover:border-meta-3 dark:border-strokedark",
              ].join(" ")}
            >
              <GraduationCap className="h-4 w-4" />
              {child.fullName}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-meta-3" />
        </div>
      ) : attendance ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Classes", value: attendance.total, color: "text-black dark:text-white" },
              { label: "Present", value: attendance.present, color: "text-meta-3" },
              { label: "Absent", value: attendance.absent, color: "text-meta-1" },
              { label: "Rate", value: `${attendance.rate}%`, color: attendance.rate >= 75 ? "text-meta-3" : "text-meta-1" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="mt-1 text-xs text-body">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Attendance rate bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-black dark:text-white">
                  Overall Attendance Rate
                </span>
                <span className={`text-sm font-bold ${attendance.rate >= 75 ? "text-meta-3" : "text-meta-1"}`}>
                  {attendance.rate}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
                <div
                  className={`h-full rounded-full transition-all ${attendance.rate >= 75 ? "bg-meta-3" : "bg-meta-1"}`}
                  style={{ width: `${Math.min(attendance.rate, 100)}%` }}
                />
              </div>
              {attendance.rate < 75 && (
                <p className="mt-2 text-xs text-meta-1">
                  ⚠ Attendance below 75% — may affect exam eligibility.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent records */}
          {attendance.recentRecords?.length > 0 && (
            <Card>
              <CardHeader>
                <span className="text-sm font-semibold text-black dark:text-white">
                  Recent Records
                </span>
              </CardHeader>
              <CardContent className="divide-y divide-stroke dark:divide-strokedark">
                {attendance.recentRecords.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm text-black dark:text-white">
                        {new Date(r.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {r.subject && (
                        <p className="text-xs text-body">{r.subject}</p>
                      )}
                    </div>
                    <Badge
                      variant={r.status === "present" ? "success" : r.status === "late" ? "warning" : "danger"}
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <p className="text-sm text-body">No attendance data available.</p>
      )}
    </div>
  );
}

export default function ParentAttendancePage() {
  return (
    <Suspense>
      <AttendancePage />
    </Suspense>
  );
}
