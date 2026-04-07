import { apiClient } from "./client";
import type { Timetable, TimetableEntry } from "../types";

export const timetableApi = {
  getByClass: async (classId: string): Promise<Timetable | null> => {
    try {
      const { data } = await apiClient.get(`/timetable/class/${classId}`);
      return data.data ?? data;
    } catch {
      return null;
    }
  },

  getAll: async (): Promise<Timetable[]> => {
    const { data } = await apiClient.get("/timetable");
    return data.data ?? data;
  },

  create: async (payload: { classId: string; entries: Omit<TimetableEntry, "_id">[] }): Promise<Timetable> => {
    const entries = payload.entries.map((e) => ({
      day: e.day,
      startTime: e.startTime,
      endTime: e.endTime,
      subject: typeof e.subject === "object" ? (e.subject as { _id: string })._id : e.subject,
      lecturer: typeof e.lecturer === "object" ? (e.lecturer as { _id: string; fullName: string })._id : e.lecturer,
    }));
    const { data } = await apiClient.post("/admin/timetable", { classId: payload.classId, entries });
    return data.data ?? data;
  },

  update: async (id: string, payload: { entries: TimetableEntry[] }): Promise<Timetable> => {
    const entries = payload.entries.map((e) => ({
      day: e.day,
      startTime: e.startTime,
      endTime: e.endTime,
      subject: typeof e.subject === "object" ? (e.subject as { _id: string })._id : e.subject,
      lecturer: typeof e.lecturer === "object" ? (e.lecturer as { _id: string; fullName: string })._id : e.lecturer,
    }));
    const { data } = await apiClient.put(`/admin/timetable/${id}`, { entries });
    return data.data ?? data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/timetable/${id}`);
  },
};
