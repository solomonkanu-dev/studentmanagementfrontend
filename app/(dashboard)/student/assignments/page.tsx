"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { subjectApi } from "@/lib/api/subject";
import { assignmentApi, submissionApi } from "@/lib/api/assignment";
import { uploadApi } from "@/lib/api/upload";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  BookOpen,
  ClipboardList,
  CheckCircle2,
  Upload,
  FileText,
  Paperclip,
  X,
  Download,
  RefreshCw,
} from "lucide-react";
import type { Subject, Assignment, Submission } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";

// ─── Schema ───────────────────────────────────────────────────────────────────

const submitSchema = z.object({
  content: z.string().optional(),
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

function fileName(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1]) || "file";
  } catch {
    return "file";
  }
}

// ─── File picker row ──────────────────────────────────────────────────────────

function FilePicker({
  file,
  onChange,
  onClear,
}: {
  file: File | null;
  onChange: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.zip"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          e.target.value = "";
        }}
      />
      {file ? (
        <div className="flex flex-1 items-center gap-2 rounded border border-stroke bg-meta-2 px-3 py-1.5 dark:border-strokedark dark:bg-meta-4">
          <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-xs text-black dark:text-white">{file.name}</span>
          <span className="shrink-0 text-xs text-body">
            {(file.size / 1024).toFixed(0)} KB
          </span>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-body hover:text-meta-1"
            aria-label="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded border border-dashed border-stroke px-3 py-1.5 text-xs text-body transition-colors hover:border-primary hover:text-primary dark:border-strokedark dark:hover:border-primary"
        >
          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
          Attach file
        </button>
      )}
    </div>
  );
}

// ─── Submit modal ─────────────────────────────────────────────────────────────

function SubmitModal({
  assignment,
  existingSubmission,
  onClose,
  onSuccess,
}: {
  assignment: Assignment;
  existingSubmission?: Submission;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const isResubmit = !!existingSubmission;

  const { register, handleSubmit, formState: { errors }, watch } = useForm<SubmitFormValues>({
    resolver: zodResolver(submitSchema),
    defaultValues: { content: existingSubmission?.content ?? "" },
  });

  const content = watch("content");

  const submitMutation = useMutation({
    mutationFn: submissionApi.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      onSuccess();
    },
    onError: (err: unknown) => setServerError(errMsg(err, "Submission failed.")),
  });

  const resubmitMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { content?: string; fileUrl?: string } }) =>
      submissionApi.resubmit(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      onSuccess();
    },
    onError: (err: unknown) => setServerError(errMsg(err, "Resubmission failed.")),
  });

  const isPending = submitMutation.isPending || resubmitMutation.isPending || uploading;

  const onSubmit = async (values: SubmitFormValues) => {
    if (!values.content?.trim() && !file) {
      setServerError("Please write an answer or attach a file.");
      return;
    }
    setServerError("");

    let fileUrl: string | undefined;
    if (file) {
      setUploading(true);
      try {
        const res = await uploadApi.assignmentFile(file);
        fileUrl = res.fileUrl;
      } catch (err) {
        setServerError(errMsg(err, "File upload failed."));
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const payload = {
      content: values.content?.trim() || undefined,
      fileUrl,
    };

    if (isResubmit) {
      resubmitMutation.mutate({ id: existingSubmission!._id, payload });
    } else {
      submitMutation.mutate({ assignmentId: assignment._id, ...payload });
    }
  };

  return (
    <Modal open onClose={onClose} title={isResubmit ? `Resubmit: ${assignment.title}` : `Submit: ${assignment.title}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          {assignment.description && (
            <p className="mb-2 text-xs text-body">{assignment.description}</p>
          )}
          {assignment.dueDate && (
            <p className="mb-3 text-xs text-body">
              Due:{" "}
              <span className={isPastDue(assignment.dueDate) ? "font-medium text-meta-1" : ""}>
                {formatDate(assignment.dueDate)}
              </span>
            </p>
          )}
        </div>

        {/* Existing submission preview */}
        {isResubmit && existingSubmission?.fileUrl && (
          <div className="rounded border border-stroke bg-meta-2 p-3 dark:border-strokedark dark:bg-meta-4">
            <p className="mb-1.5 text-xs font-medium text-body">Previously submitted file:</p>
            <a
              href={existingSubmission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              {fileName(existingSubmission.fileUrl)}
            </a>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">
            Your Answer <span className="text-body font-normal">(optional if attaching a file)</span>
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

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">
            Attach File <span className="text-body font-normal">(PDF, Word, image, ZIP)</span>
          </label>
          <FilePicker file={file} onChange={setFile} onClear={() => setFile(null)} />
        </div>

        {serverError && (
          <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{serverError}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isPending}>
            {uploading ? (
              "Uploading…"
            ) : isResubmit ? (
              <>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Resubmit
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Submit
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentAssignmentsPage() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [submitTarget, setSubmitTarget] = useState<{ assignment: Assignment; submission?: Submission } | null>(null);

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
                  const mySub = getMySubmission(a._id);
                  const submitted = submittedIds.has(a._id);
                  const graded = mySub?.score !== undefined && mySub.score !== null;
                  const overdue = isPastDue(a.dueDate);

                  return (
                    <li key={a._id} className="px-5 py-4">
                      <div className="flex items-start gap-4">
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
                              <Badge variant="info">Score: {mySub?.score}</Badge>
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

                          {/* Submitted content / file preview */}
                          {mySub && (
                            <div className="mt-2 space-y-1.5">
                              {mySub.content && (
                                <p className="rounded bg-meta-2 px-3 py-2 text-xs text-black dark:bg-meta-4 dark:text-white line-clamp-3">
                                  {mySub.content}
                                </p>
                              )}
                              {mySub.fileUrl && (
                                <a
                                  href={mySub.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" />
                                  {fileName(mySub.fileUrl)}
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 flex flex-col gap-1.5 items-end">
                          {!submitted && !overdue && (
                            <Button size="sm" onClick={() => setSubmitTarget({ assignment: a })}>
                              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                              Submit
                            </Button>
                          )}
                          {submitted && !graded && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSubmitTarget({ assignment: a, submission: mySub })}
                            >
                              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                              Resubmit
                            </Button>
                          )}
                        </div>
                      </div>
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
          assignment={submitTarget.assignment}
          existingSubmission={submitTarget.submission}
          onClose={() => setSubmitTarget(null)}
          onSuccess={() => setSubmitTarget(null)}
        />
      )}
    </div>
  );
}
