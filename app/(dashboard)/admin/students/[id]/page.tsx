"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { attendanceApi } from "@/lib/api/attendance";
import { submissionApi } from "@/lib/api/assignment";
import CardDataStats from "@/components/ui/CardDataStats";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableHead,
  TableBody,
  Th,
  Td,
} from "@/components/ui/Table";
import {
  ArrowLeft,
  CalendarCheck,
  UserCheck,
  UserX,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  XCircle,
  TrendingUp,
  GraduationCap,
} from "lucide-react";
import type { AuthUser, Result, Subject, Submission, Assignment } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StudentDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ["admin-student", id],
    queryFn: () => adminApi.getStudent(id),
  });

  const { data: attendanceSummary } = useQuery({
    queryKey: ["student-attendance", id],
    queryFn: () => attendanceApi.getStudentSummary(id),
    enabled: !!id,
  });

  // Get results for student's class
  const classId = student?.class;
  const { data: classResults = [] } = useQuery({
    queryKey: ["class-results", classId],
    queryFn: () => adminApi.getResultsByClass(classId as string),
    enabled: !!classId && typeof classId === "string",
  });

  // Get all assignments and submissions
  const { data: allAssignments = [] } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: adminApi.getAssignments,
  });

  // Filter results for this student
  const studentResults = useMemo(() => {
    return classResults.filter((r: Result) => {
      const studentId = typeof r.student === "object" ? (r.student as AuthUser)._id : r.student;
      return studentId === id;
    });
  }, [classResults, id]);

  // ─── Attendance data ─────────────────────────────────────
  const attTotal = attendanceSummary?.total ?? 0;
  const attPresent = attendanceSummary?.present ?? 0;
  const attAbsent = attendanceSummary?.absent ?? 0;
  const attPercentage = attendanceSummary?.percentage
    ? parseFloat(attendanceSummary.percentage)
    : 0;

  const attendanceStatus =
    attPercentage >= 75 ? "good" : attPercentage >= 50 ? "average" : "poor";
  const attendanceColor =
    attendanceStatus === "good"
      ? "text-meta-3"
      : attendanceStatus === "average"
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-meta-1";
  const attendanceBadgeVariant =
    attendanceStatus === "good"
      ? "success"
      : attendanceStatus === "average"
      ? "warning"
      : "danger";

  // ─── Grades data ─────────────────────────────────────────
  const gradeStats = useMemo(() => {
    if (studentResults.length === 0) return { avg: 0, highest: 0, lowest: 0, total: 0 };
    const marks = studentResults.map((r: Result) => r.marksObtained);
    const sum = marks.reduce((a: number, b: number) => a + b, 0);
    return {
      avg: Math.round(sum / marks.length),
      highest: Math.max(...marks),
      lowest: Math.min(...marks),
      total: marks.length,
    };
  }, [studentResults]);

  // ─── Assignment submission data ──────────────────────────
  // We can estimate from assignments count vs what we know
  const totalAssignments = allAssignments.length;

  if (loadingStudent) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary"
          role="status"
          aria-label="Loading student"
        />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <GraduationCap className="h-10 w-10 text-body" aria-hidden="true" />
        <p className="text-sm text-body">Student not found.</p>
        <Link href="/admin/students" className="text-xs text-primary hover:underline">
          Back to overview
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link + student header */}
      <div>
        <Link
          href="/admin/students"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-body hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Students
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-meta-2 text-lg font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
            {student.fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-bold text-black dark:text-white">
              {student.fullName}
            </h1>
            <p className="text-sm text-body">{student.email}</p>
          </div>
          <Badge
            variant={student.approved ? "success" : "warning"}
          >
            {student.approved ? "Active" : "Pending"}
          </Badge>
        </div>
      </div>

      {/* Quick stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardDataStats
          title="Attendance Rate"
          total={`${attPercentage}%`}
          rate=""
          levelUp={attPercentage >= 75}
        >
          <CalendarCheck className={`h-6 w-6 ${attendanceColor}`} aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Average Grade"
          total={gradeStats.total > 0 ? `${gradeStats.avg}%` : "—"}
          rate=""
          levelUp={gradeStats.avg >= 50}
        >
          <TrendingUp className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Subjects Graded"
          total={String(gradeStats.total)}
          rate=""
          levelUp
        >
          <BookOpen className="h-6 w-6 text-meta-3" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Assignments"
          total={String(totalAssignments)}
          rate=""
          levelUp
        >
          <ClipboardList className="h-6 w-6 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
        </CardDataStats>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ─── Attendance Chart ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Attendance Overview
              </h2>
              <Badge variant={attendanceBadgeVariant as "success" | "warning" | "danger"} className="capitalize">
                {attendanceStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              {/* Donut chart */}
              <div className="relative shrink-0">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  {/* Background circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-stroke dark:text-strokedark"
                  />
                  {/* Present arc */}
                  {attTotal > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeDasharray={`${(attPercentage / 100) * 314.16} 314.16`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      className={attendanceColor}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${attendanceColor}`}>
                    {attPercentage}%
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3 flex-1">
                <LegendRow
                  color="bg-meta-3"
                  label="Present"
                  value={attPresent}
                  total={attTotal}
                />
                <LegendRow
                  color="bg-meta-1"
                  label="Absent"
                  value={attAbsent}
                  total={attTotal}
                />
                <div className="border-t border-stroke pt-2 dark:border-strokedark">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-black dark:text-white">Total Classes</span>
                    <span className="font-bold text-black dark:text-white">{attTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Grades Chart ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Subject Performance
            </h2>
          </CardHeader>
          <CardContent>
            {studentResults.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <BookOpen className="h-8 w-8 text-body" aria-hidden="true" />
                <p className="text-sm text-body">No grades recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentResults.map((r: Result) => {
                  const subjectName =
                    typeof r.subject === "object"
                      ? (r.subject as Subject).name
                      : "Subject";
                  const total = r.totalScore ?? 100;
                  const pct = Math.round((r.marksObtained / total) * 100);
                  const barColor =
                    pct >= 75
                      ? "bg-meta-3"
                      : pct >= 50
                      ? "bg-yellow-500"
                      : "bg-meta-1";

                  return (
                    <div key={r._id}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-black dark:text-white">
                          {subjectName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-black dark:text-white">
                            {r.marksObtained}/{total}
                          </span>
                          {r.grade && (
                            <Badge
                              variant={
                                pct >= 75
                                  ? "success"
                                  : pct >= 50
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {r.grade}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-stroke dark:bg-strokedark">
                        <div
                          className={`h-2 rounded-full transition-all ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Summary */}
                <div className="mt-4 grid grid-cols-3 gap-3 rounded-md border border-stroke p-3 dark:border-strokedark">
                  <MiniStat label="Average" value={`${gradeStats.avg}%`} />
                  <MiniStat label="Highest" value={`${gradeStats.highest}`} />
                  <MiniStat label="Lowest" value={`${gradeStats.lowest}`} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Results table ─────────────────────────────────── */}
      {studentResults.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Detailed Results
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHead>
                <tr>
                  <Th>Subject</Th>
                  <Th>Marks</Th>
                  <Th>Total</Th>
                  <Th>Percentage</Th>
                  <Th>Grade</Th>
                  <Th>Status</Th>
                </tr>
              </TableHead>
              <TableBody>
                {studentResults.map((r: Result) => {
                  const subjectName =
                    typeof r.subject === "object"
                      ? (r.subject as Subject).name
                      : "—";
                  const total = r.totalScore ?? 100;
                  const pct = Math.round((r.marksObtained / total) * 100);
                  return (
                    <tr
                      key={r._id}
                      className="hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                    >
                      <Td className="font-medium text-black dark:text-white">
                        {subjectName}
                      </Td>
                      <Td className="text-body">{r.marksObtained}</Td>
                      <Td className="text-body">{total}</Td>
                      <Td>
                        <span
                          className={[
                            "text-sm font-semibold",
                            pct >= 75
                              ? "text-meta-3"
                              : pct >= 50
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-meta-1",
                          ].join(" ")}
                        >
                          {pct}%
                        </span>
                      </Td>
                      <Td>
                        {r.grade ? (
                          <Badge
                            variant={
                              pct >= 75 ? "success" : pct >= 50 ? "warning" : "danger"
                            }
                          >
                            {r.grade}
                          </Badge>
                        ) : (
                          <span className="text-xs text-body">—</span>
                        )}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5 text-xs">
                          {pct >= 50 ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-meta-3" aria-hidden="true" />
                              <span className="text-meta-3">Pass</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5 text-meta-1" aria-hidden="true" />
                              <span className="text-meta-1">Fail</span>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ─── Performance Summary ───────────────────────────── */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-black dark:text-white">
            Overall Performance
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Attendance gauge */}
            <PerformanceGauge
              label="Attendance"
              value={attPercentage}
              icon={CalendarCheck}
            />
            {/* Academic gauge */}
            <PerformanceGauge
              label="Academics"
              value={gradeStats.avg}
              icon={BookOpen}
            />
            {/* Overall */}
            <PerformanceGauge
              label="Overall"
              value={
                gradeStats.total > 0
                  ? Math.round((attPercentage + gradeStats.avg) / 2)
                  : attPercentage
              }
              icon={TrendingUp}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function LegendRow({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-xs text-body">{label}</span>
      </div>
      <span className="text-xs font-medium text-black dark:text-white">
        {value} ({pct}%)
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wide text-body">{label}</p>
      <p className="text-sm font-bold text-black dark:text-white">{value}</p>
    </div>
  );
}

function PerformanceGauge({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  const status =
    value >= 75 ? "Excellent" : value >= 50 ? "Average" : value > 0 ? "Needs Improvement" : "No Data";
  const statusColor =
    value >= 75
      ? "text-meta-3"
      : value >= 50
      ? "text-yellow-600 dark:text-yellow-400"
      : value > 0
      ? "text-meta-1"
      : "text-body";
  const barColor =
    value >= 75 ? "bg-meta-3" : value >= 50 ? "bg-yellow-500" : value > 0 ? "bg-meta-1" : "bg-stroke";

  return (
    <div className="rounded-md border border-stroke p-4 dark:border-strokedark">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${statusColor}`} aria-hidden="true" />
          <span className="text-xs font-medium text-black dark:text-white">{label}</span>
        </div>
        <span className={`text-lg font-bold ${statusColor}`}>{value > 0 ? `${value}%` : "—"}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-stroke dark:bg-strokedark">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <p className={`mt-1.5 text-[10px] font-medium uppercase tracking-wide ${statusColor}`}>
        {status}
      </p>
    </div>
  );
}
