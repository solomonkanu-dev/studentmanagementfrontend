import { apiClient } from "./client";
import type { ReportCardData, PromotionStatus, TraitRating } from "./student";

export interface ReportCardMetaPayload {
  classTeacherComment?: string;
  principalComment?: string;
  promotionStatus?: PromotionStatus;
  traitRatings?: TraitRating[];
}

/**
 * Neutral report-card endpoints — usable by admins and by the form teacher
 * (class lecturer) of the student.
 */
export const reportCardApi = {
  get: async (studentId: string, termId?: string): Promise<ReportCardData> => {
    const { data } = await apiClient.get(`/report-card/${studentId}`, {
      params: termId ? { termId } : undefined,
    });
    return data as ReportCardData;
  },

  saveMeta: async (studentId: string, payload: ReportCardMetaPayload, termId?: string) => {
    const { data } = await apiClient.put(`/report-card/${studentId}/meta`, payload, {
      params: termId ? { termId } : undefined,
    });
    return data.data ?? data;
  },
};
