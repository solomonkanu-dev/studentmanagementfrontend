import { apiClient } from "./client";
import type { AuthUser, Institute, Class, Result, FeeSummary, FeeByClass, FeeByStatus, FeeDefaulter, FeeCollectionTrend } from "../types";

export interface AcademicTerm {
  _id: string;
  name: string;
  type: "term" | "semester";
  academicYear: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  institute: string;
  createdAt: string;
}

export interface PromotionEligibilityEntry {
  _id: string;
  fullName: string;
  email: string;
  lifecycleStatus?: string;
  flags: {
    grades: { flagged: boolean; average: number | null; threshold: number; subjectCount: number };
    fees: { flagged: boolean; balance: number };
    attendance: { flagged: boolean; rate: number | null; threshold: number };
  };
  clearForPromotion: boolean;
}

export const adminApi = {
  // Students
  getStudents: async (): Promise<AuthUser[]> => {
    const { data } = await apiClient.get("/admin/students");
    return data.data ?? data;
  },
  getStudent: async (id: string): Promise<AuthUser> => {
    const { data } = await apiClient.get(`/admin/students/${id}`);
    return data.data ?? data;
  },
  getStudentAssignments: async (studentId: string): Promise<{ assignment: import("../types").Assignment; submission: { _id: string; status: string; score?: number; feedback?: string; isLate?: boolean; createdAt: string } | null }[]> => {
    const { data } = await apiClient.get(`/admin/students/${studentId}/assignments`);
    return data.data ?? data;
  },
  createStudent: async (payload: Record<string, unknown>): Promise<AuthUser> => {
    const { data } = await apiClient.post("/admin/create-student", payload);
    return data.data ?? data;
  },

  // Lecturers
  getLecturers: async (): Promise<AuthUser[]> => {
    const { data } = await apiClient.get("/admin/lecturers");
    return data.data ?? data;
  },
  getLecturer: async (id: string): Promise<AuthUser> => {
    const { data } = await apiClient.get(`/admin/lecturers/${id}`);
    return data.data ?? data;
  },
  createLecturer: async (payload: Record<string, unknown>): Promise<AuthUser> => {
    const { data } = await apiClient.post("/admin/create-lecturer", payload);
    return data.data ?? data;
  },

  // Classes
  getClasses: async (): Promise<Class[]> => {
    const { data } = await apiClient.get("/admin/classes");
    return data.data ?? data;
  },
  getClass: async (id: string): Promise<Class> => {
    const { data } = await apiClient.get(`/admin/classes/${id}`);
    return data.data ?? data;
  },
  getClassStudents: async (classId: string): Promise<AuthUser[]> => {
    const { data } = await apiClient.get(`/admin/classes/${classId}/students`);
    return data.data ?? data;
  },
  getClassesWithSubjects: async () => {
    const { data } = await apiClient.get("/admin/class/class-with-subjects");
    return data.data ?? data;
  },

  // Institute
  getMyInstitute: async (): Promise<Institute | null> => {
    try {
      const { data } = await apiClient.get("/admin/my-institute");
      return data.data ?? data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw err;
    }
  },
  createInstitute: async (payload: Record<string, unknown>): Promise<Institute> => {
    const { data } = await apiClient.post("/admin/create-institute", payload);
    return data.data ?? data;
  },
  updateInstitute: async (payload: Partial<Institute>): Promise<Institute> => {
    const { data } = await apiClient.put("/admin/my-institute/update", payload);
    return data.data ?? data;
  },

  // Results
  getClassRankings: async (classId: string): Promise<{ rankings: Array<{ student: AuthUser; total: number; subjects: number; rank: number }>; total: number }> => {
    const { data } = await apiClient.get(`/admin/results/class/${classId}/rankings`);
    return data.data ?? data;
  },
  getResultsByClass: async (classId: string): Promise<Result[]> => {
    const { data } = await apiClient.get(`/admin/results/class/${classId}`);
    return data.data ?? data;
  },
  getResultsBySubject: async (subjectId: string): Promise<Result[]> => {
    const { data } = await apiClient.get(`/admin/results/subject/${subjectId}`);
    return data.data ?? data;
  },
  assignMarks: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post("/admin/result/assign-marks", payload);
    return data.data ?? data;
  },

  // Assignments
  getAssignments: async () => {
    const { data } = await apiClient.get("/admin/assignments");
    return data.data ?? data;
  },

  // Fees
  createFees: async (payload: Record<string, unknown>[]) => {
    const { data } = await apiClient.post("/admin/fees/create", payload);
    return data.data ?? data;
  },
  getFeeStructuresForStudent: async (studentId: string): Promise<{ _id: string; category: string; particulars: { label: string; amount: number }[] }[]> => {
    const { data } = await apiClient.get(`/admin/fees/structures/for-student/${studentId}`);
    return (data.structures ?? data.data ?? data) as { _id: string; category: string; particulars: { label: string; amount: number }[] }[];
  },
  assignFeeToStudent: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post("/admin/fees/assign", payload);
    return data.data ?? data;
  },
  assignFeeToClass: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post("/admin/fees/assign/class", payload);
    return data.data ?? data;
  },
  getStudentFees: async (): Promise<unknown[]> => {
    const { data } = await apiClient.get("/admin/fees/students");
    return data.data ?? data;
  },
  getStudentFee: async (studentId: string): Promise<unknown> => {
    const { data } = await apiClient.get(`/admin/fees/student/${studentId}`);
    return data.data ?? data;
  },

  // Report Card
  getReportCard: async (studentId: string) => {
    const { data } = await apiClient.get(`/admin/report-card/${studentId}`);
    return data;
  },

  // Fee Payments
  recordPayment: async (studentId: string, payload: { amount: number; method: string; reference?: string; notes?: string }) => {
    const { data } = await apiClient.post(`/admin/fees/student/${studentId}/payment`, payload);
    return data;
  },
  getStudentPayments: async (studentId: string) => {
    const { data } = await apiClient.get(`/admin/fees/student/${studentId}/payments`);
    return Array.isArray(data) ? data : data.data ?? [];
  },
  getPaymentReceipt: async (paymentId: string) => {
    const { data } = await apiClient.get(`/admin/fees/payment/${paymentId}/receipt`);
    return data;
  },

  // Update
  updateStudent: async (id: string, payload: Record<string, unknown>): Promise<AuthUser> => {
    const { data } = await apiClient.patch(`/admin/students/${id}`, payload);
    return data.data ?? data;
  },
  updateLecturer: async (id: string, payload: Record<string, unknown>): Promise<AuthUser> => {
    const { data } = await apiClient.patch(`/admin/lecturers/${id}`, payload);
    return data.data ?? data;
  },

  // Password
  resetPassword: async (userId: string, payload: { password: string }) => {
    const { data } = await apiClient.patch(`/admin/reset-password/${userId}`, payload);
    return data;
  },

  // Suspend / unsuspend / delete users
  suspendUser: async (userId: string) => {
    const { data } = await apiClient.patch(`/admin/users/${userId}/suspend`);
    return data;
  },
  unsuspendUser: async (userId: string) => {
    const { data } = await apiClient.patch(`/admin/users/${userId}/unsuspend`);
    return data;
  },
  deleteUser: async (userId: string) => {
    const { data } = await apiClient.delete(`/admin/users/${userId}`);
    return data;
  },

  // Academic Terms
  getTerms: async (): Promise<AcademicTerm[]> => {
    const { data } = await apiClient.get("/admin/terms");
    return data.data ?? data;
  },
  createTerm: async (payload: Omit<AcademicTerm, "_id" | "institute" | "createdAt">): Promise<AcademicTerm> => {
    const { data } = await apiClient.post("/admin/terms", payload);
    return data.data ?? data;
  },
  updateTerm: async (termId: string, payload: Partial<AcademicTerm>): Promise<AcademicTerm> => {
    const { data } = await apiClient.patch(`/admin/terms/${termId}`, payload);
    return data.data ?? data;
  },
  deleteTerm: async (termId: string): Promise<void> => {
    await apiClient.delete(`/admin/terms/${termId}`);
  },
  setCurrentTerm: async (termId: string): Promise<AcademicTerm> => {
    const { data } = await apiClient.patch(`/admin/terms/${termId}/set-current`);
    return data.data ?? data;
  },

  // Lifecycle
  updateStudentLifecycle: async (studentId: string, payload: { lifecycleStatus: string; lifecycleNote?: string }) => {
    const { data } = await apiClient.patch(`/admin/students/${studentId}/lifecycle`, payload);
    return data.data ?? data;
  },

  // Fee Analysis
  getFeeSummary: async (): Promise<FeeSummary> => {
    const { data } = await apiClient.get("/admin/fee-analysis/summary");
    return data.data ?? data;
  },
  getFeeByClass: async (): Promise<FeeByClass[]> => {
    const { data } = await apiClient.get("/admin/fee-analysis/by-class");
    return data.data ?? data;
  },
  getFeeByStatus: async (): Promise<FeeByStatus[]> => {
    const { data } = await apiClient.get("/admin/fee-analysis/by-status");
    return data.data ?? data;
  },
  getFeeDefaulters: async (limit = 10): Promise<FeeDefaulter[]> => {
    const { data } = await apiClient.get(`/admin/fee-analysis/defaulters?limit=${limit}`);
    return data.data ?? data;
  },
  getFeeCollectionTrend: async (): Promise<FeeCollectionTrend[]> => {
    const { data } = await apiClient.get("/admin/fee-analysis/collection-trend");
    return data.data ?? data;
  },

  // Promotion
  getPromotionPreview: async (classId: string): Promise<AuthUser[]> => {
    const { data } = await apiClient.get(`/admin/promote/preview/${classId}`);
    return data.data ?? data;
  },
  getPromotionEligibility: async (
    classId: string,
    opts?: { gradeThreshold?: number; attendanceThreshold?: number }
  ): Promise<PromotionEligibilityEntry[]> => {
    const params = new URLSearchParams();
    if (opts?.gradeThreshold != null) params.set("gradeThreshold", String(opts.gradeThreshold));
    if (opts?.attendanceThreshold != null) params.set("attendanceThreshold", String(opts.attendanceThreshold));
    const qs = params.toString() ? `?${params}` : "";
    const { data } = await apiClient.get(`/admin/promote/eligibility/${classId}${qs}`);
    return data.data ?? data;
  },
  bulkPromote: async (payload: { sourceClassId: string; targetClassId: string; studentIds: string[] }) => {
    const { data } = await apiClient.post("/admin/promote/bulk", payload);
    return data;
  },
};
