"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subjectApi } from "@/lib/api/subject";
import { assignmentApi, submissionApi } from "@/lib/api/assignment";
import { classApi } from "@/lib/api/class";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  Search,
  BookOpen,
  ClipboardList,
  Hash,
  School,
  ChevronRight,
  FileDown,
  Users,
  CheckCircle2,
  Clock,
  ChevronLeft,
} from "lucide-react";
import type { Subject, Class, Assignment, Submission, AuthUser } from "@/lib/types";

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
      {/* Back + header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-body hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to assignments
        </button>
      </div>

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
                        {sub.isLate && (
                          <span className="ml-1.5 text-meta-1">(late)</span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isGraded && (
                      <Badge variant="info">Score: {sub.score}</Badge>
                    )}
                    <Badge variant={hasSubmitted ? "success" : "danger"}>
                      {hasSubmitted ? "Submitted" : "Pending"}
                    </Badge>
                  </div>
                </div>

                {/* Submission content / file */}
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
  subject,
  onClose,
}: {
  subject: Subject;
  onClose: () => void;
}) {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const className =
    typeof subject.class === "object" ? (subject.class as Class).name : "—";
  const classId =
    typeof subject.class === "object"
      ? (subject.class as Class)._id
      : subject.class;

  const { data, isLoading } = useQuery({
    queryKey: ["assignments", subject._id],
    queryFn: () => assignmentApi.getBySubject(subject._id),
  });

  const { data: classStudents = [] } = useQuery({
    queryKey: ["class-students", classId],
    queryFn: () => classApi.getStudents(classId),
    enabled: !!classId,
  });

  const assignments: Assignment[] = Array.isArray(data) ? data : [];

  return (
    <Modal open onClose={onClose} title={`${subject.name} — Assignments`}>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-body">
        <School className="h-3.5 w-3.5" aria-hidden="true" />
        Class: {className}
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
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <ClipboardList className="h-8 w-8 text-body" aria-hidden="true" />
          <p className="text-sm text-body">No assignments yet.</p>
          <p className="text-xs text-body">
            Create assignments from the Assignments page.
          </p>
        </div>
      ) : (
        <ul className="max-h-[55vh] divide-y divide-stroke overflow-y-auto dark:divide-strokedark">
          {assignments.map((a) => {
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
                      <p className="mt-0.5 line-clamp-1 text-xs text-body">
                        {a.description}
                      </p>
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
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
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

export default function LecturerSubjectsPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [selected, setSelected] = useState<Subject | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lecturer-subjects"],
    queryFn: subjectApi.getForLecturer,
  });

  const subjects: Subject[] = Array.isArray(data) ? data : [];

  // Derive unique classes from the loaded subjects — no extra query needed
  const classOptions = subjects.reduce<{ id: string; name: string }[]>((acc, s) => {
    const id = typeof s.class === "object" && s.class ? s.class._id : (s.class as string);
    const name = typeof s.class === "object" && s.class ? s.class.name : "";
    if (id && name && !acc.some((c) => c.id === id)) acc.push({ id, name });
    return acc;
  }, []);

  const filtered = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code ?? "").toLowerCase().includes(search.toLowerCase());
    const subjectClassId =
      typeof s.class === "object" && s.class ? s.class._id : (s.class as string);
    const matchesClass = !classFilter || subjectClassId === classFilter;
    return matchesSearch && matchesClass;
  });

  const getClassName = (cls: string | Class) =>
    typeof cls === "object" ? cls.name : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label="Search subjects"
              placeholder="Search by name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded border border-stroke bg-transparent pl-9 pr-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            />
          </div>
          {classOptions.length > 1 && (
            <select
              aria-label="Filter by class"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-9 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            >
              <option value="">All Classes</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
        <p className="text-sm text-body">
          {filtered.length} of {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <BookOpen className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-black dark:text-white">
            {search || classFilter
              ? "No subjects match your filters."
              : "No subjects assigned yet."}
          </p>
          {!search && !classFilter && (
            <p className="text-xs text-body">
              Subjects assigned to you by the admin will appear here.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const cls = getClassName(s.class);
            return (
              <button
                key={s._id}
                type="button"
                onClick={() => setSelected(s)}
                className="w-full rounded-sm border border-stroke bg-white text-left shadow-default transition-all hover:border-primary/50 dark:border-strokedark dark:bg-boxdark"
              >
                <div className="p-5">
                  {/* Icon + badge row */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                      <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    {s.code && (
                      <span className="flex items-center gap-1 rounded-full bg-meta-2 px-2.5 py-0.5 text-xs font-medium text-primary dark:bg-meta-4 dark:text-white">
                        <Hash className="h-3 w-3" aria-hidden="true" />
                        {s.code}
                      </span>
                    )}
                  </div>

                  <h3 className="mb-1 text-base font-semibold text-black dark:text-white">
                    {s.name}
                  </h3>

                  <p className="mb-1 flex items-center gap-1.5 text-sm text-body">
                    <School className="h-3.5 w-3.5" aria-hidden="true" />
                    {cls}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-stroke pt-3 dark:border-strokedark">
                    <span className="text-xs text-body">
                      Added{" "}
                      {new Date(s.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      View Assignments
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Assignments modal */}
      {selected && (
        <AssignmentsModal subject={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
