"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { galleryApi } from "@/lib/api/gallery";
import type { GalleryPhoto } from "@/lib/api/gallery";
import { Card, CardContent } from "@/components/ui/Card";
import { GalleryLightbox } from "@/components/ui/GalleryLightbox";
import {
  ArrowLeft,
  Upload,
  Trash2,
  CalendarDays,
  Images,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export default function AdminAlbumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const albumId = params.albumId as string;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // photoId
  const [confirmDeleteAlbum, setConfirmDeleteAlbum] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const queryKey = ["gallery-album", albumId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => galleryApi.getAlbum(albumId),
  });

  const album = data?.album;
  const photos: GalleryPhoto[] = data?.photos ?? [];

  const togglePublish = useMutation({
    mutationFn: () =>
      galleryApi.updateAlbum(albumId, { isPublished: !album?.isPublished }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: string) => galleryApi.deletePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["gallery-albums"] });
      setConfirmDelete(null);
    },
  });

  const deleteAlbumMutation = useMutation({
    mutationFn: () => galleryApi.deleteAlbum(albumId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-albums"] });
      router.push("/admin/gallery");
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setUploadCount(files.length);
    setUploadProgress(0);
    try {
      await galleryApi.uploadPhotos(albumId, files, (pct) => setUploadProgress(pct));
      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["gallery-albums"] });
    } finally {
      setUploading(false);
      setUploadCount(0);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-body">Album not found.</p>
        <Link href="/admin/gallery" className="text-sm text-primary underline">
          Back to Gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/admin/gallery"
          className="mb-3 flex items-center gap-1 text-xs text-body hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Gallery
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-black dark:text-white">{album.title}</h1>
              <Badge variant={album.isPublished ? "success" : "default"}>
                {album.isPublished ? "Published" : "Draft"}
              </Badge>
            </div>
            {album.description && (
              <p className="mt-1 text-sm text-body">{album.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-body">
              <span className="flex items-center gap-1">
                <Images className="h-3.5 w-3.5" />
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
              </span>
              {album.eventDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(album.eventDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => togglePublish.mutate()}
              disabled={togglePublish.isPending}
              className="flex items-center gap-2 rounded-lg border border-stroke px-3 py-2 text-sm font-medium text-black hover:bg-stroke disabled:opacity-60 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
            >
              {album.isPublished ? (
                <><EyeOff className="h-4 w-4" /> Unpublish</>
              ) : (
                <><Eye className="h-4 w-4" /> Publish</>
              )}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading {uploadCount} photo{uploadCount !== 1 ? "s" : ""}…</>
              ) : (
                <><Upload className="h-4 w-4" /> Add Photos</>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Upload progress bar */}
            {uploading && (
              <div className="w-full sm:w-48">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-body">Uploading…</span>
                  <span className="text-xs font-medium text-primary">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {uploadProgress >= 90 && uploadProgress < 100 && (
                  <p className="mt-0.5 text-[11px] text-body">Processing on Cloudinary…</p>
                )}
              </div>
            )}

            <button
              onClick={() => setConfirmDeleteAlbum(true)}
              className="flex items-center gap-2 rounded-lg border border-meta-1/30 px-3 py-2 text-sm font-medium text-meta-1 hover:bg-meta-1/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete Album
            </button>
          </div>
        </div>
      </div>

      {/* Photo grid */}
      {photos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stroke dark:bg-strokedark">
              <Images className="h-7 w-7 text-body" />
            </div>
            <p className="text-sm font-medium text-black dark:text-white">No photos yet</p>
            <p className="text-xs text-body">Click "Add Photos" to upload images to this album.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {photos.map((photo, i) => (
            <div
              key={photo._id}
              role="button"
              tabIndex={0}
              aria-label={`View photo ${i + 1}`}
              onClick={() => setLightboxIndex(i)}
              onKeyDown={(e) => e.key === "Enter" && setLightboxIndex(i)}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-stroke dark:bg-strokedark"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? `Photo ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              {/* Hover overlay — click on overlay also opens lightbox; delete button stops propagation */}
              <div className="absolute inset-0 flex items-end justify-end bg-black/0 p-1.5 transition-colors group-hover:bg-black/30">
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(photo._id); }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-meta-1 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Delete photo"
                >
                  <Trash2 className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Confirm delete photo */}
      {confirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-meta-1/10">
              <Trash2 className="h-6 w-6 text-meta-1" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-black dark:text-white">Delete photo?</h3>
            <p className="mb-5 text-xs text-body">This will permanently remove the photo from Cloudinary. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-lg border border-stroke py-2 text-sm font-medium text-black hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePhotoMutation.mutate(confirmDelete)}
                disabled={deletePhotoMutation.isPending}
                className="flex-1 rounded-lg bg-meta-1 py-2 text-sm font-medium text-white hover:bg-meta-1/90 disabled:opacity-60"
              >
                {deletePhotoMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete album */}
      {confirmDeleteAlbum && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-meta-1/10">
              <Trash2 className="h-6 w-6 text-meta-1" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-black dark:text-white">Delete "{album.title}"?</h3>
            <p className="mb-5 text-xs text-body">
              All {photos.length} photo{photos.length !== 1 ? "s" : ""} in this album will be permanently deleted from Cloudinary. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteAlbum(false)}
                className="flex-1 rounded-lg border border-stroke py-2 text-sm font-medium text-black hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAlbumMutation.mutate()}
                disabled={deleteAlbumMutation.isPending}
                className="flex-1 rounded-lg bg-meta-1 py-2 text-sm font-medium text-white hover:bg-meta-1/90 disabled:opacity-60"
              >
                {deleteAlbumMutation.isPending ? "Deleting…" : "Delete Album"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
