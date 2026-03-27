import { apiClient } from "./client";
import type { Result, InvoiceAccount } from "../types";

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

export const studentApi = {
  getMyFees: async (): Promise<StudentFeeRecord | null> => {
    const { data } = await apiClient.get("/student/my-fees");
    return data ?? null;
  },

  getMyResults: async (): Promise<Result[]> => {
    const { data } = await apiClient.get("/student/my-results");
    return Array.isArray(data) ? data : data.data ?? [];
  },

  getPaymentAccounts: async (): Promise<InvoiceAccount[]> => {
    const { data } = await apiClient.get("/account/active");
    return data.data ?? data;
  },
};
