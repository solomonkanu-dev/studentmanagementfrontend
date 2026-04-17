import { apiClient } from "./client";
import type { Exam } from "../types";

const BASE = "/exam";

export const examApi = {
  create: async (payload: Record<string, unknown>): Promise<Exam> => {
    const { data } = await apiClient.post(BASE, payload);
    return data.data ?? data;
  },

  getAll: async (params?: { termId?: string; classId?: string }): Promise<Exam[]> => {
    const { data } = await apiClient.get(BASE, { params });
    return data.data ?? data;
  },

  getByClass: async (classId: string, termId?: string): Promise<Exam[]> => {
    const { data } = await apiClient.get(`${BASE}/class/${classId}`, {
      params: termId ? { termId } : undefined,
    });
    return data.data ?? data;
  },

  getById: async (id: string): Promise<Exam> => {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data.data ?? data;
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<Exam> => {
    const { data } = await apiClient.patch(`${BASE}/${id}`, payload);
    return data.data ?? data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },
};
