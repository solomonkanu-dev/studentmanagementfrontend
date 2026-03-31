import { apiClient } from "./client";

export interface AcademicTerm {
  _id: string;
  name: string;
  type: "term" | "semester";
  academicYear: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  institute: string;
  createdAt: string;
}

export const termApi = {
  getAll: async (): Promise<AcademicTerm[]> => {
    const { data } = await apiClient.get("/terms");
    return data.data ?? data;
  },
};
