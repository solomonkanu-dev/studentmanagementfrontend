import { apiClient } from "./client";
import type {
  SystemOverview,
  InstituteHealthReport,
  InstituteDeepReport,
  GrowthTrends,
  FeeRevenueReport,
  SalaryExpenditureReport,
} from "../types";

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
};
