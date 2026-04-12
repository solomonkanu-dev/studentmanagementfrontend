"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { errMsg } from "@/lib/utils/errMsg";
import { classApi } from "@/lib/api/class";
import { subjectApi } from "@/lib/api/subject";
import { adminApi } from "@/lib/api/admin";
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
import type { Class, Subject, AuthUser, Result } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeGrade(pct: number): { label: string; variant: "success" | "info" | "warning" | "danger" | "default" } {
  if (pct >= 90) return { label: "A+", variant: "success" };
  if (pct >= 80) return { label: "A",  variant: "success" };
  if (pct >= 70) return { label: "B",  variant: "info" };
  if (pct >= 60) return { label: "C",  variant: "warning" };
  if (pct >= 50) return { label: "D",  variant: "warning" };
  return { label: "F", variant: "danger" };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LecturerResultsPage() {
  const queryClient = useQueryClient();

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [totals, setTotals] = useState<Record<string, string>>({});
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      marksObtained,
      totalScore,
    }: {
      studentId: string;
      marksObtained: number;
      totalScore: number;
    }) =>
      adminApi.assignMarks({
        studentId,
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        marksObtained,
        totalScore,
        termId: effectiveTermId || undefined,
      }),
    onSuccess: (savedResult, vars) => {
      // Update the cache in-place — no refetch, no loading flash
      queryClient.setQueryData(
        ["class-results", selectedClassId],
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
      // Clear the input for this student so the row resets cleanly
      setMarks((prev) => { const next = { ...prev }; delete next[vars.studentId]; return next; });
      setTotals((prev) => { const next = { ...prev }; delete next[vars.studentId]; return next; });
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
    const rawMark = marks[student._id] ?? "";
    const rawTotal = totals[student._id] ?? "100";
    const marksObtained = Number(rawMark);
    const totalScore = Number(rawTotal);

    if (rawMark === "" || isNaN(marksObtained) || marksObtained < 0) {
      setErrors((prev) => ({
        ...prev,
        [student._id]: "Enter a valid marks value (≥ 0)",
      }));
      return;
    }
    if (!totalScore || totalScore <= 0) {
      setErrors((prev) => ({
        ...prev,
        [student._id]: "Total score must be > 0",
      }));
      return;
    }
    if (marksObtained > totalScore) {
      setErrors((prev) => ({
        ...prev,
        [student._id]: "Marks cannot exceed total score",
      }));
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[student._id];
      return next;
    });
    assignMarksMutation.mutate({ studentId: student._id, marksObtained, totalScore });
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
                onChange={(e) => {
                  setSelectedTermId(e.target.value);
                  setMarks({});
                  setTotals({});
                  setErrors({});
                  setSuccessIds(new Set());
                }}
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
                    setMarks({});
                    setTotals({});
                    setErrors({});
                    setSuccessIds(new Set());
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
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setMarks({});
                    setTotals({});
                    setErrors({});
                    setSuccessIds(new Set());
                  }}
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
                {classSubjects.find((s) => s._id === selectedSubjectId)?.name} — Assign Marks
                {effectiveTermId && (
                  <span className="ml-2 text-xs font-normal text-body">
                    · {(terms as AcademicTerm[]).find((t) => t._id === effectiveTermId)?.name}
                  </span>
                )}
              </h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHead>
                <tr>
                  <Th>Student</Th>
                  <Th>Current</Th>
                  <Th>Marks</Th>
                  <Th>Total</Th>
                  <Th>Grade</Th>
                  <Th>Actions</Th>
                </tr>
              </TableHead>
              <TableBody>
                {(students as AuthUser[]).map((s) => {
                  const existing = resultMap.get(s._id);
                  const marksVal = marks[s._id] ?? "";
                  const totalVal = totals[s._id] ?? "100";
                  const isSuccess = successIds.has(s._id);

                  // Preview grade from input or fall back to existing
                  let gradePreview: ReturnType<typeof computeGrade> | null = null;
                  if (marksVal !== "") {
                    const m = Number(marksVal);
                    const t = Number(totalVal) || 100;
                    if (!isNaN(m) && m >= 0 && m <= t) {
                      gradePreview = computeGrade(Math.round((m / t) * 100));
                    }
                  } else if (existing) {
                    const t = existing.totalScore ?? 100;
                    const pct = Math.round((existing.marksObtained / t) * 100);
                    gradePreview = existing.grade
                      ? { label: existing.grade, variant: computeGrade(pct).variant }
                      : computeGrade(pct);
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
                            {existing.marksObtained}/{existing.totalScore ?? 100}
                          </span>
                        ) : (
                          <span className="text-xs text-body">—</span>
                        )}
                      </Td>
                      <Td>
                        <div className="w-24">
                          <Input
                            type="number"
                            min={0}
                            placeholder="Marks"
                            value={marksVal}
                            onChange={(e) => {
                              setMarks((prev) => ({
                                ...prev,
                                [s._id]: e.target.value,
                              }));
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next[s._id];
                                return next;
                              });
                              setSuccessIds((prev) => {
                                const next = new Set(prev);
                                next.delete(s._id);
                                return next;
                              });
                            }}
                            error={errors[s._id]}
                          />
                        </div>
                      </Td>
                      <Td>
                        <div className="w-20">
                          <Input
                            type="number"
                            min={1}
                            placeholder="100"
                            value={totalVal}
                            onChange={(e) =>
                              setTotals((prev) => ({
                                ...prev,
                                [s._id]: e.target.value,
                              }))
                            }
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
