"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { announcementApi } from "@/lib/api/announcement";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Megaphone, CheckCheck } from "lucide-react";
import type { Announcement } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: announcementApi.getAll,
  });
  const announcements: Announcement[] = Array.isArray(data) ? data : [];

  const markReadMutation = useMutation({
    mutationFn: announcementApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <Megaphone className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-black dark:text-white">No announcements.</p>
        </div>
      ) : (
        announcements.map((a) => (
          <Card key={a._id}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                  <Megaphone className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-semibold text-black dark:text-white">{a.title}</h3>
                    <Badge variant={a.type === "system_wide" ? "info" : "warning"}>
                      {a.type === "system_wide" ? "System Wide" : "Institute"}
                    </Badge>
                    {a.isRead && (
                      <Badge variant="success">Read</Badge>
                    )}
                  </div>
                  <p className="text-sm text-body whitespace-pre-wrap">{a.body}</p>
                  <p className="mt-2 text-xs text-body">{formatDate(a.createdAt)}</p>
                </div>
                {!a.isRead && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markReadMutation.mutate(a._id)}
                    isLoading={markReadMutation.isPending && markReadMutation.variables === a._id}
                  >
                    <CheckCheck className="h-4 w-4" aria-hidden="true" />
                    Mark read
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
