"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/api/attendance";
import { adminApi } from "@/lib/api/admin";
import { classApi } from "@/lib/api/class";
import CardDataStats from "@/components/ui/CardDataStats";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
  UserCheck,
  UserX,
  Clock,
  GraduationCap,
  Users,
  CheckCircle2,
  Download,
} from "lucide-react";
import { exportApi } from "@/lib/api/export";
import type { AuthUser, Class } from "@/lib/types";

type ViewMode = "students" | "lecturers";
type StudentStatus = "present" | "absent";
type LecturerStatus = "present" | "absent" | "leave";

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("students");

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 rounded-md border border-stroke bg-whiter p-1 dark:border-strokedark dark:bg-meta-4 w-fit">
        {(
          [
            { key: "students", label: "Student Attendance", icon: GraduationCap },
            { key: "lecturers", label: "Lecturer Attendance", icon: Users },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={[
              "flex items-center gap-2 rounded px-4 py-2 text-xs font-medium transition-colors",
              viewMode === tab.key
                ? "bg-white text-black shadow-sm dark:bg-boxdark dark:text-white"
                : "text-body hover:text-black dark:hover:text-white",
            ].join(" ")}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
        </div>
        <button
          onClick={() => exportApi.attendanceSummary()}
          className="flex items-center gap-1.5 rounded border border-stroke px-3 py-1.5 text-xs font-medium text-body hover:border-primary hover:text-primary transition-colors dark:border-strokedark dark:hover:border-primary"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export CSV
        </button>
      </div>

      {viewMode === "students" ? (
        <StudentAttendanceView queryClient={queryClient} />
      ) : (
        <LecturerAttendanceView queryClient={queryClient} />
      )}
    </div>
  );
}

// ─── Student Attendance ──────────────────────────────────────────────────────

function StudentAttendanceView({
  queryClient,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [markDate, setMarkDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [statuses, setStatuses] = useState<Record<string, StudentStatus>>({});
  const [formError, setFormError] = useState("");

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classApi.getAll,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  // Students in the selected class
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(
      (s: AuthUser) => s.class === selectedClass || (s as unknown as Record<string, unknown>).class === selectedClass
    );
  }, [students, selectedClass]);

  // Also try to get students from class object
  const selectedClassData = useMemo(() => {
    return (classes as Class[]).find((c) => c._id === selectedClass);
  }, [classes, selectedClass]);

  // Use class.students if available, otherwise filter from all students
  const displayStudents = useMemo(() => {
    if (classStudents.length > 0) return classStudents;
    if (!selectedClassData?.students) return [];
    // If class has student IDs, filter from all students
    const studentIds = new Set(
      (selectedClassData.students as (string | { _id: string })[]).map((s) =>
        typeof s === "string" ? s : s._id
      )
    );
    return students.filter((s: AuthUser) => studentIds.has(s._id));
  }, [classStudents, selectedClassData, students]);

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
          ?.message ?? "Failed to mark attendance";
      setFormError(msg);
    },
  });

  // Stats from current selection
  const stats = useMemo(() => {
    const vals = Object.values(statuses);
    return {
      total: displayStudents.length,
      present: vals.filter((v) => v === "present").length,
      absent: vals.filter((v) => v === "absent").length,
      unmarked: displayStudents.length - vals.length,
    };
  }, [statuses, displayStudents]);

  const setAllStatus = (status: StudentStatus) => {
    const next: Record<string, StudentStatus> = {};
    displayStudents.forEach((s: AuthUser) => {
      next[s._id] = status;
    });
    setStatuses(next);
  };

  const submitAttendance = () => {
    if (!selectedClass || !markDate) return;
    setFormError("");
    const records = Object.entries(statuses).map(([studentId, status]) => ({
      studentId,
      status,
    }));
    if (records.length === 0) return;
    markMutation.mutate({ classId: selectedClass, date: markDate, records });
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardDataStats title="Total Students" total={String(stats.total)} rate="" levelUp>
          <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Present" total={String(stats.present)} rate="" levelUp>
          <UserCheck className="h-6 w-6 text-meta-3" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Absent" total={String(stats.absent)} rate="" levelUp={false}>
          <UserX className="h-6 w-6 text-meta-1" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Unmarked" total={String(stats.unmarked)} rate="" levelUp={false}>
          <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
        </CardDataStats>
      </div>

      {/* Mark attendance card */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-black dark:text-white">
            Mark Student Attendance
          </h2>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end mb-6">
            <div className="flex flex-col gap-1.5 flex-1 max-w-xs">
              <label className="text-sm font-medium text-black dark:text-white">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setStatuses({});
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
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-black dark:text-white">Date</label>
              <input
                type="date"
                value={markDate}
                onChange={(e) => setMarkDate(e.target.value)}
                className="h-9 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              />
            </div>
            {selectedClass && displayStudents.length > 0 && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setAllStatus("present")}>
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  All Present
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAllStatus("absent")}>
                  <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                  All Absent
                </Button>
              </div>
            )}
          </div>

          {/* Student list */}
          {!selectedClass ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarCheck className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm text-body">Select a class to mark attendance.</p>
            </div>
          ) : displayStudents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <GraduationCap className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm text-body">No students found in this class.</p>
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
                  {displayStudents.map((s: AuthUser) => {
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
                                setStatuses((prev) => ({ ...prev, [s._id]: "present" }))
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
                                setStatuses((prev) => ({ ...prev, [s._id]: "absent" }))
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
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
    </>
  );
}

// ─── Lecturer Attendance ─────────────────────────────────────────────────────

function LecturerAttendanceView({
  queryClient,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [markDate, setMarkDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [statuses, setStatuses] = useState<Record<string, LecturerStatus>>({});
  const [formError, setFormError] = useState("");

  const { data: lecturers = [] } = useQuery({
    queryKey: ["admin-lecturers"],
    queryFn: adminApi.getLecturers,
  });

  const markMutation = useMutation({
    mutationFn: attendanceApi.markEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-attendance"] });
      setStatuses({});
      setFormError("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to mark attendance";
      setFormError(msg);
    },
  });

  const stats = useMemo(() => {
    const vals = Object.values(statuses);
    return {
      total: lecturers.length,
      present: vals.filter((v) => v === "present").length,
      absent: vals.filter((v) => v === "absent").length,
      leave: vals.filter((v) => v === "leave").length,
      unmarked: lecturers.length - vals.length,
    };
  }, [statuses, lecturers]);

  const setAllStatus = (status: LecturerStatus) => {
    const next: Record<string, LecturerStatus> = {};
    (lecturers as AuthUser[]).forEach((l) => {
      next[l._id] = status;
    });
    setStatuses(next);
  };

  const submitAttendance = () => {
    if (!markDate) return;
    setFormError("");
    const records = Object.entries(statuses).map(([lecturerId, status]) => ({
      lecturerId,
      status,
    }));
    if (records.length === 0) return;
    markMutation.mutate({ date: markDate, records });
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <CardDataStats title="Total Lecturers" total={String(stats.total)} rate="" levelUp>
          <Users className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Present" total={String(stats.present)} rate="" levelUp>
          <UserCheck className="h-6 w-6 text-meta-3" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Absent" total={String(stats.absent)} rate="" levelUp={false}>
          <UserX className="h-6 w-6 text-meta-1" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="On Leave" total={String(stats.leave)} rate="" levelUp={false}>
          <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats title="Unmarked" total={String(stats.unmarked)} rate="" levelUp={false}>
          <CalendarCheck className="h-6 w-6 text-body" aria-hidden="true" />
        </CardDataStats>
      </div>

      {/* Mark attendance card */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-black dark:text-white">
            Mark Lecturer Attendance
          </h2>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end mb-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-black dark:text-white">Date</label>
              <input
                type="date"
                value={markDate}
                onChange={(e) => setMarkDate(e.target.value)}
                className="h-9 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              />
            </div>
            {lecturers.length > 0 && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setAllStatus("present")}>
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  All Present
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAllStatus("absent")}>
                  <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                  All Absent
                </Button>
              </div>
            )}
          </div>

          {/* Lecturer list */}
          {lecturers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Users className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm text-body">No lecturers found.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <tr>
                    <Th>Lecturer</Th>
                    <Th>Department</Th>
                    <Th>Status</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {(lecturers as AuthUser[]).map((l) => {
                    const current = statuses[l._id];
                    return (
                      <tr
                        key={l._id}
                        className="hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                      >
                        <Td>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                              {l.fullName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-medium text-black dark:text-white">
                                {l.fullName}
                              </span>
                              <p className="text-xs text-body">{l.email}</p>
                            </div>
                          </div>
                        </Td>
                        <Td className="text-body">
                          {l.lecturerProfile?.department ?? "—"}
                        </Td>
                        <Td>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setStatuses((prev) => ({ ...prev, [l._id]: "present" }))
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
                                setStatuses((prev) => ({ ...prev, [l._id]: "absent" }))
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
                            <button
                              type="button"
                              onClick={() =>
                                setStatuses((prev) => ({ ...prev, [l._id]: "leave" }))
                              }
                              className={[
                                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                current === "leave"
                                  ? "bg-yellow-500 text-white"
                                  : "border border-stroke text-body hover:bg-yellow-500/10 hover:text-yellow-600 dark:border-strokedark",
                              ].join(" ")}
                            >
                              Leave
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
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
    </>
  );
}
