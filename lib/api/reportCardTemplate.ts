import { apiClient } from "./client";
import type { ReportCardTemplate } from "../types";

export type ReportCardTemplatePayload = Partial<
  Omit<ReportCardTemplate, "_id" | "institute" | "createdBy" | "createdAt" | "updatedAt">
>;

export const reportCardTemplateApi = {
  getAll: async (): Promise<ReportCardTemplate[]> => {
    const { data } = await apiClient.get("/report-card-template");
    return data.data ?? data;
  },

  getDefault: async (): Promise<ReportCardTemplate | null> => {
    try {
      const { data } = await apiClient.get("/report-card-template/default");
      return data.data ?? data ?? null;
    } catch {
      return null;
    }
  },

  getById: async (id: string): Promise<ReportCardTemplate> => {
    const { data } = await apiClient.get(`/report-card-template/${id}`);
    return data.data ?? data;
  },

  create: async (payload: ReportCardTemplatePayload): Promise<ReportCardTemplate> => {
    const { data } = await apiClient.post("/report-card-template", payload);
    return data.data ?? data;
  },

  update: async (id: string, payload: ReportCardTemplatePayload): Promise<ReportCardTemplate> => {
    const { data } = await apiClient.put(`/report-card-template/${id}`, payload);
    return data.data ?? data;
  },

  setDefault: async (id: string): Promise<void> => {
    await apiClient.patch(`/report-card-template/${id}/set-default`);
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/report-card-template/${id}`);
  },
};
