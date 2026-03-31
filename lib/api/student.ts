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

export interface ReportCardData {
  student: {
    _id: string;
    fullName: string;
    email: string;
    profilePhoto?: string;
    class: { _id: string; name: string } | null;
    studentProfile: {
      registrationNumber?: string;
      admissionDate?: string;
      gender?: string;
    };
  };
  institute: Institute | null;
  results: Array<{
    _id: string;
    subject: { _id: string; name: string; code?: string; totalMarks?: number } | null;
    marksObtained: number;
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

  getMyResults: async (): Promise<Result[]> => {
    const { data } = await apiClient.get("/student/my-results");
    return Array.isArray(data) ? data : data.data ?? [];
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

  getMyRanking: async (): Promise<{ rank: number | null; outOf: number; total: number }> => {
    const { data } = await apiClient.get("/student/my-ranking");
    return data.data ?? data;
  },
};
