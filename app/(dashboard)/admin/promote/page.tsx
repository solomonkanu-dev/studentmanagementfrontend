"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { errMsg } from "@/lib/utils/errMsg";
import { adminApi } from "@/lib/api/admin";
import type { PromotionEligibilityEntry } from "@/lib/api/admin";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowRight,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  XCircle,
  Users,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Class } from "@/lib/types";

type Step = "select" | "review" | "done";

const FLAG_META: Record<
  "grades" | "fees" | "attendance",
  { label: string; color: string; bgColor: string }
> = {
  grades: { label: "Low Grades", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-400/10" },
  fees: { label: "Unpaid Fees", color: "text-meta-1", bgColor: "bg-meta-1/10" },
  attendance: { label: "Low Attendance", color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-400/10" },
};

export default function PromotePage() {
  const [step, setStep] = useState<Step>("select");
  const [sourceClassId, setSourceClassId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ promoted: number; sourceClass: string; targetClass: string } | null>(null);
  const [gradeThreshold, setGradeThreshold] = useState(50);
  const [attendanceThreshold, setAttendanceThreshold] = useState(75);
  const [showThresholds, setShowThresholds] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ["admin-classes"],
    queryFn: adminApi.getClasses,
  });

  const { data: eligibility = [], isLoading: eligibilityLoading } = useQuery({
    queryKey: ["promotion-eligibility", sourceClassId, gradeThreshold, attendanceThreshold],
    queryFn: () =>
      adminApi.getPromotionEligibility(sourceClassId, { gradeThreshold, attendanceThreshold }),
    enabled: !!sourceClassId && step === "review",
  });

  const promoteMutation = useMutation({
    mutationFn: adminApi.bulkPromote,
    onSuccess: (data) => {
      setResult({ promoted: data.promoted, sourceClass: data.sourceClass, targetClass: data.targetClass });
      setStep("done");
    },
  });

  const typedClasses = classes as Class[];
  const typedEligibility = eligibility as PromotionEligibilityEntry[];

  const included = typedEligibility.filter((s) => !excluded.has(s._id));
  const flaggedCount = typedEligibility.filter((s) => !s.clearForPromotion).length;
  const clearCount = typedEligibility.filter((s) => s.clearForPromotion).length;

  function toggleExclude(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    promoteMutation.mutate({
      sourceClassId,
      targetClassId,
      studentIds: included.map((s) => s._id),
    });
  }

  function reset() {
    setStep("select");
    setSourceClassId("");
    setTargetClassId("");
    setExcluded(new Set());
    setResult(null);
    promoteMutation.reset();
  }

  const sourceClass = typedClasses.find((c) => c._id === sourceClassId);
  const targetClass = typedClasses.find((c) => c._id === targetClassId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white">Bulk Promotion</h1>
          <p className="text-sm text-body">Promote an entire class to the next level</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["select", "review", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-4 w-4 text-body" />}
            <span
              className={[
                "rounded-full px-3 py-1 font-medium capitalize",
                step === s
                  ? "bg-primary text-white"
                  : i < ["select", "review", "done"].indexOf(step)
                  ? "bg-meta-3/20 text-meta-3"
                  : "bg-stroke text-body dark:bg-strokedark",
              ].join(" ")}
            >
              {i + 1}. {s}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step 1: Select classes ── */}
      {step === "select" && (
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-black dark:text-white">Select Classes</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                  From (Source Class)
                </label>
                <select
                  value={sourceClassId}
                  onChange={(e) => { setSourceClassId(e.target.value); setExcluded(new Set()); }}
                  className="w-full rounded-xl border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
                >
                  <option value="">Select source class…</option>
                  {typedClasses.map((c) => (
                    <option key={c._id} value={c._id} disabled={c._id === targetClassId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                  To (Target Class)
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full rounded-xl border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
                >
                  <option value="">Select target class…</option>
                  {typedClasses.map((c) => (
                    <option key={c._id} value={c._id} disabled={c._id === sourceClassId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Threshold settings */}
            <div className="rounded-xl border border-stroke dark:border-strokedark">
              <button
                onClick={() => setShowThresholds((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-black dark:text-white"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-body" />
                  Eligibility Thresholds
                </span>
                {showThresholds ? <ChevronUp className="h-4 w-4 text-body" /> : <ChevronDown className="h-4 w-4 text-body" />}
              </button>
              {showThresholds && (
                <div className="grid gap-4 border-t border-stroke px-4 pb-4 pt-3 dark:border-strokedark sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-black dark:text-white">
                      Minimum Grade Average (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={gradeThreshold}
                      onChange={(e) => setGradeThreshold(Number(e.target.value))}
                      className="w-full rounded-xl border border-stroke bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
                    />
                    <p className="mt-1 text-[11px] text-body">Students below this average will be flagged</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-black dark:text-white">
                      Minimum Attendance Rate (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={attendanceThreshold}
                      onChange={(e) => setAttendanceThreshold(Number(e.target.value))}
                      className="w-full rounded-xl border border-stroke bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
                    />
                    <p className="mt-1 text-[11px] text-body">Students below this rate will be flagged</p>
                  </div>
                </div>
              )}
            </div>

            {sourceClassId && targetClassId && (
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <span className="font-semibold text-black dark:text-white">{sourceClass?.name}</span>
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="font-semibold text-black dark:text-white">{targetClass?.name}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep("review")}
                disabled={!sourceClassId || !targetClassId}
              >
                Check Eligibility
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Review with eligibility ── */}
      {step === "review" && (
        <div className="space-y-4">
          {/* Summary bar */}
          {!eligibilityLoading && typedEligibility.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-meta-3/30 bg-meta-3/10 px-4 py-3">
                <CheckCircle className="h-5 w-5 text-meta-3 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-meta-3">{clearCount}</p>
                  <p className="text-xs text-body">Clear for promotion</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-yellow-300/40 bg-yellow-50 dark:bg-yellow-400/10 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{flaggedCount}</p>
                  <p className="text-xs text-body">Flagged</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-stroke bg-white dark:border-strokedark dark:bg-boxdark px-4 py-3">
                <Users className="h-5 w-5 text-body shrink-0" />
                <div>
                  <p className="text-lg font-bold text-black dark:text-white">{included.length}</p>
                  <p className="text-xs text-body">Selected to promote</p>
                </div>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-black dark:text-white">
                  Eligibility Check — {sourceClass?.name} → {targetClass?.name}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setExcluded(new Set())}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => setExcluded(new Set(typedEligibility.map((s) => s._id)))}
                    className="text-xs font-medium text-meta-1 hover:underline"
                  >
                    Deselect all
                  </button>
                  <button
                    onClick={() => {
                      // Deselect only flagged students
                      const flagged = typedEligibility.filter((s) => !s.clearForPromotion).map((s) => s._id);
                      setExcluded(new Set(flagged));
                    }}
                    className="text-xs font-medium text-yellow-600 dark:text-yellow-400 hover:underline"
                  >
                    Exclude flagged
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {eligibilityLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
                </div>
              ) : typedEligibility.length === 0 ? (
                <p className="py-8 text-center text-sm text-body">No students found in this class.</p>
              ) : (
                <div className="divide-y divide-stroke dark:divide-strokedark">
                  {typedEligibility.map((student) => {
                    const isExcluded = excluded.has(student._id);
                    const activeFlags = (["grades", "fees", "attendance"] as const).filter(
                      (k) => student.flags[k].flagged
                    );
                    return (
                      <label
                        key={student._id}
                        className={[
                          "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors",
                          !isExcluded && !student.clearForPromotion
                            ? "bg-yellow-50/60 dark:bg-yellow-400/5"
                            : "",
                          isExcluded ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => toggleExclude(student._id)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-stroke accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-medium ${isExcluded ? "line-through text-body" : "text-black dark:text-white"}`}>
                              {student.fullName}
                            </p>
                            {student.clearForPromotion && !isExcluded && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-meta-3">
                                <CheckCircle className="h-3 w-3" /> Clear
                              </span>
                            )}
                            {isExcluded && (
                              <Badge variant="danger">Excluded</Badge>
                            )}
                          </div>
                          <p className="text-xs text-body">{student.email}</p>

                          {/* Flag pills */}
                          {activeFlags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {activeFlags.map((key) => {
                                const meta = FLAG_META[key];
                                const f = student.flags[key];
                                let detail = "";
                                if (key === "grades") { const gf = f as typeof student.flags.grades; detail = `${gf.average ?? "N/A"}% avg (min ${gf.threshold}%)`; }
                                if (key === "fees") detail = `NLe ${(f as typeof student.flags.fees).balance.toLocaleString()} outstanding`;
                                if (key === "attendance") { const af = f as typeof student.flags.attendance; detail = `${af.rate ?? "N/A"}% rate (min ${af.threshold}%)`; }
                                return (
                                  <span
                                    key={key}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.color} ${meta.bgColor}`}
                                  >
                                    <XCircle className="h-3 w-3" />
                                    {meta.label}: {detail}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Mini scorecard */}
                        <div className="shrink-0 flex gap-3 text-[11px] text-body">
                          <span title="Grade average">
                            📊 {student.flags.grades.average != null ? `${student.flags.grades.average}%` : "—"}
                          </span>
                          <span title="Attendance rate">
                            📅 {student.flags.attendance.rate != null ? `${student.flags.attendance.rate}%` : "—"}
                          </span>
                          <span title="Fee balance">
                            💰 {student.flags.fees.balance > 0 ? `NLe ${student.flags.fees.balance.toLocaleString()}` : "✓"}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flagged warning */}
          {included.some((s) => !s.clearForPromotion) && (
            <div className="flex items-start gap-3 rounded-xl border border-yellow-300/40 bg-yellow-50 dark:bg-yellow-400/10 px-4 py-3">
              <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-500 shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <span className="font-semibold">
                  {included.filter((s) => !s.clearForPromotion).length} flagged student(s)
                </span>{" "}
                are included. You can still promote them — this is an advisory check only.
              </p>
            </div>
          )}

          {promoteMutation.isError && (
            <div className="flex items-center gap-2 rounded-xl border border-meta-1/30 bg-meta-1/10 px-4 py-3 text-sm text-meta-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errMsg(promoteMutation.error, "Promotion failed")}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setStep("select")}>
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={included.length === 0 || promoteMutation.isPending}
            >
              {promoteMutation.isPending
                ? "Promoting…"
                : `Promote ${included.length} Student${included.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === "done" && result && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-meta-3/10">
              <CheckCircle className="h-8 w-8 text-meta-3" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-black dark:text-white">Promotion Complete</p>
              <p className="mt-1 text-sm text-body">
                {result.promoted} student{result.promoted !== 1 ? "s" : ""} successfully promoted from{" "}
                <span className="font-semibold text-black dark:text-white">{result.sourceClass}</span> to{" "}
                <span className="font-semibold text-black dark:text-white">{result.targetClass}</span>.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-body">
              <Users className="h-4 w-4" />
              All historical records remain linked to the original class.
            </div>
            <Button onClick={reset}>Promote Another Class</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
