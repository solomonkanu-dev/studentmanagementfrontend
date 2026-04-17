"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { classApi } from "@/lib/api/class";
import { adminApi } from "@/lib/api/admin";
import { examApi } from "@/lib/api/exam";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import type { AcademicTerm } from "@/lib/api/admin";
import type { Class, Exam } from "@/lib/types";

const selectCls =
  "h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary";

function statusVariant(status: Exam["status"]): "info" | "warning" | "success" {
  if (status === "upcoming") return "info";
  if (status === "ongoing")  return "warning";
  return "success";
}

function examTypeLabel(type: Exam["examType"]) {
  return { written: "Written", oral: "Oral", practical: "Practical", test: "Class Test" }[type] ?? type;
}

function getSubjectName(s: Exam["subject"]) {
  return typeof s === "object" ? s.name : "—";
}

export default function LecturerExamsPage() {
  const [classId, setClassId] = useState("");
  const [termId, setTermId]   = useState("");

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["lecturer-classes"],
    queryFn: classApi.getForLecturer,
  });

  const { data: terms = [] } = useQuery({
    queryKey: ["terms"],
    queryFn: adminApi.getTerms,
  });

  // Pre-select current term
  useEffect(() => {
    const current = (terms as AcademicTerm[]).find((t) => t.isCurrent);
    if (current && !termId) setTermId(current._id);
  }, [terms, termId]);

  // Pre-select first class
  useEffect(() => {
    if ((classes as Class[]).length > 0 && !classId) {
      setClassId((classes as Class[])[0]._id);
    }
  }, [classes, classId]);

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["lecturer-exams", classId, termId],
    queryFn: () => examApi.getByClass(classId, termId || undefined),
    enabled: !!classId,
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
          <p className="text-sm text-body dark:text-bodydark">Upcoming and past exams for your classes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className={selectCls + " max-w-[200px]"} value={termId} onChange={(e) => setTermId(e.target.value)}>
          <option value="">All Terms</option>
          {(terms as AcademicTerm[]).map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} ({t.academicYear}){t.isCurrent ? " — Current" : ""}
            </option>
          ))}
        </select>
        <select className={selectCls + " max-w-[200px]"} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select Class</option>
          {(classes as Class[]).map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
        {!classId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardCheck size={40} className="mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-body dark:text-bodydark">Select a class to see its exam schedule.</p>
          </div>
        ) : examsLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (exams as Exam[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardCheck size={40} className="mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-body dark:text-bodydark">No exams scheduled for the selected class and term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <tr>
                  <Th>Date</Th>
                  <Th>Title</Th>
                  <Th>Subject</Th>
                  <Th>Time</Th>
                  <Th>Type</Th>
                  <Th>Venue</Th>
                  <Th>Status</Th>
                </tr>
              </TableHead>
              <TableBody>
                {(exams as Exam[]).map((exam) => {
                  const isPast = new Date(exam.date) < today;
                  return (
                    <tr
                      key={exam._id}
                      className={`transition-colors hover:bg-whiter dark:hover:bg-meta-4 ${isPast ? "opacity-60" : ""}`}
                    >
                      <Td className="whitespace-nowrap font-medium text-black dark:text-white">
                        {new Date(exam.date).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                      </Td>
                      <Td>{exam.title}</Td>
                      <Td>{getSubjectName(exam.subject)}</Td>
                      <Td className="whitespace-nowrap">{exam.startTime} – {exam.endTime}</Td>
                      <Td><Badge variant="default">{examTypeLabel(exam.examType)}</Badge></Td>
                      <Td>{exam.venue || "—"}</Td>
                      <Td><Badge variant={statusVariant(exam.status)}>{exam.status}</Badge></Td>
                    </tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
