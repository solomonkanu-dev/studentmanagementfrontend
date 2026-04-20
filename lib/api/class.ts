import { apiClient } from "./client";
import type { Class, AuthUser } from "../types";

export const classApi = {
  getAll: async (): Promise<Class[]> => {
    const { data } = await apiClient.get("/class");
    return data.data ?? data;
  },
  getById: async (id: string): Promise<Class> => {
    const { data } = await apiClient.get(`/class/${id}`);
    return data.data ?? data;
  },
  getStudents: async (classId: string): Promise<AuthUser[]> => {
    const { data } = await apiClient.get(`/class/${classId}/students`);
    const result = data.data ?? data.students ?? data;
    return Array.isArray(result) ? result : [];
  },
  create: async (payload: { name: string; lecturerId: string }): Promise<Class> => {
    const { data } = await apiClient.post("/class/create-class", payload);
    return data.data ?? data;
  },
  addStudent: async (payload: { classId: string; studentId: string }) => {
    const { data } = await apiClient.post("/class/add-student", payload);
    return data.data ?? data;
  },
  update: async (classId: string, payload: { name?: string; lecturerId?: string }): Promise<Class> => {
    const { data } = await apiClient.patch(`/class/${classId}`, payload);
    return data.class ?? data.data ?? data;
  },
  assignLecturer: async (payload: { classId: string; lecturerId: string }) => {
    const { data } = await apiClient.patch("/class/assign-lecturer", payload);
    return data.data ?? data;
  },
  getForAdmin: async (): Promise<Class[]> => {
    const { data } = await apiClient.get("/class/admin");
    return data.data ?? data;
  },
  getForLecturer: async (): Promise<Class[]> => {
    try {
      const { data } = await apiClient.get("/class/lecturer");
      return data.data ?? data;
    } catch {
      // Fallback: derive unique classes from the lecturer's subjects
      // (works when /class/lecturer returns 403 on some backend configs)
      const { data: subData } = await apiClient.get("/subject/lecturer");
      const subjects: { class: string | Class }[] = subData.data ?? subData;
      const classMap = new Map<string, Class>();
      for (const s of subjects) {
        if (s.class && typeof s.class === "object") {
          classMap.set((s.class as Class)._id, s.class as Class);
        }
      }
      return Array.from(classMap.values());
    }
  },
  getForStudent: async (): Promise<Class[]> => {
    const { data } = await apiClient.get("/class/student");
    return data.data ?? data;
  },
};
