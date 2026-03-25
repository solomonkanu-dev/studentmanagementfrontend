import { apiClient } from "./client";
import type { Announcement, AnnouncementRole, AnnouncementType } from "../types";

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  type?: AnnouncementType;
  institute?: string;
  targetRoles?: AnnouncementRole[];
  expiresAt?: string;
}

export const announcementApi = {
  getAll: async (): Promise<Announcement[]> => {
    const { data } = await apiClient.get("/announcements");
    return data.data ?? data;
  },
  create: async (payload: CreateAnnouncementPayload): Promise<Announcement> => {
    const { data } = await apiClient.post("/announcements", payload);
    return data.data ?? data;
  },
  update: async (id: string, payload: Partial<CreateAnnouncementPayload>): Promise<Announcement> => {
    const { data } = await apiClient.patch(`/announcements/${id}`, payload);
    return data.data ?? data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/announcements/${id}`);
  },
  markRead: async (id: string): Promise<void> => {
    await apiClient.post(`/announcements/${id}/read`);
  },
  getReadStatus: async (id: string) => {
    const { data } = await apiClient.get(`/announcements/${id}/read-status`);
    return data.data ?? data;
  },
};
