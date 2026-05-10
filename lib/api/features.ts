import { apiClient } from "./client";
import type { InstituteModulesDoc, LecturerModuleAccess, ModuleKey } from "../types";

export const featuresApi = {
  getModules: async (): Promise<InstituteModulesDoc> => {
    const { data } = await apiClient.get("/admin/modules/me");
    return data.data ?? data;
  },

  updateModules: async (modules: Partial<Record<ModuleKey, boolean>>): Promise<InstituteModulesDoc> => {
    const { data } = await apiClient.patch("/admin/modules", { modules });
    return data.data ?? data;
  },

  getLecturerAccess: async (lecturerId: string): Promise<LecturerModuleAccess> => {
    const { data } = await apiClient.get(`/admin/lecturers/${lecturerId}/module-access`);
    return data.data ?? data;
  },

  setLecturerAccess: async (lecturerId: string, moduleAccess: string[]): Promise<LecturerModuleAccess> => {
    const { data } = await apiClient.put(`/admin/lecturers/${lecturerId}/module-access`, { moduleAccess });
    return data.data ?? data;
  },
};
