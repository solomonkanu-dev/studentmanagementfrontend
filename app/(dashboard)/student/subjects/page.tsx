"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subjectApi } from "@/lib/api/subject";
import { assignmentApi } from "@/lib/api/assignment";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BookOpen, Hash, School, ClipboardList, ChevronRight, Search, X } from "lucide-react";
import type { Subject, Class, Assignment } from "@/lib/types";

function AssignmentsPanel({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["assignments", subject._id],
    queryFn: () => assignmentApi.getBySubject(subject._id),
  });
  const assignments: Assignment[] = Array.isArray(data) ? data : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">
              {subject.name} — Assignments
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <ClipboardList className="h-8 w-8 text-body" aria-hidden="true" />
            <p className="text-sm text-body">No assignments yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-stroke dark:divide-strokedark">
            {assignments.map((a) => {
              const overdue = a.dueDate && new Date(a.dueDate) < new Date();
              return (
                <li key={a._id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-meta-2 dark:bg-meta-4">
                      <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-black dark:text-white">{a.title}</p>
                      {a.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-body">{a.description}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {a.dueDate && (
                          <span className="text-xs text-body">
                            Due: {new Date(a.dueDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                        <Badge variant={overdue ? "danger" : "info"}>
                          {overdue ? "Overdue" : "Active"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function StudentSubjectsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Subject | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["student-subjects"],
    queryFn: subjectApi.getForStudent,
  });

  const subjects: Subject[] = Array.isArray(data) ? data : [];
  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const getClassName = (cls: string | Class) => (typeof cls === "object" ? cls.name : "—");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" aria-hidden="true" />
          <input
            type="text"
            aria-label="Search subjects"
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded border border-stroke bg-transparent pl-9 pr-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          />
        </div>
        <p className="text-sm text-body">
          {subjects.length} subject{subjects.length !== 1 ? "s" : ""} enrolled
        </p>
      </div>

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
            {search ? "No subjects match your search." : "No subjects enrolled yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className={selected ? "lg:col-span-1 space-y-4" : "lg:col-span-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
            {filtered.map((s) => {
              const isActive = selected?._id === s._id;
              return (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => setSelected(isActive ? null : s)}
                  className={[
                    "w-full rounded-sm border text-left shadow-default transition-all bg-white dark:bg-boxdark",
                    isActive ? "border-primary" : "border-stroke dark:border-strokedark hover:border-primary/50",
                  ].join(" ")}
                >
                  <div className="p-5">
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
                    <h3 className="mb-1 text-base font-semibold text-black dark:text-white">{s.name}</h3>
                    <p className="mb-1 flex items-center gap-1.5 text-sm text-body">
                      <School className="h-3.5 w-3.5" aria-hidden="true" />
                      {getClassName(s.class)}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-stroke pt-3 dark:border-strokedark">
                      <span className="text-xs text-body">
                        Since {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        {isActive ? "Hide" : "Assignments"}
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isActive ? "rotate-90" : ""}`} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="lg:col-span-2">
              <AssignmentsPanel subject={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
