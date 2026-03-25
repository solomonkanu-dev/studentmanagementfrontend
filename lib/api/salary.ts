import { apiClient } from "./client";
import type { Salary } from "../types";

export const salaryApi = {
  // Admin: all salaries (paginated)
  getAll: async (params?: {
    salaryMonth?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Salary[]; total: number; page: number; limit: number }> => {
    const { data } = await apiClient.get("/salary/salary-slips", { params });
    return data;
  },

  // Admin: single salary
  getById: async (id: string): Promise<Salary> => {
    const { data } = await apiClient.get(`/salary/${id}`);
    return data.data ?? data;
  },

  // Admin: monthly summary
  getMonthlySummary: async (salaryMonth: string) => {
    const { data } = await apiClient.get(`/salary/summary/${salaryMonth}`);
    return data.data ?? data;
  },

  // Admin + Lecturer: salary records for a specific lecturer
  getForLecturer: async (
    lecturerId: string,
    params?: { salaryMonth?: string; status?: string }
  ): Promise<Salary[]> => {
    const { data } = await apiClient.get(`/salary/lecturer/${lecturerId}`, { params });
    // Response: { lecturer, salaries: [...] } or { data: [...] }
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.salaries)) return data.salaries;
    if (Array.isArray(data.data)) return data.data;
    return [];
  },

  // Admin: record new salary
  pay: async (payload: Record<string, unknown>): Promise<Salary> => {
    const { data } = await apiClient.post("/salary/pay-salary", payload);
    return data.data ?? data;
  },

  // Admin: update pending salary
  update: async (id: string, payload: Record<string, unknown>): Promise<Salary> => {
    const { data } = await apiClient.put(`/salary/${id}`, payload);
    return data.data ?? data;
  },

  // Admin: mark salary as paid
  markPaid: async (id: string): Promise<Salary> => {
    const { data } = await apiClient.patch(`/salary/${id}/mark-paid`);
    return data.data ?? data;
  },

  // Admin: delete pending salary
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/salary/${id}`);
  },
};
