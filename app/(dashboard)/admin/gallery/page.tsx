"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { galleryApi } from "@/lib/api/gallery";
import type { GalleryAlbum } from "@/lib/api/gallery";
import { Card, CardContent } from "@/components/ui/Card";
import { Images, Plus, CalendarDays, ImageOff, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

const albumSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  isPublished: z.boolean().optional(),
});
type AlbumForm = z.infer<typeof albumSchema>;

function CreateAlbumModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<AlbumForm>({
    resolver: zodResolver(albumSchema),
    defaultValues: { isPublished: false },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: galleryApi.createAlbum,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-albums"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark">
        <h2 className="mb-4 text-base font-semibold text-black dark:text-white">New Album</h2>
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-black dark:text-white">
              Title <span className="text-meta-1">*</span>
            </label>
            <input
              {...register("title")}
              placeholder="e.g. Sports Day 2025"
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-meta-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black dark:text-white">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Optional description…"
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black dark:text-white">
              Event Date
            </label>
            <input
              type="date"
              {...register("eventDate")}
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register("isPublished")} className="h-4 w-4 rounded border-stroke" />
            <span className="text-sm text-black dark:text-white">Publish immediately</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stroke py-2 text-sm font-medium text-black hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {isPending ? "Creating…" : "Create Album"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AlbumCard({ album }: { album: GalleryAlbum }) {
  return (
    <Link
      href={`/admin/gallery/${album._id}`}
      className="group block overflow-hidden rounded-xl border border-stroke bg-white transition-shadow hover:shadow-md dark:border-strokedark dark:bg-boxdark"
    >
      {/* Cover image */}
      <div className="relative aspect-video w-full overflow-hidden bg-stroke dark:bg-strokedark">
        {album.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.coverImage}
            alt={album.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-8 w-8 text-body opacity-40" />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <Badge variant={album.isPublished ? "success" : "default"}>
            {album.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-black dark:text-white group-hover:text-primary">
              {album.title}
            </p>
            {album.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-body">{album.description}</p>
            )}
          </div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-body group-hover:text-primary" />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-body">
          <span className="flex items-center gap-1">
            <Images className="h-3.5 w-3.5" />
            {album.photoCount ?? 0} photo{(album.photoCount ?? 0) !== 1 ? "s" : ""}
          </span>
          {album.eventDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(album.eventDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function AdminGalleryPage() {
  const [showCreate, setShowCreate] = useState(false);

  const { data: albums = [], isLoading } = useQuery({
    queryKey: ["gallery-albums"],
    queryFn: galleryApi.getAlbums,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Images className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-black dark:text-white">Gallery</h1>
            <p className="text-sm text-body">Manage school event albums and photos</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Album
        </button>
      </div>

      {/* Albums grid */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : (albums as GalleryAlbum[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stroke dark:bg-strokedark">
              <Images className="h-7 w-7 text-body" />
            </div>
            <p className="text-sm font-medium text-black dark:text-white">No albums yet</p>
            <p className="text-xs text-body">Create your first album to start adding photos.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-1 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Album
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(albums as GalleryAlbum[]).map((album) => (
            <AlbumCard key={album._id} album={album} />
          ))}
        </div>
      )}

      {showCreate && <CreateAlbumModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
