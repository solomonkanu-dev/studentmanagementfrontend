"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { subjectApi } from "@/lib/api/subject";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { FileText, Trophy, Medal, CheckCircle2, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { Class, Subject, Result, AuthUser } from "@/lib/types";
import type { AcademicTerm } from "@/lib/api/admin";
import { errMsg } from "@/lib/utils/errMsg";
import { gradeVariant } from "@/lib/utils/grading";

const TAB_LABELS = { results: "Results", rankings: "Rankings", publish: "Publish" } as const;
type ResultsTab = keyof typeof TAB_LABELS;

const selectCls =
  "h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary";

export default function ResultsPage() {
  const [tab, setTab] = useState<ResultsTab>("results");

  // Results tab state
  const [resultsClass, setResultsClass] = useState("");
  const [resultsTerm, setResultsTerm] = useState("");
  const [resultsStudent, setResultsStudent] = useState("");

  // Rankings tab state
  const [rankingsClass, setRankingsClass] = useState("");
  const [rankingsTerm, setRankingsTerm] = useState("");

  // Assign marks modal state
  const [showAssign, setShowAssign] = useState(false);
  const [formError, setFormError] = useState("");
  const [markForm, setMarkForm] = useState({ studentId: "", subjectId: "", classId: "", caMarks: "", examMarks: "", termId: "" });

  const { data: classes = [] } = useQuery({ queryKey: ["admin-classes"], queryFn: adminApi.getClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: subjectApi.getAll });
  const { data: students = [] } = useQuery({ queryKey: ["admin-students"], queryFn: adminApi.getStudents });
  const { data: terms = [] } = useQuery({ queryKey: ["admin-terms"], queryFn: adminApi.getTerms });

  // Pre-select current term once terms load
  useEffect(() => {
    const current = terms.find((t) => t.isCurrent);
    if (current) {
      if (!resultsTerm) setResultsTerm(current._id);
      if (!rankingsTerm) setRankingsTerm(current._id);
    }
  }, [terms]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["results-class", resultsClass, resultsTerm],
    queryFn: () => adminApi.getResultsByClass(resultsClass, resultsTerm || undefined),
    enabled: !!resultsClass,
  });

  const { data: rankingsData, isLoading: rankingsLoading } = useQuery({
    queryKey: ["class-rankings", rankingsClass, rankingsTerm],
    queryFn: () => adminApi.getClassRankings(rankingsClass, rankingsTerm || undefined),
    enabled: !!rankingsClass,
  });

  const assignMutation = useMutation({
    mutationFn: adminApi.assignMarks,
    onSuccess: () => {
      setShowAssign(false);
      setMarkForm({ studentId: "", subjectId: "", classId: "", caMarks: "", examMarks: "", termId: "" });
      setFormError("");
    },
    onError: (err: unknown) => {
      const msg = errMsg(err, "Failed");
      setFormError(msg);
    },
  });

  const getStudentName = (s: string | AuthUser) => typeof s === "object" ? s.fullName : "—";
  const getSubjectName = (s: string | Subject) => typeof s === "object" ? s.name : "—";
  const getClassName = (id: string) => (classes as Class[]).find((c) => c._id === id)?.name ?? id;

  // Group results by student so each student appears on a single row
  const groupedResults = useMemo(() => {
    const map = new Map<string, { student: string | AuthUser; studentId: string; items: Result[] }>();
    for (const r of results as Result[]) {
      const sid = typeof r.student === "object" ? (r.student as AuthUser)._id : r.student;
      if (resultsStudent && sid !== resultsStudent) continue;
      if (!map.has(sid)) map.set(sid, { student: r.student, studentId: sid, items: [] });
      map.get(sid)!.items.push(r);
    }
    return Array.from(map.values());
  }, [results, resultsStudent]);

  return (
    <div className="space-y-4">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex rounded-sm border border-stroke dark:border-strokedark overflow-hidden">
          {(["results", "rankings", "publish"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "px-5 py-2 text-sm font-medium transition-colors",
                tab === t
                  ? "bg-primary text-white"
                  : "bg-white text-body hover:bg-whiter dark:bg-boxdark dark:text-bodydark dark:hover:bg-meta-4",
              ].join(" ")}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <Button onClick={() => { setShowAssign(true); setMarkForm({ studentId: "", subjectId: "", classId: "", caMarks: "", examMarks: "", termId: "" }); }}>
          Assign Marks
        </Button>
      </div>

      {/* ── Results tab ──────────────────────────────────────────────────── */}
      {tab === "results" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-black dark:text-white">Class</label>
            <select
              value={resultsClass}
              onChange={(e) => { setResultsClass(e.target.value); setResultsStudent(""); }}
              className="h-9 w-56 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            >
              <option value="">Select a class</option>
              {(classes as Class[]).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            <label className="text-sm font-medium text-black dark:text-white">Term</label>
            <select
              value={resultsTerm}
              onChange={(e) => setResultsTerm(e.target.value)}
              className="h-9 w-48 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            >
              <option value="">All terms</option>
              {terms.map((t) => (
                <option key={t._id} value={t._id}>{t.name} {t.isCurrent ? "(Current)" : ""}</option>
              ))}
            </select>
            <label className="text-sm font-medium text-black dark:text-white">Student</label>
            <select
              value={resultsStudent}
              onChange={(e) => setResultsStudent(e.target.value)}
              disabled={!resultsClass}
              className="h-9 w-52 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            >
              <option value="">All students</option>
              {(students as AuthUser[])
                .filter((s) => {
                  const cId = typeof s.class === "object" && s.class ? (s.class as { _id: string })._id : s.class;
                  return cId === resultsClass;
                })
                .map((s) => (
                  <option key={s._id} value={s._id}>{s.fullName}</option>
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
                    <Th>Grades</Th>
                    <Th>{""}</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {groupedResults.length === 0 ? (
                    <tr><Td colSpan={3} className="py-10 text-center text-body">No results found.</Td></tr>
                  ) : (
                    groupedResults.map((g) => (
                      <tr key={g.studentId} className="hover:bg-whiter transition-colors dark:hover:bg-meta-4">
                        <Td className="align-top font-medium text-black dark:text-white">
                          {getStudentName(g.student)}
                          <span className="ml-1 text-xs font-normal text-body">
                            ({g.items.length} subject{g.items.length !== 1 ? "s" : ""})
                          </span>
                        </Td>
                        <Td>
                          <div className="flex flex-wrap gap-1.5">
                            {g.items.map((r) => (
                              <span
                                key={r._id}
                                className="inline-flex items-center gap-1.5 rounded border border-stroke px-2 py-1 dark:border-strokedark"
                              >
                                <span className="text-xs text-body">{getSubjectName(r.subject)}</span>
                                <span className="text-xs font-semibold text-black dark:text-white">{r.marksObtained}</span>
                                <Badge variant={gradeVariant(r.grade)}>{r.grade ?? "—"}</Badge>
                              </span>
                            ))}
                          </div>
                        </Td>
                        <Td className="align-top">
                          <Link
                            href={`/admin/results/report-card?studentId=${g.studentId}${resultsTerm ? `&termId=${resultsTerm}` : ""}`}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Report Card
                          </Link>
                        </Td>
                      </tr>
                    ))
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
          <div className="flex flex-wrap items-center gap-3">
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
            <label className="text-sm font-medium text-black dark:text-white">Term</label>
            <select
              value={rankingsTerm}
              onChange={(e) => setRankingsTerm(e.target.value)}
              className="h-9 w-48 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            >
              <option value="">All terms</option>
              {terms.map((t) => (
                <option key={t._id} value={t._id}>{t.name} {t.isCurrent ? "(Current)" : ""}</option>
              ))}
            </select>
          </div>

          <Card>
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-stroke px-5 py-4 dark:border-strokedark">
              <Trophy className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-black dark:text-white">
                {rankingsClass ? `${getClassName(rankingsClass)} — Rankings` : "Class Rankings"}
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
                              href={`/admin/results/report-card?studentId=${studentId}${rankingsTerm ? `&termId=${rankingsTerm}` : ""}`}
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

      {/* ── Publish tab ──────────────────────────────────────────────────── */}
      {tab === "publish" && <PublishResultsTab />}

      {/* ── Assign Marks modal ───────────────────────────────────────────── */}
      <Modal open={showAssign} onClose={() => { setShowAssign(false); setFormError(""); }} title="Assign Marks">
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Class</label>
            <select
              value={markForm.classId}
              onChange={(e) => setMarkForm({ studentId: "", subjectId: "", classId: e.target.value, caMarks: "", examMarks: "", termId: "" })}
              className={selectCls}
            >
              <option value="">Select a class</option>
              {(classes as Class[]).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Student</label>
            <select
              value={markForm.studentId}
              onChange={(e) => setMarkForm(f => ({ ...f, studentId: e.target.value }))}
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Subject</label>
            <select
              value={markForm.subjectId}
              onChange={(e) => setMarkForm(f => ({ ...f, subjectId: e.target.value }))}
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

          {(() => {
            const subj = (subjects as Subject[]).find((s) => s._id === markForm.subjectId);
            const caTotal = subj?.caTotal ?? 30;
            const examTotal = subj?.examTotal ?? 70;
            return (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={`CA Score (out of ${caTotal})`}
                  type="number"
                  min={0}
                  max={caTotal}
                  placeholder={`0–${caTotal}`}
                  value={markForm.caMarks}
                  onChange={(e) => setMarkForm(f => ({ ...f, caMarks: e.target.value }))}
                />
                <Input
                  label={`Exam Score (out of ${examTotal})`}
                  type="number"
                  min={0}
                  max={examTotal}
                  placeholder={`0–${examTotal}`}
                  value={markForm.examMarks}
                  onChange={(e) => setMarkForm(f => ({ ...f, examMarks: e.target.value }))}
                />
              </div>
            );
          })()}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Term (optional)</label>
            <select
              value={markForm.termId}
              onChange={(e) => setMarkForm(f => ({ ...f, termId: e.target.value }))}
              className={selectCls}
            >
              <option value="">No term specified</option>
              {terms.map((t) => (
                <option key={t._id} value={t._id}>{t.name} {t.isCurrent ? "(Current)" : ""}</option>
              ))}
            </select>
          </div>
          {formError && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button
              isLoading={assignMutation.isPending}
              onClick={() => {
                setFormError("");
                const payload: Record<string, unknown> = {
                  studentId: markForm.studentId,
                  subjectId: markForm.subjectId,
                  classId: markForm.classId,
                  caScore: Number(markForm.caMarks),
                  examScore: Number(markForm.examMarks),
                };
                if (markForm.termId) payload.termId = markForm.termId;
                assignMutation.mutate(payload);
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

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
      <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${w}%` }} />
    </div>
  );
}

// ─── Publish Results tab ──────────────────────────────────────────────────────

function PublishResultsTab() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");
  const [termId, setTermId]   = useState("");

  const { data: terms = [] }   = useQuery({ queryKey: ["admin-terms"],   queryFn: adminApi.getTerms });
  const { data: classes = [] } = useQuery({ queryKey: ["admin-classes"], queryFn: adminApi.getClasses });

  const statusQuery = useQuery({
    queryKey: ["publish-status", classId, termId],
    queryFn: () => adminApi.getResultPublishStatus(classId, termId),
    enabled: !!classId && !!termId,
  });

  const publishMutation = useMutation({
    mutationFn: () => adminApi.publishResults(classId, termId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publish-status", classId, termId] }),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => adminApi.unpublishResults(classId, termId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publish-status", classId, termId] }),
  });

  const status = statusQuery.data;
  const allPublished = !!status && status.total > 0 && status.published === status.total;
  const pct = status && status.total > 0 ? Math.round((status.published / status.total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-black dark:text-white">Class</label>
        <select className={selectCls + " w-56"} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select a class</option>
          {(classes as Class[]).map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <label className="text-sm font-medium text-black dark:text-white">Term</label>
        <select className={selectCls + " w-48"} value={termId} onChange={(e) => setTermId(e.target.value)}>
          <option value="">Select a term</option>
          {(terms as AcademicTerm[]).map((t) => (
            <option key={t._id} value={t._id}>{t.name} {t.isCurrent ? "(Current)" : ""}</option>
          ))}
        </select>
      </div>

      {/* Hint when not selected */}
      {(!classId || !termId) && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center py-10 text-center">
              <ChevronDown size={32} className="mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-body">Select a class and term to manage result visibility.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status card */}
      {classId && termId && (
        <Card>
          <CardContent>
            {statusQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : status ? (
              <div className="space-y-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-body">Published</p>
                    <p className="mt-1 text-3xl font-bold text-black dark:text-white">
                      {status.published} <span className="text-lg font-normal text-body">/ {status.total}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-body">{pct}% of results are visible to students</p>
                  </div>
                  {allPublished && (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-meta-3">
                      <CheckCircle2 size={18} /> All Published
                    </div>
                  )}
                </div>

                <ProgressBar value={status.published} max={status.total} />

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
                  Once published, students and parents will immediately see these results.
                </div>

                {status.total === 0 && (
                  <p className="text-center text-sm text-body">No results have been entered for this class and term yet.</p>
                )}

                {status.total > 0 && (
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => publishMutation.mutate()}
                      disabled={allPublished || publishMutation.isPending}
                    >
                      {publishMutation.isPending ? "Publishing…" : allPublished ? "All Published" : "Publish All Results"}
                    </Button>
                    {status.published > 0 && (
                      <Button
                        variant="secondary"
                        onClick={() => unpublishMutation.mutate()}
                        disabled={unpublishMutation.isPending}
                      >
                        {unpublishMutation.isPending ? "Unpublishing…" : "Unpublish Results"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-body">Could not load status.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
