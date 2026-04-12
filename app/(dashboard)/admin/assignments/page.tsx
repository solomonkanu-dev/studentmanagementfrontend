"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { submissionApi } from "@/lib/api/assignment";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ClipboardList,
  FileText,
  Users,
  Paperclip,
  Download,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  X,
} from "lucide-react";
import { errMsg } from "@/lib/utils/errMsg";
import { formatDate, isPastDue, fileNameFromUrl } from "@/lib/utils/assignmentUtils";
import type { Assignment, Submission, AuthUser, Subject } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function subjectName(subject: string | Subject | undefined): string {
  if (!subject) return "—";
  return typeof subject === "object" ? subject.name : subject;
}

// ─── Grading Drawer ───────────────────────────────────────────────────────────

function GradingDrawer({
  student,
  submission,
  assignment,
  onClose,
}: {
  student: AuthUser;
  submission: Submission | null;
  assignment: Assignment;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [score, setScore] = useState<string>(
    submission?.score != null ? String(submission.score) : ""
  );
  const [feedback, setFeedback] = useState(submission?.feedback ?? "");
  const [scoreError, setScoreError] = useState("");
  const [success, setSuccess] = useState(false);

  const totalMarks = assignment.totalMarks ?? 100;

  const gradeMutation = useMutation({
    mutationFn: (payload: { score: number; feedback?: string }) =>
      submissionApi.grade(submission!._id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submissions", assignment._id] });
      setSuccess(true);
    },
    onError: (err) => setScoreError(errMsg(err, "Failed to save grade")),
  });

  const handleGrade = () => {
    setScoreError("");
    setSuccess(false);
    if (!submission) return;
    const num = Number(score);
    if (!score || isNaN(num) || num < 0 || num > totalMarks) {
      setScoreError(`Score must be 0–${totalMarks}`);
      return;
    }
    gradeMutation.mutate({ score: num, feedback: feedback || undefined });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-black dark:text-white">
              {student.fullName}
            </p>
            <p className="truncate text-xs text-body">{student.email}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-stroke transition-colors dark:hover:bg-meta-4"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4 text-body" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Assignment info */}
          <div className="rounded-lg border border-stroke bg-whiter px-4 py-3 dark:border-strokedark dark:bg-meta-4">
            <p className="text-xs font-semibold text-black dark:text-white">{assignment.title}</p>
            <p className="mt-0.5 text-xs text-body">
              Subject: {subjectName(assignment.subject)}
            </p>
            {assignment.dueDate && (
              <p className="mt-0.5 text-xs text-body">
                Due: {formatDate(assignment.dueDate)}
                {isPastDue(assignment.dueDate) && (
                  <span className="ml-1 text-meta-1">(past due)</span>
                )}
              </p>
            )}
            <p className="mt-0.5 text-xs text-body">Total marks: {totalMarks}</p>
          </div>

          {!submission ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-stroke py-10 text-center dark:border-strokedark">
              <FileText className="h-8 w-8 text-body" />
              <p className="text-sm text-body">Student has not submitted yet.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={submission.status === "graded" ? "info" : "default"}>
                  {submission.status === "graded" ? "Graded" : "Pending review"}
                </Badge>
                {submission.isLate && <Badge variant="danger">Late submission</Badge>}
                <span className="text-xs text-body">
                  Submitted {formatDate(submission.createdAt)}
                </span>
              </div>

              {submission.content && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-body">
                    Written Answer
                  </p>
                  <div className="rounded-lg border border-stroke bg-whiter p-4 text-sm leading-relaxed text-black whitespace-pre-wrap dark:border-strokedark dark:bg-meta-4 dark:text-white">
                    {submission.content}
                  </div>
                </div>
              )}

              {submission.fileUrl && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-body">
                    Attached File
                  </p>
                  <div className="flex items-center gap-3 rounded-lg border border-stroke bg-whiter p-3 dark:border-strokedark dark:bg-meta-4">
                    <Paperclip className="h-5 w-5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm text-black dark:text-white">
                      {fileNameFromUrl(submission.fileUrl)}
                    </span>
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex shrink-0 items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-body hover:bg-stroke transition-colors dark:hover:bg-strokedark"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </a>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-body">
                  Grade Submission
                </p>
                <div className="flex gap-3">
                  <div className="w-36 shrink-0">
                    <Input
                      type="number"
                      min={0}
                      max={totalMarks}
                      placeholder={`Score (0–${totalMarks})`}
                      value={score}
                      onChange={(e) => { setScore(e.target.value); setScoreError(""); setSuccess(false); }}
                      error={scoreError}
                      label={`Score / ${totalMarks}`}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                      Feedback <span className="font-normal text-body">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Leave feedback for the student…"
                      value={feedback}
                      onChange={(e) => { setFeedback(e.target.value); setSuccess(false); }}
                      className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>
                {success && (
                  <p className="flex items-center gap-1.5 text-sm text-meta-3">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Grade saved successfully.
                  </p>
                )}
                <Button onClick={handleGrade} isLoading={gradeMutation.isPending}>
                  Save Grade
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Submission Panel ─────────────────────────────────────────────────────────

function SubmissionPanel({
  assignment,
  onClose,
}: {
  assignment: Assignment;
  onClose: () => void;
}) {
  const [drawerStudent, setDrawerStudent] = useState<AuthUser | null>(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-submissions", assignment._id],
    queryFn: () => submissionApi.getByAssignment(assignment._id),
  });

  const classId =
    assignment.class
      ? typeof assignment.class === "string"
        ? assignment.class
        : (assignment.class as { _id: string })._id
      : null;

  const { data: classStudents = [] } = useQuery({
    queryKey: ["admin-class-students", classId],
    queryFn: () => adminApi.getClassStudents(classId!),
    enabled: !!classId,
  });

  // Build a set of students from submissions for ones where class isn't available
  const studentsFromSubmissions: AuthUser[] = (submissions as Submission[])
    .map((s) => (typeof s.student === "object" ? (s.student as AuthUser) : null))
    .filter((s): s is AuthUser => !!s);

  const allStudents: AuthUser[] =
    (classStudents as AuthUser[]).length > 0
      ? (classStudents as AuthUser[])
      : studentsFromSubmissions;

  const submissionMap = new Map<string, Submission>(
    (submissions as Submission[]).map((s) => {
      const studentId =
        typeof s.student === "string" ? s.student : (s.student as AuthUser)._id;
      return [studentId, s];
    })
  );

  const drawerSubmission = drawerStudent
    ? (submissionMap.get(drawerStudent._id) ?? null)
    : null;

  const submitted = (submissions as Submission[]).length;
  const graded = (submissions as Submission[]).filter((s) => s.status === "graded").length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-black dark:text-white">
                {assignment.title}
              </h2>
              <p className="text-xs text-body">
                {subjectName(assignment.subject)} · Due: {formatDate(assignment.dueDate)} ·{" "}
                <span className="font-medium text-black dark:text-white">{submitted}</span> submitted ·{" "}
                <span className="font-medium text-meta-3">{graded}</span> graded
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            </div>
          ) : allStudents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center px-5">
              <Users className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm text-body">No submissions yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stroke dark:divide-strokedark">
              {allStudents.map((student) => {
                const sub = submissionMap.get(student._id);
                const hasSubmitted = !!sub;
                const isGraded = sub?.status === "graded";

                return (
                  <li key={student._id}>
                    <button
                      type="button"
                      onClick={() => setDrawerStudent(student)}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                        {student.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-black dark:text-white">
                          {student.fullName}
                        </p>
                        <p className="truncate text-xs text-body">{student.email}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {hasSubmitted ? (
                          <>
                            {sub?.fileUrl && (
                              <Paperclip className="h-3.5 w-3.5 text-body" />
                            )}
                            <Badge variant={isGraded ? "info" : "success"}>
                              {isGraded
                                ? `${sub?.score ?? "—"}/${assignment.totalMarks ?? 100}`
                                : "Submitted"}
                            </Badge>
                            {sub?.isLate && <Badge variant="danger">Late</Badge>}
                          </>
                        ) : (
                          <Badge variant="danger">Not submitted</Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-body" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {drawerStudent && (
        <GradingDrawer
          student={drawerStudent}
          submission={drawerSubmission}
          assignment={assignment}
          onClose={() => setDrawerStudent(null)}
        />
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminAssignmentsPage() {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: adminApi.getAssignments,
  });

  // Build unique subject list for filter tabs
  const subjects = Array.from(
    new Map(
      (assignments as Assignment[])
        .map((a) => {
          const s = a.subject;
          const id = typeof s === "object" ? s._id : s;
          const name = typeof s === "object" ? s.name : s;
          return [id, { id, name }];
        })
    ).values()
  );

  const filtered =
    subjectFilter === "all"
      ? (assignments as Assignment[])
      : (assignments as Assignment[]).filter((a) => {
          const id = typeof a.subject === "object" ? a.subject._id : a.subject;
          return id === subjectFilter;
        });

  return (
    <div className="space-y-6">
      {/* Subject filter tabs */}
      {!isLoading && subjects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setSubjectFilter("all"); setSelectedAssignment(null); }}
            className={[
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              subjectFilter === "all"
                ? "bg-primary text-white"
                : "border border-stroke text-body hover:border-primary hover:text-primary dark:border-strokedark dark:hover:border-primary",
            ].join(" ")}
          >
            All
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSubjectFilter(s.id); setSelectedAssignment(null); }}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                subjectFilter === s.id
                  ? "bg-primary text-white"
                  : "border border-stroke text-body hover:border-primary hover:text-primary dark:border-strokedark dark:hover:border-primary",
              ].join(" ")}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Assignment list */}
        <div className={selectedAssignment ? "xl:col-span-2" : "xl:col-span-5"}>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Assignments
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center px-5">
                  <ClipboardList className="h-8 w-8 text-body" aria-hidden="true" />
                  <p className="text-sm text-body">No assignments found.</p>
                </div>
              ) : (
                <ul className="divide-y divide-stroke dark:divide-strokedark">
                  {filtered.map((a) => {
                    const isActive = selectedAssignment?._id === a._id;
                    return (
                      <li key={a._id}>
                        <button
                          type="button"
                          onClick={() => setSelectedAssignment(isActive ? null : a)}
                          className={[
                            "flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-colors",
                            isActive ? "bg-primary/5" : "hover:bg-whiter dark:hover:bg-meta-4",
                          ].join(" ")}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-black dark:text-white">
                              {a.title}
                            </p>
                            <p className="mt-0.5 text-xs text-body">
                              {subjectName(a.subject)}
                            </p>
                            {a.description && (
                              <p className="mt-0.5 truncate text-xs text-body">
                                {a.description}
                              </p>
                            )}
                          </div>
                          {a.dueDate ? (
                            <Badge variant={isPastDue(a.dueDate) ? "danger" : "default"}>
                              <FileText className="mr-1 h-3 w-3 shrink-0" aria-hidden="true" />
                              {formatDate(a.dueDate)}
                            </Badge>
                          ) : (
                            <span className="shrink-0 text-xs text-body">No due date</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submissions panel */}
        {selectedAssignment && (
          <div className="xl:col-span-3">
            <SubmissionPanel
              assignment={selectedAssignment}
              onClose={() => setSelectedAssignment(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
