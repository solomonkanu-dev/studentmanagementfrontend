import { apiClient } from "./client";

export const attendanceApi = {
  // ─── Student Attendance ──────────────────────────────────
  getStudentsForAttendance: async (classId: string, subjectId: string) => {
    const { data } = await apiClient.get("/attendance/students", { params: { classId, subjectId } });
    return data as { class: { _id: string; name: string }; subject: { _id: string; name: string; code?: string }; students: import("../types").AuthUser[] };
  },
  mark: async (payload: {
    classId: string;
    subjectId: string;
    date: string;
    records: { studentId: string; status: "present" | "absent" }[];
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
  getSubjectAttendance: async (params: { classId?: string; subjectId?: string; date?: string }) => {
    const { data } = await apiClient.get("/attendance/subject", { params });
    return data.data ?? data;
  },
  getClassReport: async (params: { classId: string; from?: string; to?: string }) => {
    const { data } = await apiClient.get("/attendance/report/class", { params });
    return data.data ?? data;
  },
  getEligibility: async (subjectId: string) => {
    const { data } = await apiClient.get(`/attendance/eligibility/${subjectId}`);
    return data.data ?? data;
  },
  getAnalytics: async (subjectId: string) => {
    const { data } = await apiClient.get(`/attendance/analytics/subject/${subjectId}`);
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
};
