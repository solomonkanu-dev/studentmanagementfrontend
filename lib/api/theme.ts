import { apiClient } from "./client";
import type { Theme } from "../types";

export const themeApi = {
  getAll: async (): Promise<Theme[]> => {
    const { data } = await apiClient.get("/theme");
    return data.data ?? data;
  },

  getById: async (id: string): Promise<Theme> => {
    const { data } = await apiClient.get(`/theme/${id}`);
    return data.data ?? data;
  },

  // Public — no auth required
  getActive: async (): Promise<Theme | null> => {
    try {
      const { data } = await apiClient.get("/theme/active");
      return data.data ?? data ?? null;
    } catch {
      return null;
    }
  },

  create: async (payload: Record<string, unknown>): Promise<Theme> => {
    const { data } = await apiClient.post("/theme", payload);
    return data.data ?? data;
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<Theme> => {
    const { data } = await apiClient.put(`/theme/${id}`, payload);
    return data.data ?? data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/theme/${id}`);
  },
};
