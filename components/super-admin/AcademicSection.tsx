"use client";

import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  CalendarCheck,
  Award,
  FileCheck,
  ClipboardList,
} from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import type { AcademicReport } from "@/lib/types";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Loader, ErrorBlock } from "./CardState";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pctText = (r: number | null) => (r === null ? "—" : `${r}%`);

function StatTile({
  label,
  value,
  sub,
  icon,
  bg,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="rounded-sm border border-stroke bg-whiter p-4 dark:border-strokedark dark:bg-meta-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-body">{label}</p>
          <p className="mt-1 truncate text-lg font-bold text-black dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-body">{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function AttendanceTrend({ trend }: { trend: AcademicReport["attendanceTrend"] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">
        Attendance Rate Trend
      </h3>
      <div className="flex items-end gap-1.5" style={{ height: 96 }}>
        {trend.map((p) => {
          const r = p.rate;
          return (
            <div key={`${p.year}-${p.month}`} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-primary">
                {r === null ? "—" : `${r}%`}
              </span>
              <div className="flex w-full flex-1 items-end rounded-t bg-stroke/60 dark:bg-strokedark">
                <div
                  className="w-full rounded-t bg-primary transition-all"
                  style={{ height: `${r ?? 0}%` }}
                  title={`${MONTHS[p.month - 1]} ${p.year}: ${pctText(r)}`}
                />
              </div>
              <span className="text-[9px] text-body">{MONTHS[p.month - 1]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GradeDistribution({ grades }: { grades: AcademicReport["gradeDistribution"] }) {
  const max = Math.max(...grades.map((g) => g.count), 1);
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">
        Grade Distribution
      </h3>
      {grades.length === 0 ? (
        <p className="text-sm text-body">No published results in this window.</p>
      ) : (
        <ul className="space-y-2.5">
          {grades.map((g) => (
            <li key={g.grade} className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-xs font-bold text-black dark:text-white">
                {g.grade}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round((g.count / max) * 100)}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-xs text-body">
                {g.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AcademicSection() {
  const { data, isLoading, isError, refetch } = useQuery<AcademicReport>({
    queryKey: ["monitor-academics"],
    queryFn: () => monitorApi.getAcademics(),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-black dark:text-white">Academic Activity</h2>
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorBlock onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <Loader />
        ) : (
          <div className="space-y-6">
            {/* KPI tiles */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile
                label="Attendance Rate"
                value={pctText(data.summary.attendanceRate)}
                sub="platform-wide"
                icon={<CalendarCheck className="h-5 w-5 text-primary" />}
                bg="bg-primary/10"
              />
              <StatTile
                label="Exam Pass Rate"
                value={pctText(data.summary.examsPassRate)}
                sub={`${data.summary.resultsPublished.toLocaleString()} results published`}
                icon={<Award className="h-5 w-5 text-meta-3" />}
                bg="bg-meta-3/10"
              />
              <StatTile
                label="Assignments Graded"
                value={data.summary.assignmentsGraded.toLocaleString()}
                sub={`${data.summary.assignmentsPending.toLocaleString()} pending`}
                icon={<FileCheck className="h-5 w-5 text-indigo-500" />}
                bg="bg-indigo-500/10"
              />
              <StatTile
                label="Classes / Subjects"
                value={`${data.summary.classes.toLocaleString()} / ${data.summary.subjects.toLocaleString()}`}
                sub={`${data.summary.assignments.toLocaleString()} assignments`}
                icon={<ClipboardList className="h-5 w-5 text-warning" />}
                bg="bg-warning/10"
              />
            </div>

            {/* Trend + grade distribution */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AttendanceTrend trend={data.attendanceTrend} />
              <GradeDistribution grades={data.gradeDistribution} />
            </div>

            {/* Per-institute table */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">
                Academic Performance by Institute
              </h3>
              {data.byInstitute.length === 0 ? (
                <p className="text-sm text-body">No institutes found.</p>
              ) : (
                <div className="overflow-x-auto rounded-sm border border-stroke dark:border-strokedark">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-stroke bg-whiter dark:border-strokedark dark:bg-meta-4">
                        <th className="px-3 py-2.5 text-left font-semibold text-body">Institute</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-body">Students</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-body">Attendance</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-body">Pass Rate</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-body">Graded / Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke dark:divide-strokedark">
                      {data.byInstitute.map((r) => (
                        <tr key={r.instituteId}>
                          <td className="max-w-[180px] truncate px-3 py-2.5 font-medium text-black dark:text-white">
                            {r.instituteName}
                          </td>
                          <td className="px-3 py-2.5 text-right text-body">
                            {r.students.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right text-body">
                            {pctText(r.attendanceRate)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-body">
                            {pctText(r.passRate)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-body">
                            {r.assignmentsGraded} / {r.assignmentsPending}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
