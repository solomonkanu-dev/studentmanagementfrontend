"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { errMsg } from "@/lib/utils/errMsg";
import { subjectApi } from "@/lib/api/subject";
import { assignmentApi, submissionApi } from "@/lib/api/assignment";
import { classApi } from "@/lib/api/class";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  BookOpen,
  Users,
  FileText,
  Paperclip,
  Download,
  ExternalLink,
  ChevronRight,
  X,
} from "lucide-react";
import type { Subject, Assignment, Submission, AuthUser, Class } from "@/lib/types";
import { formatDate, isPastDue, fileNameFromUrl } from "@/lib/utils/assignmentUtils";

// ─── Schema ───────────────────────────────────────────────────────────────────

const assignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
});
type AssignmentFormValues = z.infer<typeof assignmentSchema>;

// ─── Grading Drawer ───────────────────────────────────────────────────────────

interface GradingDrawerProps {
  student: AuthUser;
  submission: Submission | null;
  assignment: Assignment;
  onClose: () => void;
}

function GradingDrawer({ student, submission, assignment, onClose }: GradingDrawerProps) {
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
      queryClient.invalidateQueries({ queryKey: ["submissions", assignment._id] });
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Assignment info strip */}
          <div className="rounded-lg border border-stroke bg-whiter px-4 py-3 dark:border-strokedark dark:bg-meta-4">
            <p className="text-xs font-semibold text-black dark:text-white">{assignment.title}</p>
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

          {/* No submission */}
          {!submission ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-stroke py-10 text-center dark:border-strokedark">
              <FileText className="h-8 w-8 text-body" />
              <p className="text-sm text-body">Student has not submitted yet.</p>
            </div>
          ) : (
            <>
              {/* Submission meta */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={submission.status === "graded" ? "info" : "default"}>
                  {submission.status === "graded" ? "Graded" : "Pending review"}
                </Badge>
                {submission.isLate && <Badge variant="danger">Late submission</Badge>}
                <span className="text-xs text-body">
                  Submitted {formatDate(submission.createdAt)}
                </span>
              </div>

              {/* Text answer */}
              {submission.content && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-body">
                    Written Answer
                  </p>
                  <div className="rounded-lg border border-stroke bg-whiter p-4 text-sm leading-relaxed text-black dark:border-strokedark dark:bg-meta-4 dark:text-white whitespace-pre-wrap">
                    {submission.content}
                  </div>
                </div>
              )}

              {/* Attached file */}
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

              {/* Grading section */}
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
  classStudents,
  onClose,
}: {
  assignment: Assignment;
  classStudents: AuthUser[];
  onClose: () => void;
}) {
  const [drawerStudent, setDrawerStudent] = useState<AuthUser | null>(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["submissions", assignment._id],
    queryFn: () => submissionApi.getByAssignment(assignment._id),
  });

  const submissionMap = new Map<string, Submission>(
    (submissions as Submission[]).map((s) => {
      const studentId =
        typeof s.student === "string" ? s.student : (s.student as AuthUser)._id;
      return [studentId, s];
    })
  );

  const drawerSubmission = drawerStudent ? (submissionMap.get(drawerStudent._id) ?? null) : null;

  const submitted = (submissions as Submission[]).length;
  const graded = (submissions as Submission[]).filter(
    (s) => s.status === "graded"
  ).length;

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
                Due: {formatDate(assignment.dueDate)} ·{" "}
                <span className="font-medium text-black dark:text-white">{submitted}</span> submitted ·{" "}
                <span className="font-medium text-meta-3">{graded}</span> graded
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
              aria-label="Close submissions"
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
          ) : classStudents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center px-5">
              <Users className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm text-body">No students in this class.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stroke dark:divide-strokedark">
              {classStudents.map((student) => {
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
                      {/* Avatar */}
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
                              <Paperclip className="h-3.5 w-3.5 text-body" aria-label="Has file" />
                            )}
                            <Badge variant={isGraded ? "info" : "success"}>
                              {isGraded ? `${sub?.score ?? "—"}/${assignment.totalMarks ?? 100}` : "Submitted"}
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

      {/* Grading drawer */}
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

// ─── Create assignment modal ──────────────────────────────────────────────────

function CreateAssignmentModal({
  subjectId,
  onClose,
  onSuccess,
}: {
  subjectId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AssignmentFormValues>({ resolver: zodResolver(assignmentSchema) });

  const createMutation = useMutation({
    mutationFn: assignmentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments", subjectId] });
      reset();
      onSuccess();
    },
    onError: (err: unknown) => {
      setServerError(errMsg(err, "Failed to create assignment."));
    },
  });

  const onSubmit = (values: AssignmentFormValues) => {
    setServerError("");
    createMutation.mutate({
      title: values.title,
      description: values.description,
      dueDate: values.dueDate,
      subject: subjectId,
      subjectId,
    });
  };

  return (
    <Modal open onClose={onClose} title="Create Assignment">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Title *"
          placeholder="Enter assignment title"
          error={errors.title?.message}
          {...register("title")}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">Description</label>
          <textarea
            rows={3}
            placeholder="Assignment instructions..."
            className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            {...register("description")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">Due Date *</label>
          <input
            type="date"
            className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            {...register("dueDate")}
          />
          {errors.dueDate && (
            <p className="text-xs text-meta-1">{errors.dueDate.message}</p>
          )}
        </div>

        {serverError && (
          <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{serverError}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── Assignment list for a subject ────────────────────────────────────────────

function SubjectAssignments({
  subject,
  classStudents,
}: {
  subject: Subject;
  classStudents: AuthUser[];
}) {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments", subject._id],
    queryFn: () => assignmentApi.getBySubject(subject._id),
  });

  const submissionCountQueries = useQueries({
    queries: (assignments as Assignment[]).map((a) => ({
      queryKey: ["submission-count", a._id],
      queryFn: () =>
        submissionApi.getByAssignment(a._id).then((subs) => ({
          id: a._id,
          count: (subs as Submission[]).length,
        })),
    })),
  });

  const submissionCounts: Record<string, number> = {};
  for (const q of submissionCountQueries) {
    if (q.data) submissionCounts[q.data.id] = q.data.count;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className={selectedAssignment ? "xl:col-span-2" : "xl:col-span-5"}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  {subject.name}
                </h3>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  New Assignment
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
                </div>
              ) : (assignments as Assignment[]).length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center px-5">
                  <ClipboardList className="h-7 w-7 text-body" aria-hidden="true" />
                  <p className="text-sm text-body">No assignments yet.</p>
                  <Button size="sm" className="mt-1" onClick={() => setShowCreate(true)}>
                    Create First Assignment
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-stroke dark:divide-strokedark">
                  {(assignments as Assignment[]).map((a) => {
                    const isActive = selectedAssignment?._id === a._id;
                    const subCount = submissionCounts[a._id] ?? null;
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
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-black dark:text-white">
                                {a.title}
                              </p>
                              {subCount !== null && (
                                <Badge variant="info">
                                  {subCount} submission{subCount !== 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
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

        {selectedAssignment && (
          <div className="xl:col-span-3">
            <SubmissionPanel
              assignment={selectedAssignment}
              classStudents={classStudents}
              onClose={() => setSelectedAssignment(null)}
            />
          </div>
        )}
      </div>

      {showCreate && (
        <CreateAssignmentModal
          subjectId={subject._id}
          onClose={() => setShowCreate(false)}
          onSuccess={() => setShowCreate(false)}
        />
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LecturerAssignmentsPage() {
  const [activeClassId, setActiveClassId] = useState<string | null>(null);

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["lecturer-subjects"],
    queryFn: subjectApi.getForLecturer,
  });

  // Derive unique classes from the subjects (each subject has class populated)
  const classMap = new Map<string, Class>();
  for (const s of subjects as Subject[]) {
    if (s.class && typeof s.class === "object") {
      classMap.set((s.class as Class)._id, s.class as Class);
    }
  }
  const classes = Array.from(classMap.values());

  // Auto-select first class
  const selectedClassId = activeClassId ?? (classes.length > 0 ? classes[0]._id : null);

  // Subjects that belong to the active class
  const classSubjects = (subjects as Subject[]).filter((s) => {
    const cid = typeof s.class === "object" ? (s.class as Class)._id : s.class;
    return cid === selectedClassId;
  });

  // Fetch students for the active class
  const { data: classStudents = [] } = useQuery({
    queryKey: ["class-students", selectedClassId],
    queryFn: () => classApi.getStudents(selectedClassId!),
    enabled: !!selectedClassId,
  });

  if (subjectsLoading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-lg bg-stroke dark:bg-strokedark" />
        ))}
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <BookOpen className="h-10 w-10 text-body" aria-hidden="true" />
        <p className="text-sm font-medium text-black dark:text-white">No classes assigned</p>
        <p className="text-xs text-body">You have no subjects or classes yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Class tabs ── */}
      <div className="border-b border-stroke dark:border-strokedark">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Class tabs">
          {classes.map((cls) => {
            const isActive = cls._id === selectedClassId;
            const subjectCount = (subjects as Subject[]).filter((s) => {
              const cid = typeof s.class === "object" ? (s.class as Class)._id : s.class;
              return cid === cls._id;
            }).length;
            return (
              <button
                key={cls._id}
                onClick={() => setActiveClassId(cls._id)}
                className={[
                  "flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-body hover:border-stroke hover:text-black dark:hover:text-white",
                ].join(" ")}
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                {cls.name}
                <span
                  className={[
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-stroke text-body dark:bg-strokedark",
                  ].join(" ")}
                >
                  {subjectCount}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Subjects & assignments for selected class ── */}
      {selectedClassId && classSubjects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <BookOpen className="h-8 w-8 text-body" aria-hidden="true" />
          <p className="text-sm text-body">No subjects in this class yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {classSubjects.map((subject) => (
            <SubjectAssignments
              key={subject._id}
              subject={subject}
              classStudents={classStudents as AuthUser[]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
