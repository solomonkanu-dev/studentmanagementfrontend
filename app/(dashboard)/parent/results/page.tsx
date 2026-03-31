"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { parentApi } from "@/lib/api/parent";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FileText, GraduationCap } from "lucide-react";
import type { LinkedStudent } from "@/lib/types";

interface Result {
  _id: string;
  subject?: { _id: string; name: string } | string;
  marksObtained?: number;
  totalMarks?: number;
  grade?: string;
  percentage?: number;
  examType?: string;
  term?: string;
}

function gradeColor(grade?: string) {
  if (!grade) return "text-body";
  const g = grade.toUpperCase();
  if (g === "A" || g === "A+") return "text-meta-3";
  if (g === "B" || g === "B+") return "text-primary";
  if (g === "C") return "text-yellow-500";
  return "text-meta-1";
}

function ResultsPage() {
  const searchParams = useSearchParams();
  const urlChild = searchParams.get("child");

  const { data: children = [] } = useQuery({
    queryKey: ["parent-children"],
    queryFn: parentApi.getMyChildren,
  });

  const [selectedId, setSelectedId] = useState<string | null>(urlChild);
  const childId =
    selectedId ??
    (children as LinkedStudent[])[0]?._id ??
    null;

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["parent-results", childId],
    queryFn: () => parentApi.getChildResults(childId!),
    enabled: !!childId,
  });

  const typedResults = results as Result[];

  const avg =
    typedResults.length > 0
      ? typedResults.reduce((s, r) => s + (r.percentage ?? 0), 0) / typedResults.length
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white">Results</h1>
          <p className="text-sm text-body">Exam results and subject grades</p>
        </div>
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
      ) : typedResults.length === 0 ? (
        <p className="text-sm text-body">No results available yet.</p>
      ) : (
        <>
          {/* Average */}
          {avg !== null && (
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-body">Average Score</p>
                  <p className="text-2xl font-bold text-black dark:text-white">
                    {avg.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-body">{typedResults.length} subject(s)</p>
              </CardContent>
            </Card>
          )}

          {/* Results table */}
          <Card>
            <CardHeader>
              <span className="text-sm font-semibold text-black dark:text-white">Subject Results</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-whiter dark:bg-meta-4">
                    <tr>
                      {["Subject", "Marks", "Percentage", "Grade"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-body"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-strokedark">
                    {typedResults.map((r, i) => {
                      const subjectName =
                        r.subject && typeof r.subject === "object"
                          ? r.subject.name
                          : String(r.subject ?? "—");
                      return (
                        <tr key={r._id ?? i} className="hover:bg-whiter dark:hover:bg-meta-4/50">
                          <td className="px-4 py-3 font-medium text-black dark:text-white">
                            {subjectName}
                          </td>
                          <td className="px-4 py-3 text-body">
                            {r.marksObtained ?? "—"}/{r.totalMarks ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-body">
                            {r.percentage != null ? `${r.percentage.toFixed(1)}%` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${gradeColor(r.grade)}`}>
                              {r.grade ?? "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function ParentResultsPage() {
  return (
    <Suspense>
      <ResultsPage />
    </Suspense>
  );
}
