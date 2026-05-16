"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { errMsg } from "@/lib/utils/errMsg";
import { classApi } from "@/lib/api/class";
import { subjectApi } from "@/lib/api/subject";
import { adminApi } from "@/lib/api/admin";
import { gradingApi } from "@/lib/api/grading";
import { gradeFromScale, gradeVariant } from "@/lib/utils/grading";
import type { AcademicTerm } from "@/lib/api/admin";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Table,
  TableHead,
  TableBody,
  Th,
  Td,
} from "@/components/ui/Table";
import {
  FileText,
  GraduationCap,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import type { Class, Subject, AuthUser, Result } from "@/lib/types";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LecturerResultsPage() {
  const queryClient = useQueryClient();

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [caMarks, setCaMarks] = useState<Record<string, string>>({});
  const [examMarks, setExamMarks] = useState<Record<string, string>>({});
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function resetEntry() {
    setCaMarks({});
    setExamMarks({});
    setErrors({});
    setSuccessIds(new Set());
  }

  // ── Data fetching ────────────────────────────────────────────────────────────

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["lecturer-classes"],
    queryFn: classApi.getForLecturer,
  });

  const { data: allSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["lecturer-subjects"],
    queryFn: subjectApi.getForLecturer,
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["class-students", selectedClassId],
    queryFn: () => classApi.getStudents(selectedClassId),
    enabled: !!selectedClassId,
  });

  const { data: terms = [] } = useQuery({
    queryKey: ["terms"],
    queryFn: adminApi.getTerms,
  });

  const { data: defaultScale } = useQuery({
    queryKey: ["grading-default"],
    queryFn: gradingApi.getDefault,
  });

  // Default to current term on first load
  const currentTerm = (terms as AcademicTerm[]).find((t) => t.isCurrent);
  const effectiveTermId = selectedTermId || currentTerm?._id || "";

  const { data: existingResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["class-results", selectedClassId, effectiveTermId],
    queryFn: () => adminApi.getResultsByClass(selectedClassId, effectiveTermId || undefined),
    enabled: !!selectedClassId,
  });

  // Filter subjects to those belonging to the selected class
  const classSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    return (allSubjects as Subject[]).filter((s) => {
      const cid =
        typeof s.class === "string" ? s.class : (s.class as Class)._id;
      return cid === selectedClassId;
    });
  }, [allSubjects, selectedClassId]);

  const selectedSubject = classSubjects.find((s) => s._id === selectedSubjectId);
  const caTotal = selectedSubject?.caTotal ?? 30;
  const examTotal = selectedSubject?.examTotal ?? 70;
  const combinedTotal = caTotal + examTotal;

  // Build a lookup: studentId → result for the selected subject
  const resultMap = useMemo(() => {
    const map = new Map<string, Result>();
    (existingResults as Result[]).forEach((r) => {
      if (!r.subject || !r.student) return;
      const subjectId =
        typeof r.subject === "string" ? r.subject : (r.subject as Subject)._id;
      if (subjectId !== selectedSubjectId) return;
      const studentId =
        typeof r.student === "string" ? r.student : (r.student as AuthUser)._id;
      map.set(studentId, r);
    });
    return map;
  }, [existingResults, selectedSubjectId]);

  // ── Mutation ─────────────────────────────────────────────────────────────────

  const assignMarksMutation = useMutation({
    mutationFn: ({
      studentId,
      caScore,
      examScore,
    }: {
      studentId: string;
      caScore: number;
      examScore: number;
    }) =>
      adminApi.assignMarks({
        studentId,
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        caScore,
        examScore,
        termId: effectiveTermId || undefined,
      }),
    onSuccess: (savedResult, vars) => {
      // Update the cache in-place — no refetch, no loading flash
      queryClient.setQueryData(
        ["class-results", selectedClassId, effectiveTermId],
        (old: Result[] = []) => {
          const exists = old.some((r) => {
            if (!r.student || !r.subject) return false;
            const sid = typeof r.student === "string" ? r.student : (r.student as AuthUser)._id;
            const subid = typeof r.subject === "string" ? r.subject : (r.subject as Subject)._id;
            return sid === vars.studentId && subid === selectedSubjectId;
          });
          if (exists) {
            return old.map((r) => {
              if (!r.student || !r.subject) return r;
              const sid = typeof r.student === "string" ? r.student : (r.student as AuthUser)._id;
              const subid = typeof r.subject === "string" ? r.subject : (r.subject as Subject)._id;
              return sid === vars.studentId && subid === selectedSubjectId ? savedResult : r;
            });
          }
          return [...old, savedResult];
        },
      );
      setCaMarks((prev) => { const next = { ...prev }; delete next[vars.studentId]; return next; });
      setExamMarks((prev) => { const next = { ...prev }; delete next[vars.studentId]; return next; });
      setSuccessIds((prev) => new Set([...prev, vars.studentId]));
    },
    onError: (err, vars) => {
      setErrors((prev) => ({
        ...prev,
        [vars.studentId]: errMsg(err, "Failed to save mark"),
      }));
    },
  });

  const handleSubmitMark = (student: AuthUser) => {
    const rawCa = caMarks[student._id] ?? "";
    const rawExam = examMarks[student._id] ?? "";
    const caScore = Number(rawCa);
    const examScore = Number(rawExam);

    const setErr = (msg: string) =>
      setErrors((prev) => ({ ...prev, [student._id]: msg }));

    if (rawCa === "" || isNaN(caScore) || caScore < 0) {
      setErr(`Enter a valid CA score (0–${caTotal})`);
      return;
    }
    if (rawExam === "" || isNaN(examScore) || examScore < 0) {
      setErr(`Enter a valid Exam score (0–${examTotal})`);
      return;
    }
    if (caScore > caTotal) { setErr(`CA cannot exceed ${caTotal}`); return; }
    if (examScore > examTotal) { setErr(`Exam cannot exceed ${examTotal}`); return; }

    setErrors((prev) => {
      const next = { ...prev };
      delete next[student._id];
      return next;
    });
    assignMarksMutation.mutate({ studentId: student._id, caScore, examScore });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-black dark:text-white">
        Results
      </h1>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end flex-wrap">
            {/* Term selector */}
            <div className="flex flex-col gap-1.5 flex-1 max-w-xs">
              <label className="text-sm font-medium text-black dark:text-white">Term</label>
              <select
                value={selectedTermId}
                onChange={(e) => { setSelectedTermId(e.target.value); resetEntry(); }}
                className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              >
                <option value="">All Terms</option>
                {(terms as AcademicTerm[]).map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} {t.isCurrent ? "(current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Class selector */}
            <div className="flex flex-col gap-1.5 flex-1 max-w-xs">
              <label className="text-sm font-medium text-black dark:text-white">
                Class
              </label>
              {classesLoading ? (
                <div className="h-9 animate-pulse rounded border border-stroke bg-stroke dark:border-strokedark dark:bg-strokedark" />
              ) : (
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSubjectId("");
                    resetEntry();
                  }}
                  className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                >
                  <option value="">Select a class</option>
                  {(classes as Class[]).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Subject selector */}
            <div className="flex flex-col gap-1.5 flex-1 max-w-xs">
              <label className="text-sm font-medium text-black dark:text-white">
                Subject
              </label>
              {subjectsLoading ? (
                <div className="h-9 animate-pulse rounded border border-stroke bg-stroke dark:border-strokedark dark:bg-strokedark" />
              ) : (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => { setSelectedSubjectId(e.target.value); resetEntry(); }}
                  disabled={!selectedClassId || classSubjects.length === 0}
                  className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                >
                  <option value="">
                    {!selectedClassId
                      ? "Select a class first"
                      : classSubjects.length === 0
                      ? "No subjects for this class"
                      : "Select a subject"}
                  </option>
                  {classSubjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                      {s.code ? ` (${s.code})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student marks table */}
      {!selectedClassId || !selectedSubjectId ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <FileText className="h-10 w-10 text-body" aria-hidden="true" />
          <p className="text-sm font-medium text-black dark:text-white">
            Select a class and subject to manage results
          </p>
        </div>
      ) : studentsLoading || resultsLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : (students as AuthUser[]).length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <GraduationCap className="h-10 w-10 text-body" aria-hidden="true" />
          <p className="text-sm text-body">No students in this class.</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <h2 className="text-sm font-semibold text-black dark:text-white">
                {selectedSubject?.name} — Assign Marks
                {effectiveTermId && (
                  <span className="ml-2 text-xs font-normal text-body">
                    · {(terms as AcademicTerm[]).find((t) => t._id === effectiveTermId)?.name}
                  </span>
                )}
                <span className="ml-2 text-xs font-normal text-body">
                  · CA /{caTotal} · Exam /{examTotal}
                </span>
              </h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHead>
                <tr>
                  <Th>Student</Th>
                  <Th>Current</Th>
                  <Th>CA /{caTotal}</Th>
                  <Th>Exam /{examTotal}</Th>
                  <Th>Grade</Th>
                  <Th>Actions</Th>
                </tr>
              </TableHead>
              <TableBody>
                {(students as AuthUser[]).map((s) => {
                  const existing = resultMap.get(s._id);
                  const caVal = caMarks[s._id] ?? "";
                  const examVal = examMarks[s._id] ?? "";
                  const isSuccess = successIds.has(s._id);

                  // Preview grade from input or fall back to the stored grade
                  let gradePreview: { label: string; variant: ReturnType<typeof gradeVariant> } | null = null;
                  if (caVal !== "" && examVal !== "") {
                    const ca = Number(caVal);
                    const exam = Number(examVal);
                    if (!isNaN(ca) && !isNaN(exam) && ca >= 0 && exam >= 0 && ca <= caTotal && exam <= examTotal) {
                      const label = gradeFromScale(defaultScale?.grades, Math.round(((ca + exam) / combinedTotal) * 100));
                      gradePreview = { label, variant: gradeVariant(label) };
                    }
                  } else if (existing) {
                    const t = existing.totalScore ?? 100;
                    const pct = Math.round((existing.marksObtained / t) * 100);
                    const label = existing.grade ?? gradeFromScale(defaultScale?.grades, pct);
                    gradePreview = { label, variant: gradeVariant(label) };
                  }

                  return (
                    <tr
                      key={s._id}
                      className="hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                            {s.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-black dark:text-white">
                              {s.fullName}
                            </p>
                            <p className="text-xs text-body">{s.email}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        {existing ? (
                          <span className="text-sm text-body">
                            {existing.caScore != null && existing.examScore != null
                              ? `CA ${existing.caScore} · Exam ${existing.examScore}`
                              : `${existing.marksObtained}/${existing.totalScore ?? 100}`}
                          </span>
                        ) : (
                          <span className="text-xs text-body">—</span>
                        )}
                      </Td>
                      <Td>
                        <div className="w-20">
                          <Input
                            type="number"
                            min={0}
                            max={caTotal}
                            placeholder={`0–${caTotal}`}
                            value={caVal}
                            onChange={(e) => {
                              setCaMarks((prev) => ({ ...prev, [s._id]: e.target.value }));
                              setErrors((prev) => { const n = { ...prev }; delete n[s._id]; return n; });
                              setSuccessIds((prev) => { const n = new Set(prev); n.delete(s._id); return n; });
                            }}
                            error={errors[s._id]}
                          />
                        </div>
                      </Td>
                      <Td>
                        <div className="w-20">
                          <Input
                            type="number"
                            min={0}
                            max={examTotal}
                            placeholder={`0–${examTotal}`}
                            value={examVal}
                            onChange={(e) => {
                              setExamMarks((prev) => ({ ...prev, [s._id]: e.target.value }));
                              setErrors((prev) => { const n = { ...prev }; delete n[s._id]; return n; });
                              setSuccessIds((prev) => { const n = new Set(prev); n.delete(s._id); return n; });
                            }}
                          />
                        </div>
                      </Td>
                      <Td>
                        {gradePreview ? (
                          <Badge variant={gradePreview.variant}>
                            {gradePreview.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-body">—</span>
                        )}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          {isSuccess ? (
                            <span className="flex items-center gap-1 text-xs text-meta-3">
                              <CheckCircle2
                                className="h-3.5 w-3.5 shrink-0"
                                aria-hidden="true"
                              />
                              Saved
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSubmitMark(s)}
                              isLoading={
                                assignMarksMutation.isPending &&
                                (
                                  assignMarksMutation.variables as
                                    | { studentId: string }
                                    | undefined
                                )?.studentId === s._id
                              }
                            >
                              Save
                            </Button>
                          )}
                          <Link
                            href={`/lecturer/results/report-card?studentId=${s._id}${effectiveTermId ? `&termId=${effectiveTermId}` : ""}`}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Report Card
                          </Link>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
