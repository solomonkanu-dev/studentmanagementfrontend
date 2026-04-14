import { apiClient } from "./client";
import type { Plan, InstitutePlan } from "../types";

export const planApi = {
  getMyPlan: async (): Promise<InstitutePlan | null> => {
    try {
      const { data } = await apiClient.get("/plans/my-plan");
      return data.data ?? data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw err;
    }
  },
  getAll: async (): Promise<Plan[]> => {
    const { data } = await apiClient.get("/plans");
    return data.data ?? data;
  },
  assignToInstitute: async (payload: { instituteId: string; planName: string }) => {
    const { data } = await apiClient.patch("/plans/assign", payload);
    return data.data ?? data;
  },
  updateLimits: async (planId: string, payload: { limits: { maxStudents: number; maxLecturers: number; maxClasses: number }; price?: number; displayName?: string }) => {
    const { data } = await apiClient.patch(`/plans/${planId}`, payload);
    return data.data ?? data;
  },
  create: async (payload: { name: string; displayName?: string; description?: string; price?: number; limits: { maxStudents: number; maxLecturers: number; maxClasses: number } }): Promise<Plan> => {
    const { data } = await apiClient.post("/plans", payload);
    return data.data ?? data;
  },
  getAvailable: async (): Promise<Plan[]> => {
    const { data } = await apiClient.get("/plans/available");
    return data.data ?? data;
  },
  createCheckout: async (planId: string): Promise<{ checkoutUrl: string; sessionId: string }> => {
    const { data } = await apiClient.post("/plans/checkout", { planId });
    return data.data ?? data;
  },
  verifyPayment: async (sessionId: string): Promise<{ plan: Plan; planExpiry: string }> => {
    const { data } = await apiClient.get(`/plans/verify/${sessionId}`);
    return data.data ?? data;
  },
};
