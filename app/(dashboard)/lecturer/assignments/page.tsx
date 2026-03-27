"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
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
} from "lucide-react";
import type { Subject, Assignment, Submission, AuthUser, Class } from "@/lib/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const assignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isPastDue(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ─── Submission panel ─────────────────────────────────────────────────────────

interface SubmissionPanelProps {
  assignment: Assignment;
  classStudents: AuthUser[];
  onClose: () => void;
}

function SubmissionPanel({
  assignment,
  classStudents,
  onClose,
}: SubmissionPanelProps) {
  const queryClient = useQueryClient();
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [gradeErrors, setGradeErrors] = useState<Record<string, string>>({});
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["submissions", assignment._id],
    queryFn: () => submissionApi.getByAssignment(assignment._id),
  });

  const gradeMutation = useMutation({
    mutationFn: ({
      submissionId,
      grade,
      feedback,
    }: {
      submissionId: string;
      grade: number;
      feedback?: string;
    }) => submissionApi.grade(submissionId, { grade, feedback }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["submissions", assignment._id] });
      setSuccessIds((prev) => new Set([...prev, vars.submissionId]));
    },
  });

  const submissionMap = new Map<string, Submission>(
    (submissions as Submission[]).map((s) => {
      const studentId =
        typeof s.student === "string" ? s.student : (s.student as AuthUser)._id;
      return [studentId, s];
    })
  );

  const handleGrade = (submissionId: string) => {
    const raw = grades[submissionId];
    const num = Number(raw);
    if (!raw || isNaN(num) || num < 0 || num > 100) {
      setGradeErrors((prev) => ({
        ...prev,
        [submissionId]: "Grade must be 0–100",
      }));
      return;
    }
    setGradeErrors((prev) => {
      const next = { ...prev };
      delete next[submissionId];
      return next;
    });
    gradeMutation.mutate({
      submissionId,
      grade: num,
      feedback: feedbacks[submissionId],
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              {assignment.title}
            </h2>
            <p className="text-xs text-body">
              Due: {formatDate(assignment.dueDate)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
            aria-label="Close submissions"
          >
            <span className="text-lg leading-none">×</span>
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
              const gradeInputId = sub?._id ?? `no-sub-${student._id}`;
              const isGraded = sub?.grade !== undefined && sub.grade !== null;
              const isSuccess = sub ? successIds.has(sub._id) : false;

              return (
                <li key={student._id} className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                      {student.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-black dark:text-white">
                        {student.fullName}
                      </p>
                      <p className="truncate text-xs text-body">
                        {student.email}
                      </p>
                    </div>
                    <Badge variant={hasSubmitted ? "success" : "danger"}>
                      {hasSubmitted ? "Submitted" : "Not Submitted"}
                    </Badge>
                    {isGraded && (
                      <Badge variant="info">Grade: {sub.grade}</Badge>
                    )}
                  </div>

                  {hasSubmitted && (
                    <div className="ml-12 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1 max-w-[120px]">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="Grade (0–100)"
                            value={grades[gradeInputId] ?? ""}
                            onChange={(e) =>
                              setGrades((prev) => ({
                                ...prev,
                                [gradeInputId]: e.target.value,
                              }))
                            }
                            error={gradeErrors[gradeInputId]}
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Feedback (optional)"
                            value={feedbacks[gradeInputId] ?? ""}
                            onChange={(e) =>
                              setFeedbacks((prev) => ({
                                ...prev,
                                [gradeInputId]: e.target.value,
                              }))
                            }
                            className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleGrade(gradeInputId)}
                          isLoading={
                            gradeMutation.isPending &&
                            gradeMutation.variables?.submissionId === gradeInputId
                          }
                        >
                          Grade
                        </Button>
                      </div>
                      {isSuccess && (
                        <p className="flex items-center gap-1 text-xs text-meta-3">
                          <CheckCircle2
                            className="h-3 w-3 shrink-0"
                            aria-hidden="true"
                          />
                          Graded successfully.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Create assignment modal ──────────────────────────────────────────────────

interface CreateAssignmentModalProps {
  subjectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateAssignmentModal({
  subjectId,
  onClose,
  onSuccess,
}: CreateAssignmentModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
  });

  const createMutation = useMutation({
    mutationFn: assignmentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments", subjectId] });
      reset();
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create assignment.";
      setServerError(msg);
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
          <label className="text-sm font-medium text-black dark:text-white">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Assignment instructions..."
            className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            {...register("description")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">
            Due Date *
          </label>
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
          <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
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

export default function LecturerAssignmentsPage() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["lecturer-subjects"],
    queryFn: subjectApi.getForLecturer,
  });

  // Auto-select first subject
  const activeSubjectId =
    selectedSubjectId ??
    ((subjects as Subject[]).length > 0
      ? (subjects as Subject[])[0]._id
      : null);

  const activeSubject = (subjects as Subject[]).find(
    (s) => s._id === activeSubjectId
  );

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["assignments", activeSubjectId],
    queryFn: () => assignmentApi.getBySubject(activeSubjectId!),
    enabled: !!activeSubjectId,
  });

  // Find the class for the active subject to get its students
  const classId = activeSubject
    ? typeof activeSubject.class === "string"
      ? activeSubject.class
      : (activeSubject.class as Class)._id
    : null;

  const { data: classStudents = [] } = useQuery({
    queryKey: ["class-students", classId],
    queryFn: () => classApi.getStudents(classId!),
    enabled: !!classId,
  });

  const submissionCounts = useQuery({
    queryKey: ["submission-counts", activeSubjectId],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const a of assignments as Assignment[]) {
        try {
          const subs = await submissionApi.getByAssignment(a._id);
          counts[a._id] = (subs as Submission[]).length;
        } catch {
          counts[a._id] = 0;
        }
      }
      return counts;
    },
    enabled: (assignments as Assignment[]).length > 0,
  });

  return (
    <div className="space-y-6">
      {/* Subject pills */}
      {subjectsLoading ? (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-24 animate-pulse rounded-full bg-stroke dark:bg-strokedark"
            />
          ))}
        </div>
      ) : (subjects as Subject[]).length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <BookOpen className="h-10 w-10 text-body" aria-hidden="true" />
          <p className="text-sm font-medium text-black dark:text-white">
            No subjects assigned
          </p>
          <p className="text-xs text-body">
            You have no subjects yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(subjects as Subject[]).map((s) => (
            <button
              key={s._id}
              onClick={() => {
                setSelectedSubjectId(s._id);
                setSelectedAssignment(null);
              }}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                s._id === activeSubjectId
                  ? "bg-primary text-white"
                  : "border border-stroke text-body hover:border-primary hover:text-primary dark:border-strokedark dark:hover:border-primary",
              ].join(" ")}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {activeSubjectId && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          {/* Assignment list */}
          <div className={selectedAssignment ? "xl:col-span-2" : "xl:col-span-5"}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-black dark:text-white">
                    {activeSubject?.name} — Assignments
                  </h2>
                  <Button
                    size="sm"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    New Assignment
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {assignmentsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
                  </div>
                ) : (assignments as Assignment[]).length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center px-5">
                    <ClipboardList
                      className="h-8 w-8 text-body"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-body">
                      No assignments for this subject.
                    </p>
                    <Button
                      size="sm"
                      className="mt-1"
                      onClick={() => setShowCreate(true)}
                    >
                      Create First Assignment
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-stroke dark:divide-strokedark">
                    {(assignments as Assignment[]).map((a) => {
                      const isActive = selectedAssignment?._id === a._id;
                      const subCount =
                        submissionCounts.data?.[a._id] ?? null;
                      return (
                        <li key={a._id}>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedAssignment(isActive ? null : a)
                            }
                            className={[
                              "flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-colors",
                              isActive
                                ? "bg-primary/5"
                                : "hover:bg-whiter dark:hover:bg-meta-4",
                            ].join(" ")}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-black dark:text-white">
                                  {a.title}
                                </p>
                                {subCount !== null && (
                                  <Badge variant="info">
                                    {subCount} submission
                                    {subCount !== 1 ? "s" : ""}
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
                              <Badge
                                variant={isPastDue(a.dueDate) ? "danger" : "default"}
                              >
                                <FileText
                                  className="mr-1 h-3 w-3 shrink-0"
                                  aria-hidden="true"
                                />
                                {formatDate(a.dueDate)}
                              </Badge>
                            ) : (
                              <span className="shrink-0 text-xs text-body">
                                No due date
                              </span>
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
                classStudents={classStudents as AuthUser[]}
                onClose={() => setSelectedAssignment(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Create assignment modal */}
      {showCreate && activeSubjectId && (
        <CreateAssignmentModal
          subjectId={activeSubjectId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
