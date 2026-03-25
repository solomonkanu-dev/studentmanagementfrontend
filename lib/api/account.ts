import { apiClient } from "./client";
import type { InvoiceAccount } from "../types";

export const accountApi = {
  getAll: async (): Promise<InvoiceAccount[]> => {
    const { data } = await apiClient.get("/account/get-accounts");
    return data.data ?? data;
  },

  getActive: async (): Promise<InvoiceAccount[]> => {
    const { data } = await apiClient.get("/account/active");
    return data.data ?? data;
  },

  getById: async (id: string): Promise<InvoiceAccount> => {
    const { data } = await apiClient.get(`/account/${id}`);
    return data.data ?? data;
  },

  create: async (payload: Record<string, unknown>): Promise<InvoiceAccount> => {
    const { data } = await apiClient.post("/account/create-account", payload);
    return data.data ?? data;
  },

  update: async (id: string, payload: Record<string, unknown>): Promise<InvoiceAccount> => {
    const { data } = await apiClient.put(`/account/${id}`, payload);
    return data.data ?? data;
  },

  toggleStatus: async (id: string): Promise<InvoiceAccount> => {
    const { data } = await apiClient.patch(`/account/${id}/toggle-status`);
    return data.data ?? data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/account/${id}`);
  },
};
