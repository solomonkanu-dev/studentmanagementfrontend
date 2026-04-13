import { apiClient } from "./client";
import type { Assignment, Submission } from "../types";

export const assignmentApi = {
  create: async (payload: Record<string, unknown>): Promise<Assignment> => {
    const { data } = await apiClient.post("/assignment/create-assignment", payload);
    return data.assignment ?? data.data ?? data;
  },
  getBySubject: async (subjectId: string): Promise<Assignment[]> => {
    const { data } = await apiClient.get(`/assignment/subject/${subjectId}`);
    return data.data ?? data;
  },
  getByClass: async (classId: string): Promise<Assignment[]> => {
    const { data } = await apiClient.get(`/assignment/class/${classId}`);
    return data.data ?? data;
  },
  getById: async (id: string): Promise<Assignment> => {
    const { data } = await apiClient.get(`/assignment/${id}`);
    return data.data ?? data;
  },
  update: async (id: string, payload: Record<string, unknown>): Promise<Assignment> => {
    const { data } = await apiClient.patch(`/assignment/${id}`, payload);
    return data.data ?? data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/assignment/${id}`);
  },
  getMine: async (): Promise<Assignment[]> => {
    const { data } = await apiClient.get("/assignment/mine");
    return data.data ?? data;
  },
};

export const submissionApi = {
  submit: async (payload: Record<string, unknown>): Promise<Submission> => {
    const { data } = await apiClient.post("/submission/submit-assignment", payload);
    return data.data ?? data;
  },
  grade: async (submissionId: string, payload: { score: number; feedback?: string }): Promise<Submission> => {
    const { data } = await apiClient.patch(`/submission/${submissionId}/grade`, payload);
    return data.data ?? data;
  },
  resubmit: async (submissionId: string, payload: { content?: string; fileUrl?: string }): Promise<Submission> => {
    const { data } = await apiClient.patch(`/submission/${submissionId}/resubmit`, payload);
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
