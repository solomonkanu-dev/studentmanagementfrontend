import { apiClient } from "./client";
import type { AuditLog, AuditLogSummary, AuditLogParams } from "../types";

export interface AuditLogListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function parsePaginatedResponse(res: {
  data?: AuditLog[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  // legacy shape
  pagination?: { page?: number; limit?: number; total?: number; pages?: number };
}): AuditLogListResponse {
  return {
    data: res.data ?? [],
    total: res.total ?? res.pagination?.total ?? 0,
    page: res.page ?? res.pagination?.page ?? 1,
    limit: res.limit ?? res.pagination?.limit ?? 25,
    totalPages: res.totalPages ?? res.pagination?.pages ?? 1,
  };
}

export const auditLogApi = {
  getAll: async (params?: AuditLogParams): Promise<AuditLogListResponse> => {
    const { data } = await apiClient.get("/audit-logs", { params });
    return parsePaginatedResponse(data);
  },

  getSummary: async (): Promise<AuditLogSummary> => {
    const { data } = await apiClient.get("/audit-logs/summary");
    return data.data ?? data;
  },

  getUserLogs: async (
    userId: string,
    params?: Pick<AuditLogParams, "page" | "limit">
  ): Promise<AuditLogListResponse> => {
    const { data } = await apiClient.get(`/audit-logs/user/${userId}`, { params });
    return parsePaginatedResponse(data);
  },
};
