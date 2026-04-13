import { apiClient } from "./client";
import type { Result, InvoiceAccount, Institute } from "../types";

export interface StudentFeeRecord {
  _id: string;
  student: string;
  class: { _id: string; name: string } | string;
  fees: { fee: { _id: string; title: string; amount: number } | null; amount: number; paid: number }[];
  totalAmount: number;
  balance: number;
  status: "unpaid" | "partial" | "paid";
  createdAt: string;
  updatedAt: string;
}

export interface ReportCardTerm {
  _id: string;
  name: string;
  academicYear: string;
}

export interface ReportCardData {
  student: {
    _id: string;
    fullName: string;
    email: string;
    profilePhoto?: string;
    class: { _id: string; name: string; lecturer?: { _id: string; fullName: string } | null } | null;
    studentProfile: {
      registrationNumber?: string;
      admissionDate?: string;
      gender?: string;
    };
  };
  institute: Institute | null;
  /** All academic terms configured for this school (sorted by start date) */
  terms: ReportCardTerm[];
  results: Array<{
    _id: string;
    subject: { _id: string; name: string; code?: string; totalMarks?: number } | null;
    term: ReportCardTerm | null;
    marksObtained: number;
    totalScore: number;
    grade?: string;
  }>;
  attendance: { total: number; present: number; percentage: number };
  position: { rank: number; outOf: number };
  generatedAt: string;
}

export type PaymentMethod = "cash" | "bank_transfer" | "card" | "mobile_money" | "cheque";

export interface FeePayment {
  _id: string;
  receiptNumber: string;
  studentFee: string;
  student: string;
  institute: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  recordedBy?: { _id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptData {
  payment: FeePayment & {
    student: {
      _id: string;
      fullName: string;
      email: string;
      profilePhoto?: string;
      class?: { _id: string; name: string } | null;
      studentProfile?: { registrationNumber?: string };
    };
  };
  institute: import("../types").Institute | null;
  studentFee: {
    totalAmount: number;
    balance: number;
    status: string;
    fees: { fee: { title: string; amount: number } | null; amount: number; paid: number }[];
  } | null;
}

export const studentApi = {
  getMyFees: async (): Promise<StudentFeeRecord | null> => {
    const { data } = await apiClient.get("/student/my-fees");
    const arr = Array.isArray(data) ? data : data ? [data] : [];
    return arr[0] ?? null;
  },

  getMyResults: async (opts?: { classId?: string; termId?: string }): Promise<Result[]> => {
    const params = new URLSearchParams();
    if (opts?.classId) params.set("classId", opts.classId);
    if (opts?.termId) params.set("termId", opts.termId);
    const qs = params.toString() ? `?${params}` : "";
    const { data } = await apiClient.get(`/student/my-results${qs}`);
    return Array.isArray(data) ? data : data.data ?? [];
  },

  getMyPromotionHistory: async (): Promise<{ currentClass: { _id: string; name: string } | null; history: { fromClass: { _id: string; name: string } | null; toClass: { _id: string; name: string } | null; promotedAt: string }[] }> => {
    const { data } = await apiClient.get("/student/my-promotion-history");
    return data;
  },

  getPaymentAccounts: async (): Promise<InvoiceAccount[]> => {
    const { data } = await apiClient.get("/account/active");
    return data.data ?? data;
  },

  getMyReportCard: async (): Promise<ReportCardData> => {
    const { data } = await apiClient.get("/student/my-report-card");
    return data;
  },

  getMyPayments: async (): Promise<FeePayment[]> => {
    const { data } = await apiClient.get("/student/my-payments");
    return Array.isArray(data) ? data : data.data ?? [];
  },

  getMyPaymentReceipt: async (paymentId: string): Promise<ReceiptData> => {
    const { data } = await apiClient.get(`/student/my-payments/${paymentId}/receipt`);
    return data;
  },

  getMyRanking: async (termId?: string): Promise<{ rank: number | null; outOf: number; total: number }> => {
    const qs = termId ? `?termId=${termId}` : "";
    const { data } = await apiClient.get(`/student/my-ranking${qs}`);
    return data.data ?? data;
  },

  updateEmailPreferences: async (optOut: string[]): Promise<{ emailOptOut: string[] }> => {
    const { data } = await apiClient.patch("/student/email-preferences", { optOut });
    return data;
  },
};
