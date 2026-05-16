import type { GradeEntry } from "@/lib/types";

export type GradeBadgeVariant = "default" | "success" | "warning" | "danger" | "info";

/**
 * Sierra Leone school letter scale — the standard default grading scale.
 * Pass mark is 50% (D is the lowest passing grade).
 */
export const SIERRA_LEONE_GRADE_SCALE: GradeEntry[] = [
  { grade: "A", minScore: 80, maxScore: 100, remark: "Excellent" },
  { grade: "B", minScore: 70, maxScore: 79,  remark: "Very Good" },
  { grade: "C", minScore: 60, maxScore: 69,  remark: "Credit / Good" },
  { grade: "D", minScore: 50, maxScore: 59,  remark: "Pass" },
  { grade: "E", minScore: 40, maxScore: 49,  remark: "Weak Pass" },
  { grade: "F", minScore: 0,  maxScore: 39,  remark: "Fail" },
];

/** Lowest passing percentage. */
export const PASS_MARK = 50;

function resolveEntry(
  scale: GradeEntry[] | null | undefined,
  pct: number,
): GradeEntry | undefined {
  const grades = scale && scale.length > 0 ? scale : SIERRA_LEONE_GRADE_SCALE;
  return grades.find((g) => pct >= g.minScore && pct <= g.maxScore);
}

/**
 * Resolve a grade letter from a percentage using the institute's grading scale.
 * Mirrors the backend `resolveGrade`. Falls back to the SL scale when no scale
 * is supplied.
 */
export function gradeFromScale(
  scale: GradeEntry[] | null | undefined,
  pct: number,
): string {
  return resolveEntry(scale, pct)?.grade ?? "F";
}

/** Resolve the remark for a percentage using the institute's grading scale. */
export function remarkFromScale(
  scale: GradeEntry[] | null | undefined,
  pct: number,
): string {
  return resolveEntry(scale, pct)?.remark ?? "";
}

/** Hex colour for a grade chip. Matches on the leading letter so suffixed grades work. */
export function gradeColor(grade?: string): string {
  if (!grade) return "#64748b";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "#10b981";
  if (g.startsWith("B")) return "#3c50e0";
  if (g.startsWith("C")) return "#0ea5e9";
  if (g.startsWith("D")) return "#f59e0b";
  if (g.startsWith("E")) return "#f97316";
  return "#ef4444";
}

/** Badge variant for a grade. */
export function gradeVariant(grade?: string): GradeBadgeVariant {
  if (!grade) return "default";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "success";
  if (g.startsWith("B") || g.startsWith("C")) return "info";
  if (g.startsWith("D") || g.startsWith("E")) return "warning";
  return "danger";
}
