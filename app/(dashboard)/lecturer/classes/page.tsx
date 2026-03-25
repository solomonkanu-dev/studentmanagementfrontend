"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { classApi } from "@/lib/api/class";
import { attendanceApi } from "@/lib/api/attendance";
import { adminApi } from "@/lib/api/admin";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { School, Users, ChevronRight, X } from "lucide-react";
import type { Class, AuthUser, Result, AttendanceSummary } from "@/lib/types";

// ─── Student detail modal ─────────────────────────────────────────────────────

interface StudentModalProps {
  student: AuthUser;
  classId: string;
  className: string;
  onClose: () => void;
}

function StudentModal({
  student,
  classId,
  className,
  onClose,
}: StudentModalProps) {
  const { data: attendanceSummary, isLoading: attLoading } = useQuery({
    queryKey: ["student-attendance-summary", student._id],
    queryFn: () => attendanceApi.getStudentSummary(student._id),
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["class-results", classId],
    queryFn: () => adminApi.getResultsByClass(classId),
  });

  // Filter results to this student
  const studentResults = (results as Result[]).filter((r) => {
    const studentId =
      typeof r.student === "string" ? r.student : r.student._id;
    return studentId === student._id;
  });

  // Parse attendance summary — handle multiple shapes the API might return
  const summaries: AttendanceSummary[] = (() => {
    if (!attendanceSummary) return [];
    if (Array.isArray(attendanceSummary)) return attendanceSummary as AttendanceSummary[];
    const d = attendanceSummary as Record<string, unknown>;
    if (Array.isArray(d.subjects)) return d.subjects as AttendanceSummary[];
    if (Array.isArray(d.data)) return d.data as AttendanceSummary[];
    return [];
  })();

  const overallRate =
    summaries.length > 0
      ? Math.round(
          summaries.reduce((s, a) => s + (a.percentage ?? 0), 0) /
            summaries.length
        )
      : null;

  const gradeColor = (pct: number) => {
    if (pct >= 75) return "success";
    if (pct >= 50) return "warning";
    return "danger";
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Student Details"
      className="max-w-lg"
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-meta-2 text-xl font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
          {student.fullName.charAt(0)}
        </div>
        <div>
          <h3 className="text-base font-semibold text-black dark:text-white">
            {student.fullName}
          </h3>
          <p className="text-sm text-body">{student.email}</p>
          <Badge variant="info" className="mt-1">
            {className}
          </Badge>
        </div>
      </div>

      {/* Attendance section */}
      <div className="mb-6">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">
          Attendance
        </h4>
        {attLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          </div>
        ) : summaries.length === 0 ? (
          <p className="text-sm text-body">No attendance data available.</p>
        ) : (
          <div className="space-y-3">
            {overallRate !== null && (
              <div className="mb-3 flex items-center justify-between rounded-md bg-whiter px-4 py-2.5 dark:bg-meta-4">
                <span className="text-sm font-medium text-black dark:text-white">
                  Overall Rate
                </span>
                <Badge variant={gradeColor(overallRate)}>
                  {overallRate}%
                </Badge>
              </div>
            )}
            {summaries.map((a) => {
              const pct = a.percentage ?? 0;
              const barColor =
                pct >= 75
                  ? "bg-meta-3"
                  : pct >= 50
                  ? "bg-yellow-400"
                  : "bg-meta-1";
              return (
                <div key={a.subjectId ?? a.subjectName}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-black dark:text-white">
                      {a.subjectName}
                    </span>
                    <span className="text-xs text-body">
                      {a.present}/{a.total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results section */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">
          Results
        </h4>
        {resultsLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          </div>
        ) : studentResults.length === 0 ? (
          <p className="text-sm text-body">No results recorded.</p>
        ) : (
          <div className="space-y-2">
            {studentResults.map((r) => {
              const subjectName =
                typeof r.subject === "string"
                  ? r.subject
                  : (r.subject as { name: string }).name;
              const total = r.totalScore ?? 100;
              const pct = Math.round((r.marksObtained / total) * 100);
              const barColor =
                pct >= 75
                  ? "bg-meta-3"
                  : pct >= 50
                  ? "bg-yellow-400"
                  : "bg-meta-1";
              return (
                <div key={r._id}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-black dark:text-white">
                      {subjectName}
                    </span>
                    <span className="text-xs text-body">
                      {r.marksObtained}/{total}
                      {r.grade && (
                        <span className="ml-1.5 font-semibold text-primary">
                          {r.grade}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Class panel ──────────────────────────────────────────────────────────────

interface ClassPanelProps {
  cls: Class;
  onClose: () => void;
  onSelectStudent: (student: AuthUser) => void;
}

function ClassStudentsPanel({ cls, onClose, onSelectStudent }: ClassPanelProps) {
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["class-students", cls._id],
    queryFn: () => classApi.getStudents(cls._id),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <School className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">
              {cls.name} — Students
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          </div>
        ) : (students as AuthUser[]).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-8 w-8 text-body" aria-hidden="true" />
            <p className="text-sm text-body">No students in this class.</p>
          </div>
        ) : (
          <ul className="divide-y divide-stroke dark:divide-strokedark">
            {(students as AuthUser[]).map((s) => (
              <li key={s._id}>
                <button
                  type="button"
                  onClick={() => onSelectStudent(s)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                    {s.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black dark:text-white">
                      {s.fullName}
                    </p>
                    <p className="truncate text-xs text-body">{s.email}</p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-body"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LecturerClassesPage() {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<AuthUser | null>(null);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["lecturer-classes"],
    queryFn: classApi.getForLecturer,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-black dark:text-white">
        My Classes
      </h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : (classes as Class[]).length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <School className="h-10 w-10 text-body" aria-hidden="true" />
          <p className="text-sm font-medium text-black dark:text-white">
            No classes assigned yet
          </p>
          <p className="text-xs text-body">
            Classes assigned to you will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Class cards */}
          <div
            className={
              selectedClass
                ? "lg:col-span-1 grid grid-cols-1 gap-4 content-start"
                : "lg:col-span-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            }
          >
            {(classes as Class[]).map((cls) => {
              const isActive = selectedClass?._id === cls._id;
              const studentCount =
                Array.isArray(cls.students) ? cls.students.length : 0;
              return (
                <div
                  key={cls._id}
                  className={[
                    "rounded-sm border shadow-default transition-all",
                    "bg-white dark:bg-boxdark",
                    isActive
                      ? "border-primary"
                      : "border-stroke dark:border-strokedark hover:border-primary/50",
                  ].join(" ")}
                >
                  <div className="p-5">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                      <School
                        className="h-5 w-5 text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="mb-1 text-base font-semibold text-black dark:text-white">
                      {cls.name}
                    </h3>
                    <p className="mb-4 flex items-center gap-1.5 text-sm text-body">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {studentCount} student{studentCount !== 1 ? "s" : ""}
                    </p>
                    <Button
                      size="sm"
                      variant={isActive ? "primary" : "secondary"}
                      className="w-full"
                      onClick={() =>
                        setSelectedClass(isActive ? null : cls)
                      }
                    >
                      {isActive ? "Hide Students" : "View Students"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Students panel */}
          {selectedClass && (
            <div className="lg:col-span-2">
              <ClassStudentsPanel
                cls={selectedClass}
                onClose={() => setSelectedClass(null)}
                onSelectStudent={setSelectedStudent}
              />
            </div>
          )}
        </div>
      )}

      {/* Student detail modal */}
      {selectedStudent && selectedClass && (
        <StudentModal
          student={selectedStudent}
          classId={selectedClass._id}
          className={selectedClass.name}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
