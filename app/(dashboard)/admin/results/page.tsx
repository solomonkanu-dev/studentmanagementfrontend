"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { classApi } from "@/lib/api/class";
import { adminApi } from "@/lib/api/admin";
import type { AcademicTerm } from "@/lib/api/admin";
import { subjectApi } from "@/lib/api/subject";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { FileText, Trophy, Medal } from "lucide-react";
import Link from "next/link";
import type { Class, Subject, Result, AuthUser } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";

function gradeVariant(grade?: string): "success" | "info" | "warning" | "danger" | "default" {
  if (!grade) return "default";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "success";
  if (g.startsWith("B")) return "info";
  if (g.startsWith("C")) return "warning";
  if (g.startsWith("D")) return "warning";
  return "danger";
}

const selectCls =
  "h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary";

export default function ResultsPage() {
  const [tab, setTab] = useState<"results" | "rankings">("results");

  // Shared term filter
  const [selectedTermId, setSelectedTermId] = useState("");

  // Results tab
  const [resultsClass, setResultsClass] = useState("");

  // Rankings tab
  const [rankingsClass, setRankingsClass] = useState("");

  // Assign marks modal
  const [showAssign, setShowAssign] = useState(false);
  const [formError, setFormError] = useState("");
  const [markForm, setMarkForm] = useState({
    studentId: "",
    subjectId: "",
    classId: "",
    marks: "",
    totalScore: "100",
    termId: "",
  });

  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: classApi.getAll });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: subjectApi.getAll });
  const { data: students = [] } = useQuery({ queryKey: ["admin-students"], queryFn: adminApi.getStudents });
  const { data: terms = [] } = useQuery({ queryKey: ["terms"], queryFn: adminApi.getTerms });

  const currentTerm = (terms as AcademicTerm[]).find((t) => t.isCurrent);

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["results-class", resultsClass, selectedTermId],
    queryFn: () => adminApi.getResultsByClass(resultsClass, selectedTermId || undefined),
    enabled: !!resultsClass,
  });

  const { data: rankingsData, isLoading: rankingsLoading } = useQuery({
    queryKey: ["class-rankings", rankingsClass, selectedTermId],
    queryFn: () => adminApi.getClassRankings(rankingsClass, selectedTermId || undefined),
    enabled: !!rankingsClass,
  });

  const assignMutation = useMutation({
    mutationFn: adminApi.assignMarks,
    onSuccess: () => {
      setShowAssign(false);
      setMarkForm({ studentId: "", subjectId: "", classId: "", marks: "", totalScore: "100", termId: "" });
      setFormError("");
    },
    onError: (err: unknown) => setFormError(errMsg(err, "Failed")),
  });

  const openAssign = () => {
    setMarkForm({
      studentId: "",
      subjectId: "",
      classId: "",
      marks: "",
      totalScore: "100",
      termId: currentTerm?._id ?? "",
    });
    setFormError("");
    setShowAssign(true);
  };

  const getStudentName = (s: string | AuthUser) => typeof s === "object" ? s.fullName : "—";
  const getSubjectName = (s: string | Subject) => typeof s === "object" ? s.name : "—";
  const getTermName = (t: unknown) => {
    if (!t) return "—";
    if (typeof t === "object" && t !== null && "name" in t) return (t as { name: string }).name;
    return "—";
  };
  const getClassName = (id: string) => (classes as Class[]).find((c) => c._id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Tabs */}
        <div className="flex rounded-sm border border-stroke dark:border-strokedark overflow-hidden">
          {(["results", "rankings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "px-5 py-2 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "bg-primary text-white"
                  : "bg-white text-body hover:bg-whiter dark:bg-boxdark dark:text-bodydark dark:hover:bg-meta-4",
              ].join(" ")}
            >
              {t === "results" ? "Results" : "Rankings"}
            </button>
          ))}
        </div>

        {/* Term filter (shared) */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-black dark:text-white whitespace-nowrap">Term</label>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="h-9 w-48 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          >
            <option value="">All Terms (Annual)</option>
            {(terms as AcademicTerm[]).map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} {t.isCurrent ? "(current)" : ""}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={openAssign}>Assign Marks</Button>
      </div>

      {/* ── Results tab ──────────────────────────────────────────────────── */}
      {tab === "results" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-black dark:text-white">Class</label>
            <select
              value={resultsClass}
              onChange={(e) => setResultsClass(e.target.value)}
              className="h-9 w-56 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            >
              <option value="">Select a class</option>
              {(classes as Class[]).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <Card>
            {!resultsClass ? (
              <CardContent>
                <p className="py-10 text-center text-sm text-body">Select a class to view results.</p>
              </CardContent>
            ) : resultsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            ) : (
              <Table>
                <TableHead>
                  <tr>
                    <Th>Student</Th>
                    <Th>Subject</Th>
                    <Th>Term</Th>
                    <Th>Marks</Th>
                    <Th>Total</Th>
                    <Th>%</Th>
                    <Th>Grade</Th>
                    <Th>{""}</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {(results as Result[]).length === 0 ? (
                    <tr><Td colSpan={8} className="py-10 text-center text-body">No results found.</Td></tr>
                  ) : (
                    (results as Result[]).map((r) => {
                      const studentId = typeof r.student === "object" ? (r.student as AuthUser)._id : r.student;
                      const total = r.totalScore ?? 100;
                      const pct = total > 0 ? Math.round((r.marksObtained / total) * 100) : 0;
                      return (
                        <tr key={r._id} className="hover:bg-whiter transition-colors dark:hover:bg-meta-4">
                          <Td className="font-medium text-black dark:text-white">{getStudentName(r.student)}</Td>
                          <Td className="text-body">{getSubjectName(r.subject)}</Td>
                          <Td className="text-body">{getTermName(r.term)}</Td>
                          <Td className="font-semibold text-black dark:text-white">{r.marksObtained}</Td>
                          <Td className="text-body">{total}</Td>
                          <Td className="text-body">{pct}%</Td>
                          <Td><Badge variant={gradeVariant(r.grade)}>{r.grade ?? "—"}</Badge></Td>
                          <Td>
                            <Link
                              href={`/admin/results/report-card?studentId=${studentId}`}
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Report Card
                            </Link>
                          </Td>
                        </tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* ── Rankings tab ─────────────────────────────────────────────────── */}
      {tab === "rankings" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-black dark:text-white">Class</label>
            <select
              value={rankingsClass}
              onChange={(e) => setRankingsClass(e.target.value)}
              className="h-9 w-56 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            >
              <option value="">Select a class</option>
              {(classes as Class[]).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <Card>
            <div className="flex items-center gap-2 border-b border-stroke px-5 py-4 dark:border-strokedark">
              <Trophy className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-black dark:text-white">
                {rankingsClass ? `${getClassName(rankingsClass)} — Rankings` : "Class Rankings"}
                {selectedTermId && (
                  <span className="ml-2 text-xs font-normal text-body">
                    ({(terms as AcademicTerm[]).find((t) => t._id === selectedTermId)?.name ?? "Term"})
                  </span>
                )}
                {!selectedTermId && <span className="ml-2 text-xs font-normal text-body">(Annual)</span>}
              </h2>
              {rankingsData && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {rankingsData.total} student{rankingsData.total !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {!rankingsClass ? (
              <CardContent>
                <p className="py-10 text-center text-sm text-body">Select a class to view rankings.</p>
              </CardContent>
            ) : rankingsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            ) : (
              <Table>
                <TableHead>
                  <tr>
                    <Th>Rank</Th>
                    <Th>Student</Th>
                    <Th>Total Marks</Th>
                    <Th>Subjects</Th>
                    <Th>{""}</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {!rankingsData || rankingsData.rankings.length === 0 ? (
                    <tr><Td colSpan={5} className="py-10 text-center text-body">No rankings yet.</Td></tr>
                  ) : (
                    rankingsData.rankings.map((entry) => {
                      const studentId = typeof entry.student === "object" ? entry.student._id : String(entry.student);
                      return (
                        <tr key={studentId} className="hover:bg-whiter transition-colors dark:hover:bg-meta-4">
                          <Td>
                            {entry.rank === 1 ? (
                              <Medal className="h-5 w-5 text-yellow-400" aria-label="1st" />
                            ) : entry.rank === 2 ? (
                              <Medal className="h-5 w-5 text-slate-400" aria-label="2nd" />
                            ) : entry.rank === 3 ? (
                              <Medal className="h-5 w-5 text-orange-400" aria-label="3rd" />
                            ) : (
                              <span className="text-sm font-medium text-body">{entry.rank}</span>
                            )}
                          </Td>
                          <Td className="font-medium text-black dark:text-white">
                            {typeof entry.student === "object" ? entry.student.fullName : "—"}
                          </Td>
                          <Td className="font-semibold text-black dark:text-white">{entry.total}</Td>
                          <Td className="text-body">{entry.subjects}</Td>
                          <Td>
                            <Link
                              href={`/admin/results/report-card?studentId=${studentId}`}
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Report Card
                            </Link>
                          </Td>
                        </tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* ── Assign Marks modal ───────────────────────────────────────────── */}
      <Modal open={showAssign} onClose={() => { setShowAssign(false); setFormError(""); }} title="Assign Marks">
        <div className="space-y-4">
          {/* Term */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Term</label>
            <select
              value={markForm.termId}
              onChange={(e) => setMarkForm((f) => ({ ...f, termId: e.target.value }))}
              className={selectCls}
            >
              <option value="">No term / unassigned</option>
              {(terms as AcademicTerm[]).map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} {t.isCurrent ? "(current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Class</label>
            <select
              value={markForm.classId}
              onChange={(e) => setMarkForm({ studentId: "", subjectId: "", classId: e.target.value, marks: "", totalScore: "100", termId: markForm.termId })}
              className={selectCls}
            >
              <option value="">Select a class</option>
              {(classes as Class[]).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Student */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Student</label>
            <select
              value={markForm.studentId}
              onChange={(e) => setMarkForm((f) => ({ ...f, studentId: e.target.value }))}
              disabled={!markForm.classId}
              className={`${selectCls} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <option value="">Select student</option>
              {(students as AuthUser[])
                .filter((s) => {
                  const cId = typeof s.class === "object" && s.class ? (s.class as { _id: string })._id : s.class;
                  return cId === markForm.classId;
                })
                .map((s) => (
                  <option key={s._id} value={s._id}>{s.fullName}</option>
                ))}
            </select>
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Subject</label>
            <select
              value={markForm.subjectId}
              onChange={(e) => setMarkForm((f) => ({ ...f, subjectId: e.target.value }))}
              disabled={!markForm.classId}
              className={`${selectCls} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <option value="">Select subject</option>
              {(subjects as Subject[])
                .filter((s) => {
                  const cId = typeof s.class === "object" && s.class ? s.class._id : s.class;
                  return cId === markForm.classId;
                })
                .map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Marks Obtained"
              type="number"
              placeholder="80"
              value={markForm.marks}
              onChange={(e) => setMarkForm((f) => ({ ...f, marks: e.target.value }))}
            />
            <Input
              label="Out of (Total)"
              type="number"
              placeholder="100"
              value={markForm.totalScore}
              onChange={(e) => setMarkForm((f) => ({ ...f, totalScore: e.target.value }))}
            />
          </div>

          {formError && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button
              isLoading={assignMutation.isPending}
              onClick={() => {
                setFormError("");
                assignMutation.mutate({
                  studentId: markForm.studentId,
                  subjectId: markForm.subjectId,
                  classId: markForm.classId,
                  marksObtained: Number(markForm.marks),
                  totalScore: Number(markForm.totalScore) || 100,
                  termId: markForm.termId || undefined,
                });
              }}
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
