import { apiClient } from "./client";
import type { GradingScale } from "../types";

export const gradingApi = {
  getAll: async (): Promise<GradingScale[]> => {
    const { data } = await apiClient.get("/grading");
    return data.data ?? data;
  },

  getDefault: async (): Promise<GradingScale | null> => {
    try {
      const { data } = await apiClient.get("/grading/default");
      return data.data ?? data ?? null;
    } catch {
      return null;
    }
  },

  getById: async (id: string): Promise<GradingScale> => {
    const { data } = await apiClient.get(`/grading/${id}`);
    return data.data ?? data;
  },

  create: async (payload: { name: string; grades: { grade: string; minScore: number; maxScore: number }[] }): Promise<GradingScale> => {
    const { data } = await apiClient.post("/grading", payload);
    return data.data ?? data;
  },

  update: async (id: string, payload: { name?: string; grades?: { grade: string; minScore: number; maxScore: number }[] }): Promise<GradingScale> => {
    const { data } = await apiClient.put(`/grading/${id}`, payload);
    return data.data ?? data;
  },

  setDefault: async (id: string): Promise<GradingScale> => {
    const { data } = await apiClient.patch(`/grading/${id}/set-default`);
    return data.data ?? data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/grading/${id}`);
  },
};
