import { apiClient } from "./client";
import type {
  SystemOverview,
  InstituteHealthReport,
  InstituteDeepReport,
  GrowthTrends,
  FeeRevenueReport,
  SalaryExpenditureReport,
  OnlineUserReport,
  OnlineReportListResponse,
} from "../types";

export interface OnlineAdmin {
  userId: string;
  fullName: string;
  institute: { _id: string; name: string } | null;
  connectedAt: string;
}

export interface OnlineUsersData {
  counts: { student: number; lecturer: number; parent: number; admin: number };
  admins: OnlineAdmin[];
}

const BASE = "/super-admin/monitor";

export const monitorApi = {
  getOverview: async (): Promise<SystemOverview> => {
    const { data } = await apiClient.get(`${BASE}/overview`);
    return data.data ?? data;
  },

  getInstitutes: async (): Promise<InstituteHealthReport[]> => {
    const { data } = await apiClient.get(`${BASE}/institutes`);
    return data.data ?? data;
  },

  getInstituteDeep: async (instituteId: string): Promise<InstituteDeepReport> => {
    const { data } = await apiClient.get(`${BASE}/institutes/${instituteId}`);
    return data.data ?? data;
  },

  getGrowth: async (months = 6): Promise<GrowthTrends> => {
    const { data } = await apiClient.get(`${BASE}/growth`, { params: { months } });
    return data.data ?? data;
  },

  getFeeRevenue: async (): Promise<FeeRevenueReport> => {
    const { data } = await apiClient.get(`${BASE}/fee-revenue`);
    return data.data ?? data;
  },

  getSalaryExpenditure: async (): Promise<SalaryExpenditureReport> => {
    const { data } = await apiClient.get(`${BASE}/salary-expenditure`);
    return data.data ?? data;
  },

  getOnlineUsers: async (): Promise<OnlineUsersData> => {
    const { data } = await apiClient.get(`${BASE}/online-users`);
    return data;
  },

  getOnlineReports: async (page = 1): Promise<OnlineReportListResponse> => {
    const { data } = await apiClient.get(`${BASE}/online-reports`, { params: { page, limit: 10 } });
    return data;
  },

  getOnlineReport: async (id: string): Promise<OnlineUserReport> => {
    const { data } = await apiClient.get(`${BASE}/online-reports/${id}`);
    return data.data ?? data;
  },
};
