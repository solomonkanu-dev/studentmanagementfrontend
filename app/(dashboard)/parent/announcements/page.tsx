"use client";

import { useQuery } from "@tanstack/react-query";
import { parentApi } from "@/lib/api/parent";
import { Card, CardContent } from "@/components/ui/Card";
import { Megaphone } from "lucide-react";

interface Announcement {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  author?: { fullName: string };
}

export default function ParentAnnouncementsPage() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["parent-announcements"],
    queryFn: parentApi.getAnnouncements,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white">Announcements</h1>
          <p className="text-sm text-body">School notices and updates</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : (announcements as Announcement[]).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-body">
            No announcements at this time.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(announcements as Announcement[]).map((a) => (
            <Card key={a._id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Megaphone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-black dark:text-white">{a.title}</p>
                    <p className="mt-1 text-sm text-body leading-relaxed">{a.content}</p>
                    <p className="mt-2 text-[11px] text-body">
                      {new Date(a.createdAt).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {a.author?.fullName && ` · ${a.author.fullName}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
