"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/api/attendance";
import { classApi } from "@/lib/api/class";
import { subjectApi } from "@/lib/api/subject";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableHead,
  TableBody,
  Th,
  Td,
} from "@/components/ui/Table";
import {
  CalendarCheck,
  GraduationCap,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
} from "lucide-react";
import type { Class, Subject, AuthUser } from "@/lib/types";

type StudentStatus = "present" | "absent";

export default function LecturerAttendancePage() {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [markDate, setMarkDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [statuses, setStatuses] = useState<Record<string, StudentStatus>>({});
  const [formError, setFormError] = useState("");

  // ── Data fetching ────────────────────────────────────────────────────────────

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["lecturer-classes"],
    queryFn: classApi.getForLecturer,
  });

  const { data: allSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["lecturer-subjects"],
    queryFn: subjectApi.getForLecturer,
  });

  // Filter subjects belonging to the selected class
  const classSubjects = useMemo(
    () =>
      (allSubjects as Subject[]).filter((s) => {
        const classId =
          typeof s.class === "string" ? s.class : (s.class as Class)._id;
        return classId === selectedClass;
      }),
    [allSubjects, selectedClass]
  );

  // Step 1: fetch students for the selected class + subject
  const {
    data: attendanceData,
    isLoading: studentsLoading,
    isError: studentsError,
  } = useQuery({
    queryKey: ["attendance-students", selectedClass, selectedSubject],
    queryFn: () =>
      attendanceApi.getStudentsForAttendance(selectedClass, selectedSubject),
    enabled: !!selectedClass && !!selectedSubject,
  });

  const students = attendanceData?.students ?? [];

  // ── Derived stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const vals = Object.values(statuses);
    return {
      total: students.length,
      present: vals.filter((v) => v === "present").length,
      absent: vals.filter((v) => v === "absent").length,
      unmarked: students.length - vals.length,
    };
  }, [statuses, students]);

  // ── Bulk helpers ─────────────────────────────────────────────────────────────

  const setAll = (status: StudentStatus) => {
    const next: Record<string, StudentStatus> = {};
    (students as AuthUser[]).forEach((s) => {
      next[s._id] = status;
    });
    setStatuses(next);
  };

  // ── Mutation ─────────────────────────────────────────────────────────────────

  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setStatuses({});
      setFormError("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to mark attendance. Please try again.";
      setFormError(msg);
    },
  });

  const submitAttendance = () => {
    if (!selectedClass || !selectedSubject || !markDate) return;
    setFormError("");
    const records = Object.entries(statuses).map(([studentId, status]) => ({
      studentId,
      status,
    }));
    if (records.length === 0) return;
    markMutation.mutate({
      classId: selectedClass,
      subjectId: selectedSubject,
      date: markDate,
      records,
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value={selectedClass && selectedSubject ? stats.total : "—"}
          icon={GraduationCap}
        />
        <StatCard
          label="Present"
          value={selectedClass && selectedSubject ? stats.present : "—"}
          icon={UserCheck}
        />
        <StatCard
          label="Absent"
          value={selectedClass && selectedSubject ? stats.absent : "—"}
          icon={UserX}
        />
        <StatCard
          label="Unmarked"
          value={selectedClass && selectedSubject ? stats.unmarked : "—"}
          icon={Clock}
        />
      </div>

      {/* Mark Attendance Card */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-black dark:text-white">
            Mark Attendance
          </h2>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-end mb-6">
            {/* Class selector */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-sm font-medium text-black dark:text-white">
                Class
              </label>
              {classesLoading ? (
                <div className="h-9 w-full animate-pulse rounded border border-stroke bg-stroke dark:border-strokedark dark:bg-strokedark" />
              ) : (
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSubject("");
                    setStatuses({});
                    setFormError("");
                  }}
                  className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                >
                  <option value="">Select a class</option>
                  {(classes as Class[]).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Subject selector */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-sm font-medium text-black dark:text-white">
                Subject
              </label>
              {subjectsLoading ? (
                <div className="h-9 w-full animate-pulse rounded border border-stroke bg-stroke dark:border-strokedark dark:bg-strokedark" />
              ) : (
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setStatuses({});
                    setFormError("");
                  }}
                  disabled={!selectedClass}
                  className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                >
                  <option value="">
                    {selectedClass
                      ? classSubjects.length === 0
                        ? "No subjects for this class"
                        : "Select a subject"
                      : "Select class first"}
                  </option>
                  {classSubjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                      {s.code ? ` (${s.code})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-black dark:text-white">
                Date
              </label>
              <input
                type="date"
                value={markDate}
                onChange={(e) => setMarkDate(e.target.value)}
                className="h-9 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              />
            </div>

            {/* Bulk buttons */}
            {selectedClass && selectedSubject && students.length > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setAll("present")}
                >
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  All Present
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAll("absent")}
                >
                  <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                  All Absent
                </Button>
              </div>
            )}
          </div>

          {/* Student list / empty states */}
          {!selectedClass || !selectedSubject ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <CalendarCheck
                className="h-8 w-8 text-body"
                aria-hidden="true"
              />
              <p className="text-sm text-body">
                Select a class and subject above to begin marking attendance.
              </p>
            </div>
          ) : studentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            </div>
          ) : studentsError ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm text-meta-1">
                Failed to load students. Please try again.
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <GraduationCap
                className="h-8 w-8 text-body"
                aria-hidden="true"
              />
              <p className="text-sm text-body">
                No students found in this class.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <tr>
                    <Th>Student</Th>
                    <Th>Email</Th>
                    <Th>Status</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {(students as AuthUser[]).map((s) => {
                    const current = statuses[s._id];
                    return (
                      <tr
                        key={s._id}
                        className="hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                      >
                        <Td>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                              {s.fullName.charAt(0)}
                            </div>
                            <span className="font-medium text-black dark:text-white">
                              {s.fullName}
                            </span>
                          </div>
                        </Td>
                        <Td className="text-body">{s.email}</Td>
                        <Td>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setStatuses((prev) => ({
                                  ...prev,
                                  [s._id]: "present",
                                }))
                              }
                              className={[
                                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                current === "present"
                                  ? "bg-meta-3 text-white"
                                  : "border border-stroke text-body hover:bg-meta-3/10 hover:text-meta-3 dark:border-strokedark",
                              ].join(" ")}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setStatuses((prev) => ({
                                  ...prev,
                                  [s._id]: "absent",
                                }))
                              }
                              className={[
                                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                current === "absent"
                                  ? "bg-meta-1 text-white"
                                  : "border border-stroke text-body hover:bg-meta-1/10 hover:text-meta-1 dark:border-strokedark",
                              ].join(" ")}
                            >
                              Absent
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </TableBody>
              </Table>

              {markMutation.isSuccess && (
                <div className="mt-4 flex items-center gap-2 rounded-md bg-meta-3/10 px-3 py-2 text-xs text-meta-3">
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  Attendance recorded successfully.
                </div>
              )}

              {formError && (
                <p className="mt-4 rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">
                  {formError}
                </p>
              )}

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={submitAttendance}
                  isLoading={markMutation.isPending}
                  disabled={Object.keys(statuses).length === 0}
                >
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                  Submit Attendance
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
