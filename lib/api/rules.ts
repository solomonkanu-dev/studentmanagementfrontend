import { apiClient } from "./client";
import type { RuleBook, RuleSection } from "../types";

export const rulesApi = {
  get: async (): Promise<RuleBook> => {
    const { data } = await apiClient.get("/rules");
    return data.data ?? data;
  },

  getDefaults: async (): Promise<{ sections: RuleSection[] }> => {
    const { data } = await apiClient.get("/rules/defaults");
    return data.data ?? data;
  },

  update: async (sections: RuleSection[]): Promise<RuleBook> => {
    const { data } = await apiClient.put("/rules", { sections });
    return data.data ?? data;
  },
};
