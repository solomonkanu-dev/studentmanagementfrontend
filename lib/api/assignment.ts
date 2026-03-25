import { apiClient } from "./client";
import type { Assignment, Submission } from "../types";

export const assignmentApi = {
  create: async (payload: Record<string, unknown>): Promise<Assignment> => {
    const { data } = await apiClient.post("/assignment/create-assignment", payload);
    return data.data ?? data;
  },
  getBySubject: async (subjectId: string): Promise<Assignment[]> => {
    const { data } = await apiClient.get(`/assignment/subject/${subjectId}`);
    return data.data ?? data;
  },
};

export const submissionApi = {
  submit: async (payload: Record<string, unknown>): Promise<Submission> => {
    const { data } = await apiClient.post("/submission/submit-assignment", payload);
    return data.data ?? data;
  },
  grade: async (submissionId: string, payload: { grade: number; feedback?: string }): Promise<Submission> => {
    const { data } = await apiClient.patch(`/submission/${submissionId}/grade`, payload);
    return data.data ?? data;
  },
  getByAssignment: async (assignmentId: string): Promise<Submission[]> => {
    const { data } = await apiClient.get(`/submission/assignment/${assignmentId}`);
    return data.data ?? data;
  },
  getMine: async (): Promise<Submission[]> => {
    const { data } = await apiClient.get("/submission/me");
    return data.data ?? data;
  },
};
