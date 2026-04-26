/**
 * Utilities for grouping fee records by academic term / year.
 * Used by parent/fees/page.tsx and parent/page.tsx.
 */

interface FeeWithTermInfo {
  dueDate?: string;
  termId?: string | { _id: string; name: string; academicYear: string };
  termName?: string;
  academicYear?: string;
}

/**
 * Derives an academic year string (e.g. "2024/2025") from a date string.
 * Convention: Jan–Aug belong to the *ending* year of the prior cohort,
 * so a due date of 2025-03-15 → "2024/2025".
 */
export function dueDateToAcademicYear(dueDate: string): string {
  const d = new Date(dueDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-indexed
  if (month <= 8) {
    // Jan–Aug: belongs to the year that started the previous calendar year
    return `${year - 1}/${year}`;
  }
  // Sep–Dec: belongs to the year starting now
  return `${year}/${year + 1}`;
}

/**
 * Returns a human-readable term label for a fee record.
 * Priority:
 *  1. fee.termName (flat string from backend)
 *  2. populated fee.termId object → "Term 1 (2024/2025)"
 *  3. fee.academicYear → "Academic Year 2024/2025"
 *  4. fee.dueDate → derived academic year
 *  5. "Unassigned"
 */
export function getFeeTermLabel(fee: FeeWithTermInfo): string {
  if (fee.termName) return fee.termName;
  if (fee.termId && typeof fee.termId === "object") {
    return `${fee.termId.name} (${fee.termId.academicYear})`;
  }
  if (fee.academicYear) return `Academic Year ${fee.academicYear}`;
  if (fee.dueDate) return `Academic Year ${dueDateToAcademicYear(fee.dueDate)}`;
  return "Unassigned";
}

/**
 * Groups an array of fee records by their term label.
 * Order: named terms first (sorted by label), then year-derived labels, "Unassigned" last.
 * When only one group exists, callers should suppress the section heading.
 */
export function groupFeesByTerm<T extends FeeWithTermInfo>(fees: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const fee of fees) {
    const label = getFeeTermLabel(fee);
    const existing = map.get(label);
    if (existing) {
      existing.push(fee);
    } else {
      map.set(label, [fee]);
    }
  }

  // Sort: "Unassigned" always last; everything else alphabetically
  const sorted = new Map<string, T[]>(
    [...map.entries()].sort(([a], [b]) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    })
  );

  return sorted;
}
