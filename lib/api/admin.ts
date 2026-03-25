import { apiClient } from "./client";
import type { AuthUser, Institute, Class, Result, FeeSummary, FeeByClass, FeeByStatus, FeeDefaulter, FeeCollectionTrend } from "../types";

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
};
