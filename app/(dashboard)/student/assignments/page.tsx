"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { subjectApi } from "@/lib/api/subject";
import { assignmentApi, submissionApi } from "@/lib/api/assignment";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { BookOpen, ClipboardList, CheckCircle2, Upload, FileText } from "lucide-react";
import type { Subject, Assignment, Submission } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";

// ─── Schema ───────────────────────────────────────────────────────────────────

const submitSchema = z.object({
  content: z.string().min(1, "Answer is required"),
});
type SubmitFormValues = z.infer<typeof submitSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isPastDue(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ─── Submit modal ─────────────────────────────────────────────────────────────

function SubmitModal({
  assignment,
  onClose,
  onSuccess,
}: {
  assignment: Assignment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SubmitFormValues>({
    resolver: zodResolver(submitSchema),
  });

  const mutation = useMutation({
    mutationFn: submissionApi.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      reset();
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = errMsg(err, "Submission failed.");
      setServerError(msg);
    },
  });

  const onSubmit = (values: SubmitFormValues) => {
    setServerError("");
    mutation.mutate({ assignmentId: assignment._id, content: values.content });
  };

  return (
    <Modal open onClose={onClose} title={`Submit: ${assignment.title}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <p className="mb-3 text-xs text-body">
            {assignment.description}
          </p>
          {assignment.dueDate && (
            <p className="mb-3 text-xs text-body">
              Due: <span className={isPastDue(assignment.dueDate) ? "text-meta-1 font-medium" : ""}>{formatDate(assignment.dueDate)}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">
            Your Answer *
          </label>
          <textarea
            rows={5}
            placeholder="Write your answer here..."
            className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            {...register("content")}
          />
          {errors.content && (
            <p className="text-xs text-meta-1">{errors.content.message}</p>
          )}
        </div>

        {serverError && (
          <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{serverError}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Submit
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentAssignmentsPage() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null);

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["student-subjects"],
    queryFn: subjectApi.getForStudent,
  });

  const activeSubjectId =
    selectedSubjectId ?? ((subjects as Subject[]).length > 0 ? (subjects as Subject[])[0]._id : null);

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["assignments", activeSubjectId],
    queryFn: () => assignmentApi.getBySubject(activeSubjectId!),
    enabled: !!activeSubjectId,
  });

  const { data: mySubmissions = [] } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: submissionApi.getMine,
  });

  const submittedIds = new Set(
    (mySubmissions as Submission[]).map((s) =>
      typeof s.assignment === "string" ? s.assignment : (s.assignment as Assignment)._id
    )
  );

  const getMySubmission = (assignmentId: string) =>
    (mySubmissions as Submission[]).find((s) => {
      const aid = typeof s.assignment === "string" ? s.assignment : (s.assignment as Assignment)._id;
      return aid === assignmentId;
    });

  return (
    <div className="space-y-6">
      {/* Subject tabs */}
      {subjectsLoading ? (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-stroke dark:bg-strokedark" />
          ))}
        </div>
      ) : (subjects as Subject[]).length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <BookOpen className="h-10 w-10 text-body" aria-hidden="true" />
          <p className="text-sm font-medium text-black dark:text-white">No subjects enrolled</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(subjects as Subject[]).map((s) => (
            <button
              key={s._id}
              onClick={() => setSelectedSubjectId(s._id)}
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
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              {(subjects as Subject[]).find((s) => s._id === activeSubjectId)?.name} — Assignments
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            {assignmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            ) : (assignments as Assignment[]).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center px-5">
                <ClipboardList className="h-8 w-8 text-body" aria-hidden="true" />
                <p className="text-sm text-body">No assignments for this subject.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {(assignments as Assignment[]).map((a) => {
                  const submitted = submittedIds.has(a._id);
                  const mySub = getMySubmission(a._id);
                  const graded = mySub?.grade !== undefined && mySub.grade !== null;
                  const overdue = isPastDue(a.dueDate);

                  return (
                    <li key={a._id} className="flex items-start gap-4 px-5 py-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-meta-2 dark:bg-meta-4">
                        <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-black dark:text-white">{a.title}</p>
                          {submitted ? (
                            <Badge variant="success">
                              <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                              Submitted
                            </Badge>
                          ) : (
                            <Badge variant={overdue ? "danger" : "default"}>
                              {overdue ? "Overdue" : "Pending"}
                            </Badge>
                          )}
                          {graded && (
                            <Badge variant="info">Grade: {mySub?.grade}</Badge>
                          )}
                        </div>
                        {a.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-body">{a.description}</p>
                        )}
                        {a.dueDate && (
                          <p className={`mt-1 text-xs ${overdue && !submitted ? "text-meta-1" : "text-body"}`}>
                            Due: {formatDate(a.dueDate)}
                          </p>
                        )}
                        {mySub?.feedback && (
                          <p className="mt-1 text-xs text-body">
                            Feedback: <span className="text-black dark:text-white">{mySub.feedback}</span>
                          </p>
                        )}
                      </div>
                      {!submitted && !overdue && (
                        <Button size="sm" onClick={() => setSubmitTarget(a)}>
                          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                          Submit
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {submitTarget && (
        <SubmitModal
          assignment={submitTarget}
          onClose={() => setSubmitTarget(null)}
          onSuccess={() => setSubmitTarget(null)}
        />
      )}
    </div>
  );
}
