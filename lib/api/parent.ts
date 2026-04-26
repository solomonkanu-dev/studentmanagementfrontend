import { apiClient } from "./client";
import type { LinkedStudent } from "../types";

export interface ChildAttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
  recentRecords: { date: string; status: string; subject?: string }[];
}

export interface ChildFee {
  _id: string;
  category: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
  dueDate?: string;
  termId?: string | { _id: string; name: string; academicYear: string };
  termName?: string;
  academicYear?: string;
}

export interface PromotionEntry {
  fromClass: { _id: string; name: string } | null;
  toClass: { _id: string; name: string } | null;
  promotedAt: string;
}

export interface ChildPromotionHistory {
  currentClass: { _id: string; name: string } | null;
  history: PromotionEntry[];
}

export interface ChildAttendanceStats {
  todayStatus: {
    date: string;
    status: "present" | "absent" | null;
    className: string | null;
  } | null;
  monthlyAbsences: {
    year: number;
    month: number;
    label: string;
    absences: number;
  }[];
  totalAbsencesThisYear: number;
}

export const parentApi = {
  getMyChildren: async (): Promise<LinkedStudent[]> => {
    const { data } = await apiClient.get("/parent/my-children");
    return data.data ?? data;
  },

  getChildAttendance: async (studentId: string): Promise<ChildAttendanceSummary> => {
    const { data } = await apiClient.get(`/parent/child/${studentId}/attendance`);
    return data.data ?? data;
  },

  getChildAttendanceStats: async (studentId: string): Promise<ChildAttendanceStats> => {
    const { data } = await apiClient.get(`/parent/child/${studentId}/attendance-stats`);
    return data.data ?? data;
  },

  getChildResults: async (studentId: string, classId?: string): Promise<unknown[]> => {
    const url = classId
      ? `/parent/child/${studentId}/results?classId=${classId}`
      : `/parent/child/${studentId}/results`;
    const { data } = await apiClient.get(url);
    return data.data ?? data;
  },

  getChildFees: async (studentId: string): Promise<ChildFee[]> => {
    const { data } = await apiClient.get(`/parent/child/${studentId}/fees`);
    return data.data ?? data;
  },

  getAnnouncements: async (): Promise<unknown[]> => {
    const { data } = await apiClient.get("/parent/announcements");
    return data.data ?? data;
  },

  getChildPromotionHistory: async (studentId: string): Promise<ChildPromotionHistory> => {
    const { data } = await apiClient.get(`/parent/child/${studentId}/promotion-history`);
    return data;
  },
};

// Admin: manage parents
export const adminParentApi = {
  getAll: async (): Promise<unknown[]> => {
    const { data } = await apiClient.get("/admin/parents");
    return data.data ?? data;
  },

  create: async (payload: {
    fullName: string;
    email: string;
    password: string;
    linkedStudents?: string[];
  }): Promise<unknown> => {
    const { data } = await apiClient.post("/admin/parents", payload);
    return data.data ?? data;
  },

  linkStudent: async (parentId: string, studentId: string): Promise<unknown> => {
    const { data } = await apiClient.post("/admin/parents/link-student", { parentId, studentId });
    return data;
  },

  unlinkStudent: async (parentId: string, studentId: string): Promise<unknown> => {
    const { data } = await apiClient.post("/admin/parents/unlink-student", { parentId, studentId });
    return data;
  },

  revoke: async (parentId: string): Promise<unknown> => {
    const { data } = await apiClient.patch(`/admin/parents/${parentId}/revoke`);
    return data;
  },

  restore: async (parentId: string): Promise<unknown> => {
    const { data } = await apiClient.patch(`/admin/parents/${parentId}/restore`);
    return data;
  },
};
