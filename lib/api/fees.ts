import { apiClient } from "./client";
import type { FeeStructure } from "../types";

export const feesApi = {
  // Fee structures
  getStructures: async (): Promise<FeeStructure[]> => {
    const { data } = await apiClient.get("/fees-structure");
    return data.data ?? data;
  },
  getStructure: async (id: string): Promise<FeeStructure> => {
    const { data } = await apiClient.get(`/fees-structure/${id}`);
    return data.data ?? data;
  },
  createStructure: async (payload: Record<string, unknown>): Promise<FeeStructure> => {
    const { data } = await apiClient.post("/fees-structure", payload);
    return data.data ?? data;
  },
  updateStructure: async (id: string, payload: Record<string, unknown>): Promise<FeeStructure> => {
    const { data } = await apiClient.put(`/fees-structure/${id}`, payload);
    return data.data ?? data;
  },
  deleteStructure: async (id: string): Promise<void> => {
    await apiClient.delete(`/fees-structure/${id}`);
  },
};
