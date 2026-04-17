"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api/student";
import { termApi } from "@/lib/api/term";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FileText, Printer, Trophy, History } from "lucide-react";
import Link from "next/link";
import type { Result, Subject } from "@/lib/types";
import type { AcademicTerm } from "@/lib/api/term";

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
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  const [selectedTermId, setSelectedTermId]   = useState<string | undefined>(undefined);

  const { data: promotionData } = useQuery({
    queryKey: ["my-promotion-history"],
    queryFn: studentApi.getMyPromotionHistory,
  });

  const { data: terms = [] } = useQuery({
    queryKey: ["student-terms"],
    queryFn: termApi.getAll,
  });

  // Pre-select current term once terms load
  useEffect(() => {
    const current = (terms as AcademicTerm[]).find((t) => t.isCurrent);
    if (current && !selectedTermId) setSelectedTermId(current._id);
  }, [terms, selectedTermId]);

  // Build selectable class list: current first, then historical
  const classOptions = (() => {
    if (!promotionData) return [];
    const seen = new Set<string>();
    const opts: { _id: string; name: string; isCurrent: boolean }[] = [];
    if (promotionData.currentClass) {
      seen.add(promotionData.currentClass._id);
      opts.push({ ...promotionData.currentClass, isCurrent: true });
    }
    for (const p of promotionData.history) {
      if (p.fromClass && !seen.has(p.fromClass._id)) {
        seen.add(p.fromClass._id);
        opts.push({ ...p.fromClass, isCurrent: false });
      }
    }
    return opts;
  })();

  const activeClassId = selectedClassId ?? promotionData?.currentClass?._id;
  const activeClassName = classOptions.find((c) => c._id === activeClassId)?.name;
  const activeTerm = (terms as AcademicTerm[]).find((t) => t._id === selectedTermId);
  const isViewingHistory = !!activeClassId && activeClassId !== promotionData?.currentClass?._id;

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["my-results", activeClassId, selectedTermId],
    queryFn: () => studentApi.getMyResults({
      ...(activeClassId ? { classId: activeClassId } : {}),
      ...(selectedTermId ? { termId: selectedTermId } : {}),
    }),
    enabled: promotionData !== undefined,
  });

  const { data: rankData } = useQuery({
    queryKey: ["my-ranking", selectedTermId],
    queryFn: () => studentApi.getMyRanking(selectedTermId),
    enabled: !isViewingHistory,
  });

  // Build report card URL with both class and term
  const reportCardHref = (() => {
    const params = new URLSearchParams();
    if (isViewingHistory && activeClassId) params.set("classId", activeClassId);
    if (selectedTermId) params.set("termId", selectedTermId);
    const qs = params.toString();
    return `/student/results/report-card${qs ? `?${qs}` : ""}`;
  })();

  return (
    <div className="space-y-4">
      {/* Class picker — only when student has promotion history */}
      {classOptions.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-stroke bg-white px-4 py-3 dark:border-strokedark dark:bg-boxdark">
          <History className="h-4 w-4 text-body shrink-0" />
          <span className="text-xs text-body">View results by class:</span>
          {classOptions.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedClassId(c._id)}
              className={[
                "rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                activeClassId === c._id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-stroke text-body hover:border-primary dark:border-strokedark",
              ].join(" ")}
            >
              {c.name}
              {c.isCurrent && (
                <span className="ml-1.5 rounded-full bg-meta-3/20 px-1.5 py-0.5 text-[10px] text-meta-3">
                  current
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Term selector */}
      {(terms as AcademicTerm[]).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-stroke bg-white px-4 py-3 dark:border-strokedark dark:bg-boxdark">
          <FileText className="h-4 w-4 text-body shrink-0" />
          <span className="text-xs text-body">Term:</span>
          {(terms as AcademicTerm[]).map((t) => (
            <button
              key={t._id}
              onClick={() => setSelectedTermId(t._id)}
              className={[
                "rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                selectedTermId === t._id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-stroke text-body hover:border-primary dark:border-strokedark",
              ].join(" ")}
            >
              {t.name}
              {t.isCurrent && (
                <span className="ml-1.5 rounded-full bg-meta-3/20 px-1.5 py-0.5 text-[10px] text-meta-3">
                  current
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Historical view banner */}
      {isViewingHistory && activeClassName && (
        <div className="flex items-center justify-between rounded-xl border border-yellow-300/40 bg-yellow-50 px-4 py-2.5 dark:bg-yellow-400/10">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Viewing archived results for <span className="font-semibold">{activeClassName}</span>
          </p>
          <button
            onClick={() => setSelectedClassId(promotionData?.currentClass?._id)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Back to current
          </button>
        </div>
      )}

      {/* Ranking card — current class only */}
      {!isViewingHistory && rankData && rankData.outOf > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-stroke bg-white px-5 py-4 dark:border-strokedark dark:bg-boxdark">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-body">Your Class Ranking</p>
            <p className="mt-0.5 text-lg font-bold text-black dark:text-white">
              {ordinal(rankData.rank)} out of {rankData.outOf} students
            </p>
            {activeTerm && (
              <p className="text-xs text-body">{activeTerm.name} · {activeTerm.academicYear}</p>
            )}
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
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              {activeClassName ? `Results — ${activeClassName}` : "My Results"}
            </h2>
            {activeTerm && (
              <p className="text-xs text-body">{activeTerm.name} · {activeTerm.academicYear}</p>
            )}
          </div>
          {(results as Result[]).length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {(results as Result[]).length} subject{(results as Result[]).length !== 1 ? "s" : ""}
            </span>
          )}
          <Link
            href={reportCardHref}
            className={[
              "ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isViewingHistory
                ? "border border-stroke text-body hover:border-primary hover:text-primary dark:border-strokedark"
                : "bg-primary text-white hover:bg-primary/90",
            ].join(" ")}
          >
            <Printer className="h-3.5 w-3.5" />
            {isViewingHistory ? "Archived Report Card" : "View Report Card"}
          </Link>
        </div>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            </div>
          ) : (results as Result[]).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileText className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm font-medium text-black dark:text-white">No results yet</p>
              <p className="text-xs text-body">
                {isViewingHistory
                  ? "No results were recorded for this class and term."
                  : "Your results will appear here once the admin publishes them."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stroke dark:border-strokedark">
                    <th className="py-2 text-left text-xs font-medium text-body">Subject</th>
                    <th className="py-2 text-left text-xs font-medium text-body">Code</th>
                    <th className="py-2 text-center text-xs font-medium text-body">Marks</th>
                    <th className="py-2 text-center text-xs font-medium text-body">Total</th>
                    <th className="py-2 text-center text-xs font-medium text-body">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke dark:divide-strokedark">
                  {(results as Result[]).map((r) => {
                    const subject = r.subject as Subject | null;
                    return (
                      <tr key={r._id} className="hover:bg-whiter dark:hover:bg-meta-4">
                        <td className="py-3 font-medium text-black dark:text-white">
                          {subject?.name ?? "—"}
                        </td>
                        <td className="py-3 text-body">{subject?.code ?? "—"}</td>
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
                <tfoot>
                  <tr className="border-t-2 border-stroke dark:border-strokedark">
                    <td colSpan={2} className="py-3 text-xs font-semibold uppercase tracking-wider text-body">Total</td>
                    <td className="py-3 text-center font-bold text-black dark:text-white">
                      {(results as Result[]).reduce((s, r) => s + r.marksObtained, 0)}
                    </td>
                    <td className="py-3 text-center text-body">
                      {(results as Result[]).reduce((s, r) => {
                        const sub = r.subject as Subject & { totalMarks?: number };
                        return s + (sub?.totalMarks ?? 100);
                      }, 0)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
