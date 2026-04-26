import { apiClient } from "./client";

export interface GalleryAlbum {
  _id: string;
  title: string;
  description?: string;
  coverImage?: string;
  eventDate?: string;
  isPublished: boolean;
  photoCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryPhoto {
  _id: string;
  album: string;
  url: string;
  caption?: string;
  createdAt: string;
}

export const galleryApi = {
  getAlbums: async (): Promise<GalleryAlbum[]> => {
    const { data } = await apiClient.get("/gallery/albums");
    return data.data ?? data;
  },

  getAlbum: async (albumId: string): Promise<{ album: GalleryAlbum; photos: GalleryPhoto[] }> => {
    const { data } = await apiClient.get(`/gallery/albums/${albumId}`);
    return data.data ?? data;
  },

  createAlbum: async (payload: {
    title: string;
    description?: string;
    eventDate?: string;
    isPublished?: boolean;
  }): Promise<GalleryAlbum> => {
    const { data } = await apiClient.post("/gallery/albums", payload);
    return data.data ?? data;
  },

  updateAlbum: async (
    albumId: string,
    payload: Partial<{ title: string; description: string; eventDate: string; isPublished: boolean; coverImage: string }>
  ): Promise<GalleryAlbum> => {
    const { data } = await apiClient.patch(`/gallery/albums/${albumId}`, payload);
    return data.data ?? data;
  },

  deleteAlbum: async (albumId: string): Promise<void> => {
    await apiClient.delete(`/gallery/albums/${albumId}`);
  },

  uploadPhotos: async (
    albumId: string,
    files: File[],
    onProgress?: (pct: number) => void
  ): Promise<GalleryPhoto[]> => {
    const form = new FormData();
    files.forEach((f) => form.append("photos", f));
    const { data } = await apiClient.post(`/gallery/albums/${albumId}/photos`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          // 0–90% = bytes transferred to server; the last 10% is Cloudinary processing
          onProgress(Math.min(90, Math.round((e.loaded / e.total) * 90)));
        }
      },
    });
    return data.data ?? data;
  },

  deletePhoto: async (photoId: string): Promise<void> => {
    await apiClient.delete(`/gallery/photos/${photoId}`);
  },
};
