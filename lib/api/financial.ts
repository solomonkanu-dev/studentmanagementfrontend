import { apiClient } from "./client";

export interface FinancialRecord {
  _id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  description?: string;
  paymentMethod: "cash" | "bank_transfer" | "card" | "mobile_money" | "cheque" | "other";
  reference?: string;
  termId?: { _id: string; name: string; academicYear: string } | string | null;
  accountId?: { _id: string; name: string } | string | null;
  recordedBy?: { fullName: string };
  createdAt: string;
}

export interface FinancialBudget {
  _id: string;
  category: string;
  type: "income" | "expense";
  budgetedAmount: number;
  actual?: number;
  termId?: { _id: string; name: string; academicYear: string } | string | null;
  academicYear?: string;
}

export interface FinancialAccount {
  _id: string;
  name: string;
  type: "bank" | "cash" | "mobile_money";
  bankName?: string;
  accountNumber?: string;
  openingBalance: number;
  currentBalance?: number;
  isActive: boolean;
  createdAt: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  byCategory: { type: "income" | "expense"; category: string; total: number }[];
  termComparison: { termId: string; term: string; income: number; expense: number }[];
}

export type RecordFilters = {
  type?: "income" | "expense";
  termId?: string;
  category?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
};

export const financialApi = {
  getRecords: async (params?: RecordFilters): Promise<FinancialRecord[]> => {
    const { data } = await apiClient.get("/financial/records", { params });
    return data.data ?? data;
  },

  createRecord: async (payload: Omit<FinancialRecord, "_id" | "createdAt" | "recordedBy">): Promise<FinancialRecord> => {
    const { data } = await apiClient.post("/financial/records", payload);
    return data.data ?? data;
  },

  updateRecord: async (id: string, payload: Partial<FinancialRecord>): Promise<FinancialRecord> => {
    const { data } = await apiClient.patch(`/financial/records/${id}`, payload);
    return data.data ?? data;
  },

  deleteRecord: async (id: string): Promise<void> => {
    await apiClient.delete(`/financial/records/${id}`);
  },

  getSummary: async (termId?: string): Promise<FinancialSummary> => {
    const { data } = await apiClient.get("/financial/summary", { params: termId ? { termId } : undefined });
    return data.data ?? data;
  },

  getBudgets: async (termId?: string): Promise<FinancialBudget[]> => {
    const { data } = await apiClient.get("/financial/budgets", { params: termId ? { termId } : undefined });
    return data.data ?? data;
  },

  upsertBudget: async (payload: {
    category: string;
    type: "income" | "expense";
    budgetedAmount: number;
    termId: string;
  }): Promise<FinancialBudget> => {
    const { data } = await apiClient.post("/financial/budgets", payload);
    return data.data ?? data;
  },

  deleteBudget: async (id: string): Promise<void> => {
    await apiClient.delete(`/financial/budgets/${id}`);
  },

  getAccounts: async (): Promise<FinancialAccount[]> => {
    const { data } = await apiClient.get("/financial/accounts");
    return data.data ?? data;
  },

  createAccount: async (payload: Omit<FinancialAccount, "_id" | "currentBalance" | "createdAt">): Promise<FinancialAccount> => {
    const { data } = await apiClient.post("/financial/accounts", payload);
    return data.data ?? data;
  },

  updateAccount: async (id: string, payload: Partial<FinancialAccount>): Promise<FinancialAccount> => {
    const { data } = await apiClient.patch(`/financial/accounts/${id}`, payload);
    return data.data ?? data;
  },

  deleteAccount: async (id: string): Promise<void> => {
    await apiClient.delete(`/financial/accounts/${id}`);
  },
};
