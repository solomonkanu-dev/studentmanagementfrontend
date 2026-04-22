import { z } from "zod";
import type { AuthUser } from "@/lib/types";

// Single schema shared by both create and edit forms (fields are identical)
export const studentSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email"),
  classId: z.string().min(1, "Select a class"),
  registrationNumber: z.string().optional(),
  dateOfAdmission: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  religion: z.string().optional(),
  previousSchool: z.string().optional(),
  familyType: z.string().optional(),
  medicalInfo: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  guardianRelationship: z.string().optional(),
  guardianOccupation: z.string().optional(),
});

export type StudentForm = z.infer<typeof studentSchema>;

// ─── Profile / guardian builders ─────────────────────────────────────────────

export function buildStudentProfile(v: StudentForm) {
  const p: Record<string, unknown> = {};
  if (v.registrationNumber) p.registrationNumber = v.registrationNumber;
  if (v.dateOfAdmission) p.dateOfAdmission = v.dateOfAdmission;
  if (v.dateOfBirth) p.dateOfBirth = v.dateOfBirth;
  if (v.gender) p.gender = v.gender;
  if (v.mobileNumber) p.mobileNumber = v.mobileNumber;
  if (v.address) p.address = v.address;
  if (v.bloodGroup) p.bloodGroup = v.bloodGroup;
  if (v.religion) p.religion = v.religion;
  if (v.previousSchool) p.previousSchool = v.previousSchool;
  if (v.familyType) p.familyType = v.familyType;
  if (v.medicalInfo) p.medicalInfo = v.medicalInfo;
  return p;
}

export function buildGuardian(v: StudentForm) {
  if (!v.guardianName && !v.guardianPhone) return undefined;
  return {
    guardianName: v.guardianName || undefined,
    guardianPhone: v.guardianPhone || undefined,
    guardianEmail: v.guardianEmail || undefined,
    guardianRelationship: v.guardianRelationship || undefined,
    guardianOccupation: v.guardianOccupation || undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function nextRegistrationNumber(list: AuthUser[]) {
  const nums = list.flatMap((s) => {
    const id = s.studentProfile?.registrationNumber ?? "";
    const m = id.match(/(\d+)$/);
    return m ? [parseInt(m[1], 10)] : [];
  });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `STU-${String(max + 1).padStart(3, "0")}`;
}
