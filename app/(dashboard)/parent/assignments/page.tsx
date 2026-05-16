"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { parentApi } from "@/lib/api/parent";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ClipboardList,
  GraduationCap,
  Download,
  Eye,
  CalendarClock,
} from "lucide-react";
import type { LinkedStudent, Assignment, Subject } from "@/lib/types";

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

function fileName(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1]) || "Download file";
  } catch {
    return "Download file";
  }
}

function subjectName(subject: Assignment["subject"]): string {
  if (subject && typeof subject === "object") return (subject as Subject).name;
  return "—";
}

function AssignmentsPage() {
  const searchParams = useSearchParams();
  const urlChild = searchParams.get("child");

  const { data: children = [] } = useQuery({
    queryKey: ["parent-children"],
    queryFn: parentApi.getMyChildren,
  });

  const [selectedId, setSelectedId] = useState<string | null>(urlChild);
  const childId =
    selectedId ?? (children as LinkedStudent[])[0]?._id ?? null;

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["parent-assignments", childId],
    queryFn: () => parentApi.getChildAssignments(childId!),
    enabled: !!childId,
  });

  const typedAssignments = assignments as Assignment[];
  const childName = (children as LinkedStudent[]).find((c) => c._id === childId)
    ?.fullName;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white">
            Assignments
          </h1>
          <p className="text-sm text-body">
            Assignments set for your child by their teachers
          </p>
        </div>
      </div>

      {/* View-only notice */}
      <div className="flex items-start gap-2 rounded-xl border border-stroke bg-meta-2 px-4 py-3 dark:border-strokedark dark:bg-meta-4">
        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-body" aria-hidden="true" />
        <p className="text-xs text-body">
          This is a view-only page. You can open and download assignment files,
          but only your child can submit their work.
        </p>
      </div>

      {/* Child selector */}
      {(children as LinkedStudent[]).length > 1 && (
        <div className="flex flex-wrap gap-2">
          {(children as LinkedStudent[]).map((child) => (
            <button
              key={child._id}
              onClick={() => setSelectedId(child._id)}
              className={[
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                childId === child._id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-stroke text-body hover:border-primary dark:border-strokedark",
              ].join(" ")}
            >
              <GraduationCap className="h-4 w-4" />
              {child.fullName}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : !childId ? (
        <p className="text-sm text-body">No children linked to your account.</p>
      ) : typedAssignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ClipboardList className="h-8 w-8 text-body" aria-hidden="true" />
            <p className="text-sm text-body">
              No assignments for {childName ?? "this child"} yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-black dark:text-white">
              {childName ? `${childName}'s Assignments` : "Assignments"} (
              {typedAssignments.length})
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-stroke dark:divide-strokedark">
              {typedAssignments.map((a) => {
                const overdue = isPastDue(a.dueDate);
                return (
                  <li key={a._id} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-meta-2 dark:bg-meta-4">
                        <ClipboardList
                          className="h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-black dark:text-white">
                            {a.title}
                          </p>
                          <Badge variant="info">{subjectName(a.subject)}</Badge>
                          {a.dueDate && (
                            <Badge variant={overdue ? "danger" : "default"}>
                              <CalendarClock
                                className="mr-1 h-3 w-3 shrink-0"
                                aria-hidden="true"
                              />
                              {overdue ? "Past due" : "Due"} {formatDate(a.dueDate)}
                            </Badge>
                          )}
                        </div>
                        {a.description && (
                          <p className="mt-1 text-xs text-body whitespace-pre-wrap">
                            {a.description}
                          </p>
                        )}
                        {a.attachmentUrl && (
                          <a
                            href={a.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="mt-2 inline-flex items-center gap-1.5 rounded border border-stroke bg-meta-2 px-2.5 py-1 text-xs text-primary transition-colors hover:border-primary dark:border-strokedark dark:bg-meta-4"
                          >
                            <Download
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden="true"
                            />
                            {a.attachmentName || fileName(a.attachmentUrl)}
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ParentAssignmentsPage() {
  return (
    <Suspense>
      <AssignmentsPage />
    </Suspense>
  );
}
