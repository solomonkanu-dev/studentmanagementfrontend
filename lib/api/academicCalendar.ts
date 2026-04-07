import { apiClient } from "./client";
import type { CalendarEvent } from "../types";

export const calendarApi = {
  getAll: async (): Promise<CalendarEvent[]> => {
    const { data } = await apiClient.get("/calendar");
    return data.data ?? data;
  },

  create: async (
    payload: Pick<CalendarEvent, "title" | "description" | "startDate" | "endDate" | "type">
  ): Promise<CalendarEvent> => {
    const { data } = await apiClient.post("/admin/calendar", payload);
    return data.data ?? data;
  },

  update: async (
    id: string,
    payload: Partial<Pick<CalendarEvent, "title" | "description" | "startDate" | "endDate" | "type">>
  ): Promise<CalendarEvent> => {
    const { data } = await apiClient.put(`/admin/calendar/${id}`, payload);
    return data.data ?? data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/calendar/${id}`);
  },
};
