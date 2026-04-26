"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { galleryApi } from "@/lib/api/gallery";
import type { GalleryAlbum, GalleryPhoto } from "@/lib/api/gallery";
import { Card, CardContent } from "@/components/ui/Card";
import { GalleryLightbox } from "@/components/ui/GalleryLightbox";
import { Images, CalendarDays, ArrowLeft, ImageOff } from "lucide-react";

function AlbumGrid({
  albums,
  onSelect,
}: {
  albums: GalleryAlbum[];
  onSelect: (id: string) => void;
}) {
  if (albums.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stroke dark:bg-strokedark">
            <Images className="h-7 w-7 text-body" />
          </div>
          <p className="text-sm font-medium text-black dark:text-white">No albums yet</p>
          <p className="text-xs text-body">Check back later for school event photos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {albums.map((album) => (
        <button
          key={album._id}
          onClick={() => onSelect(album._id)}
          className="group overflow-hidden rounded-xl border border-stroke bg-white text-left transition-shadow hover:shadow-md dark:border-strokedark dark:bg-boxdark"
        >
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
          </div>
          <div className="p-4">
            <p className="truncate text-sm font-semibold text-black group-hover:text-primary dark:text-white">
              {album.title}
            </p>
            {album.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-body">{album.description}</p>
            )}
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
        </button>
      ))}
    </div>
  );
}

function AlbumDetail({
  albumId,
  onBack,
}: {
  albumId: string;
  onBack: () => void;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["gallery-album-view", albumId],
    queryFn: () => galleryApi.getAlbum(albumId),
  });

  const album = data?.album;
  const photos: GalleryPhoto[] = data?.photos ?? [];

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  if (!album) {
    return <p className="text-sm text-body">Album not found.</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1 text-xs text-body hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Albums
        </button>
        <h2 className="text-base font-bold text-black dark:text-white">{album.title}</h2>
        {album.description && (
          <p className="mt-0.5 text-sm text-body">{album.description}</p>
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
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-body">No photos in this album yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo, i) => (
            <button
              key={photo._id}
              onClick={() => setLightboxIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-lg bg-stroke dark:bg-strokedark"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? `Photo ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <GalleryLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

export default function StudentGalleryPage() {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  const { data: albums = [], isLoading } = useQuery({
    queryKey: ["gallery-albums"],
    queryFn: galleryApi.getAlbums,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Images className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white">Gallery</h1>
          <p className="text-sm text-body">School events and memories</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : selectedAlbumId ? (
        <AlbumDetail albumId={selectedAlbumId} onBack={() => setSelectedAlbumId(null)} />
      ) : (
        <AlbumGrid albums={albums as GalleryAlbum[]} onSelect={setSelectedAlbumId} />
      )}
    </div>
  );
}
