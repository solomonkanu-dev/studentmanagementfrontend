import { apiClient } from "./client";

export const uploadApi = {
  profilePhoto: async (file: File): Promise<{ profilePhoto: string }> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post("/upload/profile-photo", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  getProfilePhoto: async (): Promise<{ profilePhoto: string }> => {
    const { data } = await apiClient.get("/upload/profile-photo");
    return data;
  },

  instituteLogo: async (file: File): Promise<{ logoUrl: string }> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post("/upload/institute-logo", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  assignmentFile: async (file: File): Promise<{ fileUrl: string }> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post("/upload/assignment-file", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
