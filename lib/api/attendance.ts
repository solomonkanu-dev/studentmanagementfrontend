import { apiClient } from "./client";
import type { StudentQR, QRSession } from "../types";

export const attendanceApi = {
  // ─── Student Attendance ──────────────────────────────────
  getStudentsForAttendance: async (classId: string, subjectId?: string) => {
    const { data } = await apiClient.get("/attendance/students", { params: { classId, ...(subjectId ? { subjectId } : {}) } });
    return data as { class: { _id: string; name: string }; students: import("../types").AuthUser[] };
  },
  mark: async (payload: {
    classId: string;
    date: string;
    records: { studentId: string; status: "present" | "absent" }[];
    subjectId?: string;
  }) => {
    const { data } = await apiClient.post("/attendance/mark-attendance", payload);
    return data.data ?? data;
  },
  getMyAttendance: async () => {
    const { data } = await apiClient.get("/attendance/get-attendance");
    return data.data ?? data;
  },
  getStudentSummary: async (studentId: string) => {
    const { data } = await apiClient.get(`/attendance/get-student-attendance/${studentId}`);
    return data.data ?? data;
  },
  getSubjectAttendance: async (params: { classId: string; date?: string; subjectId?: string }) => {
    const { data } = await apiClient.get("/attendance/subject", { params });
    return data.data ?? data;
  },
  getClassReport: async (params: { classId: string; from?: string; to?: string }) => {
    const { data } = await apiClient.get("/attendance/report/class", { params });
    return data.data ?? data;
  },
  getEligibility: async (classId: string) => {
    const { data } = await apiClient.get(`/attendance/eligibility/${classId}`);
    return data.data ?? data;
  },
  getAnalytics: async (classId: string) => {
    const { data } = await apiClient.get(`/attendance/analytics/class/${classId}`);
    return data.data ?? data;
  },
  getMySummary: async () => {
    const { data } = await apiClient.get("/attendance/summary/me");
    return data.data ?? data;
  },

  // ─── Employee / Lecturer Attendance ──────────────────────
  markEmployee: async (payload: {
    date: string;
    records: { lecturerId: string; status: "present" | "absent" | "leave" }[];
  }) => {
    const { data } = await apiClient.post("/attendance/employee/mark-employee-attendance", payload);
    return data.data ?? data;
  },
  getEmployeeAttendance: async (lecturerId: string, from?: string, to?: string) => {
    const params: Record<string, string> = { lecturerId };
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await apiClient.get("/attendance/employee/get-employee-attendance", { params });
    return data.attendances ?? data.data ?? data;
  },
  getEmployeeSummary: async (lecturerId: string) => {
    const { data } = await apiClient.get(`/attendance/employee/summary/${lecturerId}`);
    return data;
  },

  // ─── QR Attendance ────────────────────────────────────────────────
  scanQR: async (payload: { qrToken: string; classId: string }) => {
    const { data } = await apiClient.post("/attendance/qr/scan", payload);
    return data as { message: string; student: { _id: string; fullName: string }; alreadyPresent: boolean };
  },
  finalizeQR: async (payload: { classId: string; date?: string }) => {
    const { data } = await apiClient.post("/attendance/qr/finalize", payload);
    return data as { message: string; present: number; absent: number };
  },
  getQRSession: async (classId: string) => {
    const { data } = await apiClient.get(`/attendance/qr/session/${classId}`);
    return data as QRSession;
  },

  // ─── Admin QR Management ──────────────────────────────────────────
  getStudentQR: async (studentId: string) => {
    const { data } = await apiClient.get(`/admin/students/${studentId}/qr`);
    return data as StudentQR;
  },
  toggleStudentQR: async (studentId: string, qrActive: boolean) => {
    const { data } = await apiClient.patch(`/admin/students/${studentId}/qr`, { qrActive });
    return data as { message: string; student: StudentQR };
  },
};
