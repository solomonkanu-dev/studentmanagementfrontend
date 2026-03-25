import { apiClient } from "./client";
import type { LoginPayload, LoginResponse } from "../types";

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post("/auth/login", payload);
    return data;
  },

  superAdminLogin: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post("/super-admin/super-admin/login", payload);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },
};
