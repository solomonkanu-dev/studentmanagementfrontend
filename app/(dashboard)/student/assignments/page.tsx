"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import type { Subject, Assignment, Submission } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";
import { formatDate, isPastDue, fileNameFromUrl } from "@/lib/utils/assignmentUtils";

// ─── Submit / Resubmit Modal ──────────────────────────────────────────────────

function SubmitModal({
  assignment,
  existing,
  onClose,
  onSuccess,
}: {
  assignment: Assignment;
  existing?: Submission | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState(existing?.content ?? "");
  const [fileUrl, setFileUrl] = useState(existing?.fileUrl ?? "");
  const [fileName, setFileName] = useState<string>(
    existing?.fileUrl ? fileNameFromUrl(existing.fileUrl) : ""
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [serverError, setServerError] = useState("");
  const [formError, setFormError] = useState("");

  const isResubmit = !!existing;

  const mutation = useMutation({
    mutationFn: (payload: { content?: string; fileUrl?: string }) =>
      isResubmit
        ? submissionApi.resubmit(existing!._id, payload)
        : submissionApi.submit({ assignmentId: assignment._id, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      onSuccess();
    },
    onError: (err: unknown) => setServerError(errMsg(err, "Submission failed.")),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const { fileUrl: url } = await uploadApi.assignmentFile(file);
      setFileUrl(url);
      setFileName(file.name);
    } catch (err) {
      setUploadError(errMsg(err, "File upload failed."));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = () => {
    setFormError("");
    setServerError("");
    if (!content.trim() && !fileUrl) {
      setFormError("Please write an answer or attach a file.");
      return;
    }
    mutation.mutate({
      content: content.trim() || undefined,
      fileUrl: fileUrl || undefined,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isResubmit ? `Resubmit: ${assignment.title}` : `Submit: ${assignment.title}`}
    >
      <div className="space-y-4">
        {/* Assignment info */}
        <div className="rounded-lg border border-stroke bg-whiter px-4 py-3 dark:border-strokedark dark:bg-meta-4">
          {assignment.description && (
            <p className="mb-2 text-xs text-body">{assignment.description}</p>
          )}
          {assignment.dueDate && (
            <p className="text-xs text-body">
              Due:{" "}
              <span className={isPastDue(assignment.dueDate) ? "font-medium text-meta-1" : ""}>
                {formatDate(assignment.dueDate)}
              </span>
            </p>
          )}
          {assignment.totalMarks && (
            <p className="mt-0.5 text-xs text-body">Total marks: {assignment.totalMarks}</p>
          )}
        </div>

        {/* Text answer */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
            Written Answer <span className="text-body font-normal">(optional if file attached)</span>
          </label>
          <textarea
            rows={5}
            placeholder="Write your answer here…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          />
        </div>

        {/* File upload */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
            Attach File <span className="text-body font-normal">(PDF, DOC, DOCX, image — optional)</span>
          </label>

          {fileUrl ? (
            <div className="flex items-center gap-2 rounded border border-meta-3/40 bg-meta-3/5 px-3 py-2">
              <Paperclip className="h-4 w-4 shrink-0 text-meta-3" />
              <span className="min-w-0 flex-1 truncate text-sm text-black dark:text-white">
                {fileName}
              </span>
              <button
                onClick={() => { setFileUrl(""); setFileName(""); }}
                className="shrink-0 text-body hover:text-meta-1 transition-colors"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-stroke py-3 text-sm text-body hover:border-primary hover:text-primary transition-colors disabled:opacity-50 dark:border-strokedark dark:hover:border-primary"
            >
              {uploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-stroke border-t-primary" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Choose file to upload
                </>
              )}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {uploadError && (
            <p className="mt-1 text-xs text-meta-1">{uploadError}</p>
          )}
        </div>

        {formError && (
          <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>
        )}
        {serverError && (
          <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{serverError}</p>
        )}

        {isResubmit && (
          <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:bg-yellow-400/10 dark:text-yellow-400">
            Resubmitting will replace your previous answer and reset your grade.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={mutation.isPending || uploading}>
            {isResubmit ? (
              <>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
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
      </div>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentAssignmentsPage() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [submitTarget, setSubmitTarget] = useState<{
    assignment: Assignment;
    existing?: Submission | null;
  } | null>(null);

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["student-subjects"],
    queryFn: subjectApi.getForStudent,
  });

  const activeSubjectId =
    selectedSubjectId ??
    ((subjects as Subject[]).length > 0 ? (subjects as Subject[])[0]._id : null);

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["assignments", activeSubjectId],
    queryFn: () => assignmentApi.getBySubject(activeSubjectId!),
    enabled: !!activeSubjectId,
  });

  const { data: mySubmissions = [] } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: submissionApi.getMine,
  });

  const submissionByAssignment = new Map<string, Submission>(
    (mySubmissions as Submission[]).map((s) => {
      const aid =
        typeof s.assignment === "string" ? s.assignment : (s.assignment as Assignment)._id;
      return [aid, s];
    })
  );

  return (
    <div className="space-y-6">
      {/* Subject tabs */}
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
                  const mySub = submissionByAssignment.get(a._id);
                  const submitted = !!mySub;
                  const overdue = isPastDue(a.dueDate);
                  const graded =
                    mySub?.score !== undefined && mySub.score !== null;
                  const canResubmit = submitted && !overdue;

                  return (
                    <li key={a._id} className="px-5 py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-meta-2 dark:bg-meta-4">
                          <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-black dark:text-white">
                              {a.title}
                            </p>
                            {submitted ? (
                              <Badge variant="success">
                                <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                                Submitted
                                {mySub?.isLate && (
                                  <span className="ml-1 opacity-70">(late)</span>
                                )}
                              </Badge>
                            ) : (
                              <Badge variant={overdue ? "danger" : "default"}>
                                {overdue ? "Overdue" : "Pending"}
                              </Badge>
                            )}
                            {graded && (
                              <Badge variant="info">
                                Score: {mySub?.score}
                                {a.totalMarks ? `/${a.totalMarks}` : ""}
                              </Badge>
                            )}
                          </div>

                          {a.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-body">
                              {a.description}
                            </p>
                          )}

                          {a.dueDate && (
                            <p
                              className={`mt-1 text-xs ${overdue && !submitted ? "text-meta-1" : "text-body"}`}
                            >
                              Due: {formatDate(a.dueDate)}
                            </p>
                          )}

                          {/* Submitted content preview */}
                          {submitted && (mySub?.content || mySub?.fileUrl) && (
                            <div className="mt-2 space-y-1">
                              {mySub?.content && (
                                <p className="line-clamp-2 text-xs text-body">
                                  <span className="font-medium text-black dark:text-white">
                                    Your answer:{" "}
                                  </span>
                                  {mySub.content}
                                </p>
                              )}
                              {mySub?.fileUrl && (
                                <a
                                  href={mySub.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  {fileNameFromUrl(mySub.fileUrl)}
                                  <ExternalLink className="h-3 w-3 opacity-60" />
                                </a>
                              )}
                            </div>
                          )}

                          {mySub?.feedback && (
                            <p className="mt-1.5 rounded bg-meta-3/5 px-2 py-1 text-xs text-body">
                              <span className="font-medium text-black dark:text-white">
                                Feedback:{" "}
                              </span>
                              {mySub.feedback}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex shrink-0 flex-col gap-2">
                          {!submitted && !overdue && (
                            <Button
                              size="sm"
                              onClick={() =>
                                setSubmitTarget({ assignment: a, existing: null })
                              }
                            >
                              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                              Submit
                            </Button>
                          )}
                          {canResubmit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setSubmitTarget({ assignment: a, existing: mySub })
                              }
                            >
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
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
          existing={submitTarget.existing}
          onClose={() => setSubmitTarget(null)}
          onSuccess={() => setSubmitTarget(null)}
        />
      )}
    </div>
  );
}
