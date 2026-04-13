"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { assignmentApi, submissionApi } from "@/lib/api/assignment";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  ClipboardList,
  Clock,
  Users,
  CheckCircle2,
  ChevronLeft,
  FileDown,
  School,
} from "lucide-react";
import type { Assignment, Submission, AuthUser, Class } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isPastDue(iso?: string) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ─── Submission detail view ───────────────────────────────────────────────────

function SubmissionDetail({
  assignment,
  classStudents,
  onBack,
}: {
  assignment: Assignment;
  classStudents: AuthUser[];
  onBack: () => void;
}) {
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["submissions", assignment._id],
    queryFn: () => submissionApi.getByAssignment(assignment._id),
  });

  const submissionMap = new Map<string, Submission>(
    (submissions as Submission[]).map((s) => {
      const sid = typeof s.student === "string" ? s.student : (s.student as AuthUser)._id;
      return [sid, s];
    })
  );

  const submitted = classStudents.filter((s) => submissionMap.has(s._id));
  const notSubmitted = classStudents.filter((s) => !submissionMap.has(s._id));

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-body hover:text-primary transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to assignments
      </button>

      <div>
        <h3 className="text-sm font-semibold text-black dark:text-white">{assignment.title}</h3>
        {assignment.description && (
          <p className="mt-0.5 text-xs text-body">{assignment.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {assignment.dueDate && (
            <span className={`text-xs ${isPastDue(assignment.dueDate) ? "text-meta-1 font-medium" : "text-body"}`}>
              Due: {formatDate(assignment.dueDate)}
            </span>
          )}
          <Badge variant="success">{submitted.length} submitted</Badge>
          {notSubmitted.length > 0 && (
            <Badge variant="danger">{notSubmitted.length} not submitted</Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : classStudents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Users className="h-7 w-7 text-body" aria-hidden="true" />
          <p className="text-sm text-body">No students in this class.</p>
        </div>
      ) : (
        <ul className="max-h-[45vh] divide-y divide-stroke overflow-y-auto dark:divide-strokedark">
          {classStudents.map((student) => {
            const sub = submissionMap.get(student._id);
            const hasSubmitted = !!sub;
            const isGraded = sub?.score !== undefined && sub.score !== null;

            return (
              <li key={student._id} className="py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-meta-2 text-xs font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                    {student.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black dark:text-white">
                      {student.fullName}
                    </p>
                    {hasSubmitted && sub?.submittedAt && (
                      <p className="text-xs text-body">
                        Submitted {formatDate(sub.submittedAt)}
                        {sub.isLate && <span className="ml-1.5 text-meta-1">(late)</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isGraded && <Badge variant="info">Score: {sub.score}</Badge>}
                    <Badge variant={hasSubmitted ? "success" : "danger"}>
                      {hasSubmitted ? "Submitted" : "Pending"}
                    </Badge>
                  </div>
                </div>

                {hasSubmitted && (
                  <div className="ml-11 mt-2 space-y-1.5">
                    {sub?.content && (
                      <p className="rounded-md bg-whiter px-3 py-2 text-xs text-black dark:bg-meta-4 dark:text-white line-clamp-3">
                        {sub.content}
                      </p>
                    )}
                    {sub?.fileUrl && (
                      <a
                        href={sub.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors dark:border-strokedark"
                      >
                        <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                        Download submitted file
                      </a>
                    )}
                    {sub?.feedback && (
                      <p className="text-xs text-body">
                        Feedback:{" "}
                        <span className="text-black dark:text-white">{sub.feedback}</span>
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Assignments modal ────────────────────────────────────────────────────────

function AssignmentsModal({
  classItem,
  onClose,
}: {
  classItem: Class;
  onClose: () => void;
}) {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments-class", classItem._id],
    queryFn: () => assignmentApi.getByClass(classItem._id),
  });

  const { data: classStudents = [] } = useQuery({
    queryKey: ["admin-class-students", classItem._id],
    queryFn: () => adminApi.getClassStudents(classItem._id),
  });

  const list = assignments as Assignment[];

  return (
    <Modal open onClose={onClose} title={`${classItem.name} — Assignments`}>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-body">
        <School className="h-3.5 w-3.5" aria-hidden="true" />
        {classStudents.length} student{classStudents.length !== 1 ? "s" : ""} in class
      </p>

      {selectedAssignment ? (
        <SubmissionDetail
          assignment={selectedAssignment}
          classStudents={classStudents as AuthUser[]}
          onBack={() => setSelectedAssignment(null)}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <ClipboardList className="h-8 w-8 text-body" aria-hidden="true" />
          <p className="text-sm text-body">No assignments for this class.</p>
        </div>
      ) : (
        <ul className="max-h-[55vh] divide-y divide-stroke overflow-y-auto dark:divide-strokedark">
          {list.map((a) => {
            const overdue = isPastDue(a.dueDate);
            return (
              <li key={a._id}>
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(a)}
                  className="flex w-full items-start gap-3 py-4 text-left transition-colors hover:bg-whiter dark:hover:bg-meta-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-meta-2 dark:bg-meta-4">
                    <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-black dark:text-white">
                      {a.title}
                    </p>
                    {a.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-body">{a.description}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {a.dueDate && (
                        <span className={`flex items-center gap-1 text-xs ${overdue ? "text-meta-1" : "text-body"}`}>
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {formatDate(a.dueDate)}
                        </span>
                      )}
                      <Badge variant={overdue ? "danger" : "info"}>
                        {overdue ? "Overdue" : "Active"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-xs text-body">
                    View submissions
                    <CheckCircle2 className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminAssignmentsPage() {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["admin-classes"],
    queryFn: adminApi.getClasses,
  });

  const classList = classes as Class[];

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : classList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <School className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-black dark:text-white">No classes found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classList.map((cls) => (
            <button
              key={cls._id}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className="w-full rounded-sm border border-stroke bg-white text-left shadow-default transition-all hover:border-primary/50 dark:border-strokedark dark:bg-boxdark"
            >
              <div className="p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                  <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mb-1 text-base font-semibold text-black dark:text-white">
                  {cls.name}
                </h3>
                <div className="mt-4 flex items-center justify-between border-t border-stroke pt-3 dark:border-strokedark">
                  <span className="text-xs text-body">
                    Added{" "}
                    {new Date(cls.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    View Assignments
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedClass && (
        <AssignmentsModal
          classItem={selectedClass}
          onClose={() => setSelectedClass(null)}
        />
      )}
    </div>
  );
}
