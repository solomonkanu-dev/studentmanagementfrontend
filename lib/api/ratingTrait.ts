import { apiClient } from "./client";
import type { RatingTrait, RatingDomain } from "../types";

export const ratingTraitApi = {
  getAll: async (domain?: RatingDomain): Promise<RatingTrait[]> => {
    const { data } = await apiClient.get("/rating-trait", {
      params: domain ? { domain } : undefined,
    });
    return data.data ?? data;
  },

  create: async (payload: { domain: RatingDomain; name: string }): Promise<RatingTrait> => {
    const { data } = await apiClient.post("/rating-trait", payload);
    return data.data ?? data;
  },

  update: async (id: string, payload: { name?: string; order?: number }): Promise<RatingTrait> => {
    const { data } = await apiClient.put(`/rating-trait/${id}`, payload);
    return data.data ?? data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/rating-trait/${id}`);
  },
};
