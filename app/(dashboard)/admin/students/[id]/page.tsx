"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { attendanceApi } from "@/lib/api/attendance";
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
  Pencil,
  X,
  User,
  Phone,
  MapPin,
  Heart,
  School,
  Users,
} from "lucide-react";
import type { AuthUser, Result, Subject, Submission, Assignment } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function StudentDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "profile">("overview");
  const [editOpen, setEditOpen] = useState(false);

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ["admin-student", id],
    queryFn: () => adminApi.getStudent(id),
  });

  const { data: attendanceSummary } = useQuery({
    queryKey: ["student-attendance", id],
    queryFn: () => attendanceApi.getStudentSummary(id),
    enabled: !!id,
  });

  const classId =
    student?.class && typeof student.class === "object"
      ? (student.class as { _id: string })._id
      : (student?.class as string | undefined);

  const { data: classResults = [] } = useQuery({
    queryKey: ["class-results", classId],
    queryFn: () => adminApi.getResultsByClass(classId!),
    enabled: !!classId,
  });

  const { data: studentAssignments = [] } = useQuery({
    queryKey: ["student-assignments", id],
    queryFn: () => adminApi.getStudentAssignments(id),
    enabled: !!id,
  });

  const studentResults = useMemo(() => {
    return classResults.filter((r: Result) => {
      const studentId = typeof r.student === "object" ? (r.student as AuthUser)._id : r.student;
      return studentId === id;
    });
  }, [classResults, id]);

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

  const gradeStats = useMemo(() => {
    if (studentResults.length === 0) return { avg: 0, highest: 0, lowest: 0, total: 0 };
    const marks = studentResults
      .map((r: Result) => r.marksObtained)
      .filter((m): m is number => typeof m === "number" && !isNaN(m));
    if (marks.length === 0) return { avg: 0, highest: 0, lowest: 0, total: 0 };
    const sum = marks.reduce((a, b) => a + b, 0);
    return {
      avg: Math.round(sum / marks.length),
      highest: Math.max(...marks),
      lowest: Math.min(...marks),
      total: marks.length,
    };
  }, [studentResults]);

  const submittedCount = studentAssignments.filter((a) => a.submission !== null).length;
  const totalAssignments = studentAssignments.length;

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

  const className =
    student.class && typeof student.class === "object"
      ? (student.class as { _id: string; name: string }).name
      : (student.class as string | undefined) ?? "—";

  const sp = (student as unknown as Record<string, unknown>).studentProfile as Record<string, unknown> | undefined;

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
          <Badge variant={student.approved ? "success" : "warning"}>
            {student.approved ? "Active" : "Pending"}
          </Badge>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-stroke dark:border-strokedark">
        <nav className="-mb-px flex gap-6">
          {(["overview", "profile"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "pb-3 text-sm font-medium capitalize transition-colors",
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-body hover:text-black dark:hover:text-white",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Quick stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CardDataStats title="Attendance Rate" total={`${attPercentage}%`} rate="" levelUp={attPercentage >= 75}>
              <CalendarCheck className={`h-6 w-6 ${attendanceColor}`} aria-hidden="true" />
            </CardDataStats>
            <CardDataStats title="Average Grade" total={gradeStats.total > 0 ? `${gradeStats.avg}%` : "—"} rate="" levelUp={gradeStats.avg >= 50}>
              <TrendingUp className="h-6 w-6 text-primary" aria-hidden="true" />
            </CardDataStats>
            <CardDataStats title="Subjects Graded" total={String(gradeStats.total)} rate="" levelUp>
              <BookOpen className="h-6 w-6 text-meta-3" aria-hidden="true" />
            </CardDataStats>
            <CardDataStats title="Assignments" total={`${submittedCount}/${totalAssignments}`} rate="" levelUp={submittedCount === totalAssignments && totalAssignments > 0}>
              <ClipboardList className="h-6 w-6 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
            </CardDataStats>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Attendance Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-black dark:text-white">Attendance Overview</h2>
                  <Badge variant={attendanceBadgeVariant as "success" | "warning" | "danger"} className="capitalize">
                    {attendanceStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <div className="relative shrink-0">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-stroke dark:text-strokedark" />
                      {attTotal > 0 && (
                        <circle
                          cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10"
                          strokeDasharray={`${(attPercentage / 100) * 314.16} 314.16`}
                          strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 60 60)"
                          className={attendanceColor}
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-xl font-bold ${attendanceColor}`}>{attPercentage}%</span>
                    </div>
                  </div>
                  <div className="space-y-3 flex-1">
                    <LegendRow color="bg-meta-3" label="Present" value={attPresent} total={attTotal} />
                    <LegendRow color="bg-meta-1" label="Absent" value={attAbsent} total={attTotal} />
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

            {/* Subject Performance */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-black dark:text-white">Subject Performance</h2>
              </CardHeader>
              <CardContent>
                {studentResults.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <BookOpen className="h-8 w-8 text-body" aria-hidden="true" />
                    <p className="text-sm text-body">No grades recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentResults.filter((r: Result) => typeof r.marksObtained === "number" && !isNaN(r.marksObtained)).map((r: Result) => {
                      const subjectName = typeof r.subject === "object" ? (r.subject as Subject).name : "Subject";
                      const total = r.totalScore ?? 100;
                      const pct = Math.min(100, Math.round((r.marksObtained / total) * 100));
                      const barColor = pct >= 75 ? "bg-meta-3" : pct >= 50 ? "bg-yellow-500" : "bg-meta-1";
                      return (
                        <div key={r._id}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-medium text-black dark:text-white">{subjectName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-black dark:text-white">{r.marksObtained}/{total}</span>
                              {r.grade && (
                                <Badge variant={pct >= 75 ? "success" : pct >= 50 ? "warning" : "danger"}>{r.grade}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-stroke dark:bg-strokedark">
                            <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
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

          {/* Detailed Results table */}
          {studentResults.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-black dark:text-white">Detailed Results</h2>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHead>
                    <tr>
                      <Th>Subject</Th><Th>Marks</Th><Th>Total</Th><Th>Percentage</Th><Th>Grade</Th><Th>Status</Th>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {studentResults.filter((r: Result) => typeof r.marksObtained === "number" && !isNaN(r.marksObtained)).map((r: Result) => {
                      const subjectName = typeof r.subject === "object" ? (r.subject as Subject).name : "—";
                      const total = r.totalScore ?? 100;
                      const pct = Math.min(100, Math.round((r.marksObtained / total) * 100));
                      return (
                        <tr key={r._id} className="hover:bg-whiter transition-colors dark:hover:bg-meta-4">
                          <Td className="font-medium text-black dark:text-white">{subjectName}</Td>
                          <Td className="text-body">{r.marksObtained}</Td>
                          <Td className="text-body">{total}</Td>
                          <Td>
                            <span className={["text-sm font-semibold", pct >= 75 ? "text-meta-3" : pct >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-meta-1"].join(" ")}>
                              {pct}%
                            </span>
                          </Td>
                          <Td>
                            {r.grade ? (
                              <Badge variant={pct >= 75 ? "success" : pct >= 50 ? "warning" : "danger"}>{r.grade}</Badge>
                            ) : (
                              <span className="text-xs text-body">—</span>
                            )}
                          </Td>
                          <Td>
                            <div className="flex items-center gap-1.5 text-xs">
                              {pct >= 50 ? (
                                <><CheckCircle2 className="h-3.5 w-3.5 text-meta-3" /><span className="text-meta-3">Pass</span></>
                              ) : (
                                <><XCircle className="h-3.5 w-3.5 text-meta-1" /><span className="text-meta-1">Fail</span></>
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

          {/* Assignments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-black dark:text-white">Assignments</h2>
                <span className="text-xs text-body">{submittedCount} of {totalAssignments} submitted</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {studentAssignments.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <ClipboardList className="h-8 w-8 text-body" aria-hidden="true" />
                  <p className="text-sm text-body">No assignments found for this student.</p>
                </div>
              ) : (
                <Table>
                  <TableHead>
                    <tr>
                      <Th>Title</Th><Th>Subject</Th><Th>Due Date</Th><Th>Status</Th><Th>Score</Th>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {studentAssignments.map(({ assignment, submission }) => {
                      const isOverdue = !submission && assignment.dueDate != null && new Date(assignment.dueDate) < new Date();
                      const subjectName = typeof assignment.subject === "object" && assignment.subject
                        ? (assignment.subject as { name: string }).name
                        : "—";
                      return (
                        <tr key={assignment._id} className="hover:bg-whiter transition-colors dark:hover:bg-meta-4">
                          <Td className="font-medium text-black dark:text-white">{assignment.title}</Td>
                          <Td className="text-body">{subjectName}</Td>
                          <Td className="text-xs text-body">
                            {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </Td>
                          <Td>
                            {submission ? (
                              <Badge variant={submission.status === "graded" ? "success" : submission.isLate ? "warning" : "info"}>
                                {submission.status === "graded" ? "Graded" : submission.isLate ? "Late" : "Submitted"}
                              </Badge>
                            ) : (
                              <Badge variant={isOverdue ? "danger" : "default"}>
                                {isOverdue ? "Overdue" : "Pending"}
                              </Badge>
                            )}
                          </Td>
                          <Td className="font-semibold text-black dark:text-white">
                            {submission?.score != null ? `${submission.score}/${assignment.totalMarks ?? 100}` : "—"}
                          </Td>
                        </tr>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Overall Performance */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-black dark:text-white">Overall Performance</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <PerformanceGauge label="Attendance" value={attPercentage} icon={CalendarCheck} />
                <PerformanceGauge label="Academics" value={gradeStats.avg} icon={BookOpen} />
                <PerformanceGauge
                  label="Overall"
                  value={gradeStats.total > 0 ? Math.round((attPercentage + gradeStats.avg) / 2) : attPercentage}
                  icon={TrendingUp}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Profile header actions */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black dark:text-white">Student Information</h2>
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Basic info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-black dark:text-white">Basic Information</h3>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <ProfileRow label="Full Name" value={student.fullName} />
                  <ProfileRow label="Email" value={student.email} />
                  <ProfileRow label="Class" value={className} />
                  <ProfileRow label="Registration No." value={(sp?.registrationNumber as string) ?? "—"} />
                  <ProfileRow label="Admission Date" value={sp?.dateOfAdmission ? new Date(sp.dateOfAdmission as string).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
                  <ProfileRow label="Date of Birth" value={sp?.dateOfBirth ? new Date(sp.dateOfBirth as string).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
                  <ProfileRow label="Gender" value={(sp?.gender as string) ?? "—"} />
                  <ProfileRow label="Blood Group" value={(sp?.bloodGroup as string) ?? "—"} />
                  <ProfileRow label="Religion" value={(sp?.religion as string) ?? "—"} />
                </dl>
              </CardContent>
            </Card>

            {/* Contact & guardian */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-black dark:text-white">Contact</h3>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    <ProfileRow label="Phone" value={(sp?.mobileNumber as string) ?? "—"} />
                    <ProfileRow label="Address" value={(sp?.address as string) ?? "—"} />
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-black dark:text-white">Guardian</h3>
                  </div>
                </CardHeader>
                <CardContent>
                  {sp?.guardian ? (
                    <dl className="space-y-3">
                      <ProfileRow label="Name" value={((sp.guardian as Record<string, string>).guardianName) ?? "—"} />
                      <ProfileRow label="Relation" value={((sp.guardian as Record<string, string>).guardianRelationship) ?? "—"} />
                      <ProfileRow label="Phone" value={((sp.guardian as Record<string, string>).guardianPhone) ?? "—"} />
                      <ProfileRow label="Occupation" value={((sp.guardian as Record<string, string>).guardianOccupation) ?? "—"} />
                    </dl>
                  ) : (
                    <p className="text-sm text-body">No guardian info recorded.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Additional info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-black dark:text-white">Additional Details</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <ProfileRow label="Previous School" value={(sp?.previousSchool as string) ?? "—"} />
                <ProfileRow label="Family Type" value={(sp?.familyType as string) ?? "—"} />
                <ProfileRow label="Orphan Status" value={(sp?.orphanStatus as string) ?? "—"} />
                <ProfileRow label="Medical Info" value={(sp?.medicalInfo as string) ?? "—"} />
                <ProfileRow label="Lifecycle Status" value={((student as unknown as Record<string, unknown>).lifecycleStatus as string) ?? "—"} />
                <ProfileRow label="Account Status" value={student.approved ? "Approved" : "Pending"} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editOpen && student && (
        <EditProfileModal
          student={student}
          studentProfile={sp}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-student", id] });
            setEditOpen(false);
          }}
          studentId={id}
        />
      )}
    </div>
  );
}

// ─── Edit Profile Modal ─────────────────────────────────────────────────────

function EditProfileModal({
  student,
  studentProfile,
  onClose,
  onSaved,
  studentId,
}: {
  student: AuthUser;
  studentProfile: Record<string, unknown> | undefined;
  onClose: () => void;
  onSaved: () => void;
  studentId: string;
}) {
  const sp = studentProfile ?? {};
  const guardian = (sp.guardian as Record<string, string> | undefined) ?? {};

  const [form, setForm] = useState({
    fullName: student.fullName ?? "",
    email: student.email ?? "",
    mobileNumber: (sp.mobileNumber as string) ?? "",
    address: (sp.address as string) ?? "",
    dateOfAdmission: sp.dateOfAdmission ? (sp.dateOfAdmission as string).slice(0, 10) : "",
    dateOfBirth: sp.dateOfBirth ? (sp.dateOfBirth as string).slice(0, 10) : "",
    gender: (sp.gender as string) ?? "",
    bloodGroup: (sp.bloodGroup as string) ?? "",
    religion: (sp.religion as string) ?? "",
    registrationNumber: (sp.registrationNumber as string) ?? "",
    previousSchool: (sp.previousSchool as string) ?? "",
    medicalInfo: (sp.medicalInfo as string) ?? "",
    guardianName: guardian.guardianName ?? "",
    guardianRelationship: guardian.guardianRelationship ?? "",
    guardianPhone: guardian.guardianPhone ?? "",
    guardianOccupation: guardian.guardianOccupation ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await adminApi.updateStudent(studentId, {
        fullName: form.fullName,
        email: form.email,
        studentProfile: {
          mobileNumber: form.mobileNumber,
          address: form.address,
          dateOfAdmission: form.dateOfAdmission || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          religion: form.religion,
          registrationNumber: form.registrationNumber,
          previousSchool: form.previousSchool,
          medicalInfo: form.medicalInfo,
          guardian: {
            guardianName: form.guardianName,
            guardianRelationship: form.guardianRelationship,
            guardianPhone: form.guardianPhone,
            guardianOccupation: form.guardianOccupation,
          },
        },
      });
      onSaved();
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-boxdark">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h2 className="text-base font-semibold text-black dark:text-white">Edit Student Profile</h2>
          <button onClick={onClose} className="text-body hover:text-black dark:hover:text-white transition-colors">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Basic */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-body">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Name">
                <input name="fullName" value={form.fullName} onChange={handleChange} className={inputCls} required />
              </Field>
              <Field label="Email">
                <input name="email" type="email" value={form.email} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Registration No.">
                <input name="registrationNumber" value={form.registrationNumber} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Admission Date">
                <input name="dateOfAdmission" type="date" value={form.dateOfAdmission} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Date of Birth">
                <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Gender">
                <select name="gender" value={form.gender} onChange={handleChange} className={inputCls}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Blood Group">
                <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className={inputCls}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </Field>
              <Field label="Religion">
                <input name="religion" value={form.religion} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Previous School">
                <input name="previousSchool" value={form.previousSchool} onChange={handleChange} className={inputCls} />
              </Field>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-body">Contact</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Phone">
                <input name="mobileNumber" value={form.mobileNumber} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Medical Info">
                <input name="medicalInfo" value={form.medicalInfo} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <textarea name="address" value={form.address} onChange={handleChange} rows={2} className={inputCls} />
              </Field>
            </div>
          </section>

          {/* Guardian */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-body">Guardian</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Guardian Name">
                <input name="guardianName" value={form.guardianName} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Relation">
                <input name="guardianRelationship" value={form.guardianRelationship} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Guardian Phone">
                <input name="guardianPhone" value={form.guardianPhone} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Occupation">
                <input name="guardianOccupation" value={form.guardianOccupation} onChange={handleChange} className={inputCls} />
              </Field>
            </div>
          </section>

          {error && <p className="text-sm text-meta-1">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-stroke pt-4 dark:border-strokedark">
            <button type="button" onClick={onClose} className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-body hover:bg-whiter transition-colors dark:border-strokedark dark:hover:bg-meta-4">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60 transition-colors">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Small helpers ───────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-body">{label}</label>
      {children}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-stroke last:border-0 dark:border-strokedark">
      <dt className="shrink-0 text-xs text-body">{label}</dt>
      <dd className="text-right text-xs font-medium text-black dark:text-white">{value || "—"}</dd>
    </div>
  );
}

function LegendRow({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-xs text-body">{label}</span>
      </div>
      <span className="text-xs font-medium text-black dark:text-white">{value} ({pct}%)</span>
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

function PerformanceGauge({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const status = value >= 75 ? "Excellent" : value >= 50 ? "Average" : value > 0 ? "Needs Improvement" : "No Data";
  const statusColor = value >= 75 ? "text-meta-3" : value >= 50 ? "text-yellow-600 dark:text-yellow-400" : value > 0 ? "text-meta-1" : "text-body";
  const barColor = value >= 75 ? "bg-meta-3" : value >= 50 ? "bg-yellow-500" : value > 0 ? "bg-meta-1" : "bg-stroke";

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
        <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${value}%` }} />
      </div>
      <p className={`mt-1.5 text-[10px] font-medium uppercase tracking-wide ${statusColor}`}>{status}</p>
    </div>
  );
}
