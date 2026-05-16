import type { FeeStructure } from "@/lib/types";

export function SelectField({
  label,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-black dark:text-white">{label}</label>
      <select
        className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-meta-1">{error}</p>}
    </div>
  );
}

export function termLabel(s: FeeStructure): string {
  if (!s.termId) return "—";
  if (typeof s.termId === "object") return `${s.termId.name} (${s.termId.academicYear})`;
  return String(s.termId);
}

export function categoryLabel(s: FeeStructure): string {
  if (s.category === "class") {
    const cls = s.classId;
    return `Class: ${typeof cls === "object" && cls ? cls.name : cls ?? "—"}`;
  }
  if (s.category === "student") {
    const st = s.studentId;
    return `Student: ${typeof st === "object" && st ? st.fullName : st ?? "—"}`;
  }
  return "All Students";
}
