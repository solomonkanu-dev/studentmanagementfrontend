import { apiClient } from "./client";
import type {
  Plan,
  InstitutePlan,
  BillingSummary,
  PlanPayment,
  SubscriptionReceiptData,
} from "../types";

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
  updateLimits: async (
    planId: string,
    payload: {
      limits: { maxStudents: number; maxLecturers: number; maxClasses: number };
      price?: number;
      displayName?: string;
    }
  ) => {
    const { data } = await apiClient.patch(`/plans/${planId}`, payload);
    return data.data ?? data;
  },
  create: async (payload: {
    name: string;
    displayName?: string;
    description?: string;
    price?: number;
    limits: { maxStudents: number; maxLecturers: number; maxClasses: number };
  }): Promise<Plan> => {
    const { data } = await apiClient.post("/plans", payload);
    return data.data ?? data;
  },
  getAvailable: async (): Promise<Plan[]> => {
    const { data } = await apiClient.get("/plans/available");
    return data.data ?? data;
  },

  // ── Per-student/term billing ────────────────────────────────────────────────

  getBillingSummary: async (): Promise<BillingSummary> => {
    const { data } = await apiClient.get("/plans/billing-summary");
    return data.data ?? data;
  },
  createCheckout: async (
    studentCount: number
  ): Promise<{ checkoutUrl: string; sessionId: string; amount: number; studentCount: number }> => {
    const { data } = await apiClient.post("/plans/checkout", { studentCount });
    return data.data ?? data;
  },
  verifyPayment: async (
    sessionId: string
  ): Promise<{ plan: Plan; planExpiry: string | null; payment: PlanPayment }> => {
    const { data } = await apiClient.get(`/plans/verify/${sessionId}`);
    return data.data ?? data;
  },

  // ── Payment history & receipts ──────────────────────────────────────────────

  getPlanPayments: async (instituteId?: string): Promise<PlanPayment[]> => {
    const { data } = await apiClient.get("/plans/payments", {
      params: instituteId ? { instituteId } : undefined,
    });
    return data.data ?? data;
  },
  getPlanPaymentReceipt: async (paymentId: string): Promise<SubscriptionReceiptData> => {
    const { data } = await apiClient.get(`/plans/payments/${paymentId}/receipt`);
    return data.data ?? data;
  },

  // ── Manual payment (super-admin records cash / bank transfer) ───────────────

  recordManualPayment: async (payload: {
    instituteId: string;
    studentCount: number;
    method: "cash" | "bank_transfer";
    reference?: string;
    note?: string;
  }): Promise<PlanPayment> => {
    const { data } = await apiClient.post("/plans/record-manual-payment", payload);
    return data.data ?? data;
  },
};
