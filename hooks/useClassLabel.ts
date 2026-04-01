import { useAuth } from "@/context/AuthContext";
import type { SchoolType } from "@/lib/types";

/**
 * Returns the correct terminology for "class" based on the institution's school type.
 * Primary schools use "Class / Classes", secondary schools use "Form / Forms".
 */
export function useClassLabel() {
  const { user } = useAuth();

  const inst = user?.institute;
  const schoolType: SchoolType =
    typeof inst === "object" && inst?.schoolType ? inst.schoolType : "secondary";

  const isPrimary = schoolType === "primary";

  return {
    /** "Class" or "Form" */
    label: isPrimary ? "Class" : "Form",
    /** "Classes" or "Forms" */
    plural: isPrimary ? "Classes" : "Forms",
    /** "class" or "form" (lowercase) */
    lower: isPrimary ? "class" : "form",
    /** "classes" or "forms" (lowercase plural) */
    lowerPlural: isPrimary ? "classes" : "forms",
    schoolType,
  };
}
