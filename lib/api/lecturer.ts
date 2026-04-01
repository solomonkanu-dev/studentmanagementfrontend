import { apiClient } from "./client";
import type { PromotionEligibilityEntry } from "./admin";

export interface LecturerClass {
  _id: string;
  name: string;
  students: string[];
  subjects: string[];
}

export const lecturerApi = {
  getMyClasses: async (): Promise<LecturerClass[]> => {
    const { data } = await apiClient.get("/lecturer/my-classes");
    return data.data ?? data;
  },

  getAllInstituteClasses: async (): Promise<LecturerClass[]> => {
    const { data } = await apiClient.get("/class/institute");
    return Array.isArray(data) ? data : (data.data ?? data);
  },

  getPromotionEligibility: async (
    classId: string,
    opts?: { gradeThreshold?: number; attendanceThreshold?: number }
  ): Promise<PromotionEligibilityEntry[]> => {
    const params = new URLSearchParams();
    if (opts?.gradeThreshold != null) params.set("gradeThreshold", String(opts.gradeThreshold));
    if (opts?.attendanceThreshold != null) params.set("attendanceThreshold", String(opts.attendanceThreshold));
    const qs = params.toString() ? `?${params}` : "";
    const { data } = await apiClient.get(`/lecturer/promote/eligibility/${classId}${qs}`);
    return data.data ?? data;
  },

  bulkPromote: async (payload: {
    sourceClassId: string;
    targetClassId: string;
    studentIds: string[];
  }) => {
    const { data } = await apiClient.post("/lecturer/promote/bulk", payload);
    return data;
  },
};
