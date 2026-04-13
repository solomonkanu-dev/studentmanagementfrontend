import { apiClient } from "./client";
import type { Notification } from "../types";

export const notificationApi = {
  getAll: async (): Promise<Notification[]> => {
    const { data } = await apiClient.get("/notifications");
    const list = data.data ?? data;
    return Array.isArray(list) ? list : [];
  },
  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get("/notifications/unread-count");
    return data.count ?? data.data ?? 0;
  },
  readAll: async (): Promise<void> => {
    await apiClient.patch("/notifications/read-all");
  },
  readOne: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },
};
