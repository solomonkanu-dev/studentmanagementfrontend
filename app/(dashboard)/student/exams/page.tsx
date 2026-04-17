"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { termApi } from "@/lib/api/term";
import { examApi } from "@/lib/api/exam";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { useAuth } from "@/context/AuthContext";
import type { AcademicTerm } from "@/lib/api/term";
import type { Exam } from "@/lib/types";

const selectCls =
  "h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary";

function examTypeLabel(type: Exam["examType"]) {
  return { written: "Written", oral: "Oral", practical: "Practical", test: "Class Test" }[type] ?? type;
}

function getSubjectName(s: Exam["subject"]) {
  return typeof s === "object" ? s.name : "—";
}

export default function StudentExamsPage() {
  const { user } = useAuth();
  const classId = (user as { class?: string } | null)?.class ?? "";

  const [termId, setTermId] = useState("");

  const { data: terms = [] } = useQuery({
    queryKey: ["student-terms"],
    queryFn: termApi.getAll,
  });

  // Pre-select current term
  useEffect(() => {
    const current = (terms as AcademicTerm[]).find((t) => t.isCurrent);
    if (current && !termId) setTermId(current._id);
  }, [terms, termId]);

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["student-exams", classId, termId],
    queryFn: () => examApi.getByClass(classId, termId || undefined),
    enabled: !!classId && !!termId,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
          <ClipboardCheck size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">Exam Schedule</h1>
          <p className="text-sm text-body dark:text-bodydark">All exams scheduled for your class this term</p>
        </div>
      </div>

      {/* Term filter */}
      <div className="flex flex-wrap gap-3">
        <select className={selectCls + " max-w-[220px]"} value={termId} onChange={(e) => setTermId(e.target.value)}>
          <option value="">Select Term</option>
          {(terms as AcademicTerm[]).map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} ({t.academicYear}){t.isCurrent ? " — Current" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* No class assigned */}
      {!classId && (
        <div className="rounded-xl border border-stroke bg-white p-10 text-center dark:border-strokedark dark:bg-boxdark">
          <ClipboardCheck size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-body dark:text-bodydark">You are not currently enrolled in a class.</p>
        </div>
      )}

      {/* Table */}
      {classId && (
        <div className="rounded-xl border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
          {!termId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardCheck size={40} className="mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-body dark:text-bodydark">Select a term to view the exam schedule.</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (exams as Exam[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardCheck size={40} className="mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-body dark:text-bodydark">No exams have been scheduled for your class this term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Subject</Th>
                    <Th>Title</Th>
                    <Th>Time</Th>
                    <Th>Type</Th>
                    <Th>Venue</Th>
                    <Th>Status</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {(exams as Exam[]).map((exam) => {
                    const examDate = new Date(exam.date);
                    const isPast = examDate < today;
                    const isUpcoming = !isPast && exam.status !== "completed";

                    return (
                      <tr
                        key={exam._id}
                        className={`transition-colors hover:bg-whiter dark:hover:bg-meta-4 ${isPast ? "opacity-60" : ""}`}
                      >
                        <Td className="whitespace-nowrap font-semibold text-black dark:text-white">
                          {examDate.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </Td>
                        <Td>{getSubjectName(exam.subject)}</Td>
                        <Td>{exam.title}</Td>
                        <Td className="whitespace-nowrap">{exam.startTime} – {exam.endTime}</Td>
                        <Td><Badge variant="default">{examTypeLabel(exam.examType)}</Badge></Td>
                        <Td>{exam.venue || "—"}</Td>
                        <Td>
                          {isUpcoming ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                              </span>
                              Upcoming
                            </span>
                          ) : (
                            <Badge variant="default">Done</Badge>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Instructions panel — show if any exam has instructions */}
              {(exams as Exam[]).some((e) => e.instructions) && (
                <div className="border-t border-stroke px-5 py-4 dark:border-strokedark">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-body dark:text-bodydark">Instructions</h3>
                  <ul className="space-y-2">
                    {(exams as Exam[]).filter((e) => e.instructions).map((exam) => (
                      <li key={exam._id} className="text-sm text-black dark:text-white">
                        <span className="font-medium">{getSubjectName(exam.subject)} — {exam.title}:</span>{" "}
                        <span className="text-body dark:text-bodydark">{exam.instructions}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
