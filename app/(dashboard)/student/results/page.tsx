"use client";

import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api/student";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FileText, Printer, Trophy } from "lucide-react";
import Link from "next/link";
import type { Result, Subject, Class } from "@/lib/types";

function ordinal(n: number | null): string {
  if (n === null) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function gradeVariant(grade?: string): "success" | "info" | "warning" | "danger" | "default" {
  if (!grade) return "default";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "success";
  if (g.startsWith("B")) return "info";
  if (g.startsWith("C")) return "warning";
  if (g.startsWith("D")) return "warning";
  return "danger";
}

export default function StudentResultsPage() {
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["my-results"],
    queryFn: studentApi.getMyResults,
  });

  const { data: rankData } = useQuery({
    queryKey: ["my-ranking"],
    queryFn: studentApi.getMyRanking,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rankData && rankData.outOf > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-stroke bg-white px-5 py-4 dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-body">Your Class Ranking</p>
            <p className="mt-0.5 text-lg font-bold text-black dark:text-white">
              {ordinal(rankData.rank)} out of {rankData.outOf} students
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-body">Total Marks</p>
            <p className="text-lg font-bold text-black dark:text-white">{rankData.total}</p>
          </div>
        </div>
      )}
    <Card>
      <div className="flex items-center gap-2 border-b border-stroke px-5 py-4 dark:border-strokedark">
        <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-black dark:text-white">My Results</h2>
        {results.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {results.length} subject{results.length !== 1 ? "s" : ""}
          </span>
        )}
        <Link
          href="/student/results/report-card"
          className="ml-auto flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Printer className="h-3.5 w-3.5" />
          Download Report Card
        </Link>
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
    </div>
  );
}
