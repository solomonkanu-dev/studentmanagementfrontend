"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { subjectApi } from "@/lib/api/subject";
import { classApi } from "@/lib/api/class";
import { assignmentApi } from "@/lib/api/assignment";
import { attendanceApi } from "@/lib/api/attendance";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import TodayAttendanceCard from "@/components/ui/TodayAttendanceCard";
import { BookOpen, School, ClipboardList, CalendarCheck } from "lucide-react";
import type { Subject, AuthUser, Class, Assignment } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAttendanceCount(data: unknown): number {
  if (!data) return 0;
  if (Array.isArray(data)) {
    const first = data[0] as Record<string, unknown> | undefined;
    if (first && Array.isArray(first.records)) {
      return (data as Record<string, unknown>[]).reduce(
        (sum, doc) => sum + ((doc.records as unknown[]) ?? []).length,
        0
      );
    }
    return data.length;
  }
  const d = data as Record<string, unknown>;
  const nested = d.records ?? d.attendances ?? d.attendance ?? d.data;
  if (Array.isArray(nested)) return nested.length;
  const total =
    ((d.present as number) ?? 0) +
    ((d.absent as number) ?? 0) +
    ((d.late as number) ?? 0);
  return total;
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LecturerDashboard() {
  const today = new Date().toISOString().split("T")[0];

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["lecturer-subjects"],
    queryFn: subjectApi.getForLecturer,
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["lecturer-classes"],
    queryFn: classApi.getForLecturer,
  });

  // Fetch assignments for every subject in parallel
  const assignmentQueries = useQueries({
    queries: (subjects as Subject[]).map((s) => ({
      queryKey: ["assignments", s._id],
      queryFn: () => assignmentApi.getBySubject(s._id),
      enabled: (subjects as Subject[]).length > 0,
    })),
  });

  // Fetch today's attendance for every class in parallel
  const attendanceQueries = useQueries({
    queries: (classes as Class[]).map((c) => ({
      queryKey: ["attendance", "today", c._id, today],
      queryFn: () =>
        attendanceApi.getSubjectAttendance({ classId: c._id, date: today }),
      enabled: (classes as Class[]).length > 0,
      retry: false,
    })),
  });

  // Fetch students for all classes in parallel
  const studentQueries = useQueries({
    queries: (classes as Class[]).map((c) => ({
      queryKey: ["class-students", c._id],
      queryFn: () => classApi.getStudents(c._id),
      enabled: (classes as Class[]).length > 0,
    })),
  });

  const totalAssignments = useMemo(() => {
    return assignmentQueries.reduce(
      (sum, q) => sum + ((q.data as Assignment[] | undefined)?.length ?? 0),
      0
    );
  }, [assignmentQueries]);

  const attendanceMarkedToday = useMemo(() => {
    return attendanceQueries.reduce(
      (sum, q) => sum + parseAttendanceCount(q.data),
      0
    );
  }, [attendanceQueries]);

  // Flatten all students across classes with their class name
  const allStudents = useMemo(() => {
    const seen = new Set<string>();
    const result: { student: AuthUser; className: string }[] = [];
    (classes as Class[]).forEach((c, i) => {
      const raw = studentQueries[i]?.data;
      const students: AuthUser[] = Array.isArray(raw) ? (raw as AuthUser[]) : [];
      students.forEach((s) => {
        if (!seen.has(s._id)) {
          seen.add(s._id);
          result.push({ student: s, className: c.name });
        }
      });
    });
    return result;
  }, [classes, studentQueries]);

  // Flatten all assignments with subject name, sorted newest first
  const recentAssignments = useMemo(() => {
    const result: { assignment: Assignment; subjectName: string }[] = [];
    (subjects as Subject[]).forEach((s, i) => {
      const assignments =
        (assignmentQueries[i]?.data as Assignment[] | undefined) ?? [];
      assignments.forEach((a) => {
        result.push({ assignment: a, subjectName: s.name });
      });
    });
    result.sort(
      (a, b) =>
        new Date(b.assignment.createdAt).getTime() -
        new Date(a.assignment.createdAt).getTime()
    );
    return result.slice(0, 8);
  }, [subjects, assignmentQueries]);

  const isLoading = subjectsLoading || classesLoading;

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="My Subjects"
          value={isLoading ? "—" : (subjects as Subject[]).length}
          icon={BookOpen}
        />
        <StatCard
          label="My Classes"
          value={isLoading ? "—" : (classes as Class[]).length}
          icon={School}
        />
        <StatCard
          label="Total Assignments"
          value={assignmentQueries.some((q) => q.isLoading) ? "—" : totalAssignments}
          icon={ClipboardList}
        />
        <StatCard
          label="Attendance Today"
          value={attendanceQueries.some((q) => q.isLoading) ? "—" : attendanceMarkedToday}
          icon={CalendarCheck}
        />
      </div>

      {/* ── Today's Attendance ──────────────────────────────────────────────── */}
      <TodayAttendanceCard classes={classes as Class[]} />

      {/* ── Bottom two-column grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent Students */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Recent Students
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            {studentQueries.every((q) => q.isLoading) && classes.length > 0 ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            ) : allStudents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <School className="h-8 w-8 text-body" aria-hidden="true" />
                <p className="text-sm text-body">No students found.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {allStudents.slice(0, 8).map(({ student, className }) => (
                  <li
                    key={student._id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                      {getInitial(student.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-black dark:text-white">
                        {student.fullName}
                      </p>
                      <p className="truncate text-xs text-body">{student.email}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-meta-2 px-2.5 py-0.5 text-xs font-medium text-primary dark:bg-meta-4 dark:text-bodydark">
                      {className}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Recent Assignments
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            {assignmentQueries.every((q) => q.isLoading) && subjects.length > 0 ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            ) : recentAssignments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <ClipboardList className="h-8 w-8 text-body" aria-hidden="true" />
                <p className="text-sm text-body">No assignments yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {recentAssignments.map(({ assignment, subjectName }) => (
                  <li
                    key={assignment._id}
                    className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-black dark:text-white">
                        {assignment.title}
                      </p>
                      <p className="text-xs text-body">{subjectName}</p>
                    </div>
                    {assignment.dueDate ? (
                      <span
                        className={[
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          new Date(assignment.dueDate) < new Date()
                            ? "bg-meta-1/10 text-meta-1"
                            : "bg-primary/10 text-primary",
                        ].join(" ")}
                      >
                        {formatDate(assignment.dueDate)}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-body">No due date</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
