import { apiClient } from "./client";
import type { SuperAdminStats, PendingAdmin } from "../types";

export const superAdminApi = {
  getStats: async (): Promise<SuperAdminStats> => {
    const { data } = await apiClient.get("/super-admin/stats");
    return data.data ?? data;
  },
  getPendingAdmins: async (): Promise<PendingAdmin[]> => {
    const { data } = await apiClient.get("/super-admin/pending-admins");
    return data.data ?? data;
  },
  getAllAdmins: async (): Promise<PendingAdmin[]> => {
    const { data } = await apiClient.get("/super-admin/admins");
    return data.data ?? data;
  },
  approveAdmin: async (adminId: string) => {
    const { data } = await apiClient.patch(`/super-admin/approve-admin/${adminId}`);
    return data;
  },
  suspendAdmin: async (adminId: string) => {
    const { data } = await apiClient.patch(`/super-admin/admins/${adminId}/suspend`);
    return data;
  },
  unsuspendAdmin: async (adminId: string) => {
    const { data } = await apiClient.patch(`/super-admin/admins/${adminId}/unsuspend`);
    return data;
  },
};
