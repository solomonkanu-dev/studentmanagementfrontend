"use client";

import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api/student";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FileText } from "lucide-react";
import type { Result, Subject, Class } from "@/lib/types";

function gradeVariant(grade?: string): "success" | "warning" | "danger" | "default" {
  if (!grade) return "default";
  if (grade === "A") return "success";
  if (grade === "B" || grade === "C") return "warning";
  return "danger";
}

export default function StudentResultsPage() {
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["my-results"],
    queryFn: studentApi.getMyResults,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-stroke px-5 py-4 dark:border-strokedark">
        <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-black dark:text-white">My Results</h2>
        {results.length > 0 && (
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {results.length} subject{results.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <CardContent>
        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText className="h-8 w-8 text-body" aria-hidden="true" />
            <p className="text-sm font-medium text-black dark:text-white">No results yet</p>
            <p className="text-xs text-body">Your results will appear here once marks are assigned.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark">
                  <th className="py-2 text-left text-xs font-medium text-body">Subject</th>
                  <th className="py-2 text-left text-xs font-medium text-body">Code</th>
                  <th className="py-2 text-left text-xs font-medium text-body">Class</th>
                  <th className="py-2 text-center text-xs font-medium text-body">Marks</th>
                  <th className="py-2 text-center text-xs font-medium text-body">Total</th>
                  <th className="py-2 text-center text-xs font-medium text-body">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {(results as Result[]).map((r) => {
                  const subject = r.subject as Subject | null;
                  const cls = r.class as Class | null;
                  return (
                    <tr key={r._id} className="hover:bg-whiter dark:hover:bg-meta-4">
                      <td className="py-3 font-medium text-black dark:text-white">
                        {subject?.name ?? "—"}
                      </td>
                      <td className="py-3 text-body">{subject?.code ?? "—"}</td>
                      <td className="py-3 text-body">{cls?.name ?? "—"}</td>
                      <td className="py-3 text-center font-semibold text-black dark:text-white">
                        {r.marksObtained}
                      </td>
                      <td className="py-3 text-center text-body">
                        {(subject as Subject & { totalMarks?: number })?.totalMarks ?? 100}
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant={gradeVariant(r.grade)} className="font-bold">
                          {r.grade ?? "—"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
