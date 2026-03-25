import { apiClient } from "./client";
import type { MaintenanceStatus } from "../types";

export const systemConfigApi = {
  getMaintenance: async (): Promise<MaintenanceStatus> => {
    const { data } = await apiClient.get("/system-config/maintenance");
    return data.data ?? data;
  },
  getMyInstituteMaintenance: async (): Promise<MaintenanceStatus> => {
    const { data } = await apiClient.get("/system-config/maintenance/my-institute");
    return data.data ?? data;
  },
  toggleGlobalMaintenance: async (payload: { enabled: boolean; message?: string }) => {
    const { data } = await apiClient.patch("/system-config/maintenance/global", payload);
    return data.data ?? data;
  },
  toggleInstituteMaintenance: async (payload: { instituteId: string; enabled: boolean; message?: string }) => {
    const { data } = await apiClient.patch("/system-config/maintenance/institute", payload);
    return data.data ?? data;
  },
};
