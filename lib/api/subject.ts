import { apiClient } from "./client";
import type { Subject } from "../types";

export const subjectApi = {
  getAll: async (): Promise<Subject[]> => {
    const { data } = await apiClient.get("/subject");
    return data.data ?? data;
  },
  getById: async (id: string): Promise<Subject> => {
    const { data } = await apiClient.get(`/subject/${id}`);
    return data.data ?? data;
  },
  create: async (payload: Record<string, unknown>): Promise<Subject> => {
    const { data } = await apiClient.post("/subject/create-subject", payload);
    return data.data ?? data;
  },
  assignLecturer: async (payload: { subjectId: string; lecturerId: string }) => {
    const { data } = await apiClient.patch("/subject/assign-lecturer", payload);
    return data.data ?? data;
  },
  getForLecturer: async (): Promise<Subject[]> => {
    const { data } = await apiClient.get("/subject/lecturer");
    return data.data ?? data;
  },
  getForStudent: async (): Promise<Subject[]> => {
    const { data } = await apiClient.get("/subject/student");
    return data.data ?? data;
  },
};
