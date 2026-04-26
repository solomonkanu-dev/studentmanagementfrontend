"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { announcementApi } from "@/lib/api/announcement";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Megaphone, CheckCheck, Plus, Pencil, Trash2, Users } from "lucide-react";
import type { Announcement, AnnouncementRole } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  targetRoles: z.array(z.string()).min(1, "Select at least one audience"),
  expiresAt: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const ROLE_OPTIONS: { value: AnnouncementRole; label: string }[] = [
  { value: "lecturer", label: "Lecturers" },
  { value: "student", label: "Students" },
  { value: "parent", label: "Parents" },
  { value: "admin", label: "Admins" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────

function AnnouncementModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Announcement | null;
}) {
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: editing?.title ?? "",
      body: editing?.body ?? "",
      targetRoles: editing?.targetRoles ?? ["lecturer", "student"],
      expiresAt: editing?.expiresAt ? editing.expiresAt.slice(0, 10) : "",
    },
  });

  const selectedRoles = watch("targetRoles") as string[];

  function toggleRole(role: string) {
    const current = selectedRoles;
    if (current.includes(role)) {
      setValue("targetRoles", current.filter((r) => r !== role), { shouldValidate: true });
    } else {
      setValue("targetRoles", [...current, role], { shouldValidate: true });
    }
  }

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      announcementApi.create({
        title: values.title,
        body: values.body,
        targetRoles: values.targetRoles as AnnouncementRole[],
        expiresAt: values.expiresAt || undefined,
        // type and institute are automatically set to institute_specific + admin's institute by the backend
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["my-announcements"] });
      reset();
      onClose();
    },
    onError: (e: unknown) => setApiError(errMsg(e, "Failed to create announcement")),
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      announcementApi.update(editing!._id, {
        title: values.title,
        body: values.body,
        expiresAt: values.expiresAt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["my-announcements"] });
      onClose();
    },
    onError: (e: unknown) => setApiError(errMsg(e, "Failed to update announcement")),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: FormValues) {
    setApiError("");
    if (editing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  function handleClose() {
    reset();
    setApiError("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editing ? "Edit Announcement" : "New Announcement"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-black dark:text-white">Title *</label>
          <input
            className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            placeholder="Announcement title"
            {...register("title")}
          />
          {errors.title && <p className="text-xs text-meta-1">{errors.title.message}</p>}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-black dark:text-white">Body *</label>
          <textarea
            rows={4}
            className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            placeholder="Write your announcement here…"
            {...register("body")}
          />
          {errors.body && <p className="text-xs text-meta-1">{errors.body.message}</p>}
        </div>

        {/* Target roles — only shown on create */}
        {!editing && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black dark:text-white">
              <Users className="mr-1 inline h-3.5 w-3.5" />
              Audience *
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => toggleRole(r.value)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    selectedRoles.includes(r.value)
                      ? "border-primary bg-primary text-white"
                      : "border-stroke text-body hover:border-primary hover:text-primary dark:border-strokedark",
                  ].join(" ")}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {errors.targetRoles && (
              <p className="text-xs text-meta-1">{errors.targetRoles.message as string}</p>
            )}
          </div>
        )}

        {/* Expires at */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-black dark:text-white">
            Expires on <span className="text-body">(optional)</span>
          </label>
          <input
            type="date"
            className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            {...register("expiresAt")}
          />
        </div>

        {/* Scope note */}
        <p className="rounded-lg border border-stroke bg-whiter px-3 py-2 text-xs text-body dark:border-strokedark dark:bg-meta-4">
          This announcement will be sent to your institute only.
        </p>

        {apiError && (
          <p className="rounded border border-meta-1/30 bg-meta-1/10 px-3 py-2 text-xs text-meta-1">
            {apiError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending}>
            {editing ? "Save Changes" : "Publish"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({
  target,
  onClose,
}: {
  target: Announcement | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState("");

  const mutation = useMutation({
    mutationFn: () => announcementApi.delete(target!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["my-announcements"] });
      onClose();
    },
    onError: (e: unknown) => setApiError(errMsg(e, "Failed to delete")),
  });

  return (
    <Modal open={!!target} onClose={onClose} title="Delete Announcement">
      <p className="text-sm text-body">
        Delete{" "}
        <span className="font-semibold text-black dark:text-white">
          &ldquo;{target?.title}&rdquo;
        </span>
        ? This cannot be undone.
      </p>
      {apiError && (
        <p className="mt-3 rounded border border-meta-1/30 bg-meta-1/10 px-3 py-2 text-xs text-meta-1">
          {apiError}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" isLoading={mutation.isPending} onClick={() => mutation.mutate()}>
          Delete
        </Button>
      </div>
    </Modal>
  );
}

// ─── Announcement card ────────────────────────────────────────────────────────

function AnnouncementCard({
  a,
  userId,
  onEdit,
  onDelete,
  onMarkRead,
  markingRead,
}: {
  a: Announcement;
  userId?: string;
  onEdit?: (a: Announcement) => void;
  onDelete?: (a: Announcement) => void;
  onMarkRead: (id: string) => void;
  markingRead: boolean;
}) {
  const isOwner = userId && a.createdBy === userId;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <Megaphone className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-black dark:text-white">{a.title}</h3>
              <Badge variant={a.type === "system_wide" ? "info" : "warning"}>
                {a.type === "system_wide" ? "System Wide" : "Institute"}
              </Badge>
              {a.isRead && <Badge variant="success">Read</Badge>}
              {!a.isActive && <Badge variant="danger">Inactive</Badge>}
            </div>
            <p className="text-sm text-body whitespace-pre-wrap">{a.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-xs text-body">{formatDate(a.createdAt)}</p>
              {a.expiresAt && (
                <p className="text-xs text-body">
                  Expires: {formatDate(a.expiresAt)}
                </p>
              )}
              {a.targetRoles && a.targetRoles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {a.targetRoles.map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-stroke px-2 py-0.5 text-[10px] capitalize text-body dark:border-strokedark"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!a.isRead && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMarkRead(a._id)}
                isLoading={markingRead}
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                Mark read
              </Button>
            )}
            {isOwner && onEdit && (
              <button
                onClick={() => onEdit(a)}
                className="rounded p-1.5 text-body transition-colors hover:bg-meta-2 hover:text-primary dark:hover:bg-meta-4"
                title="Edit"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {isOwner && onDelete && (
              <button
                onClick={() => onDelete(a)}
                className="rounded p-1.5 text-body transition-colors hover:bg-meta-1/10 hover:text-meta-1"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: announcementApi.getAll,
  });
  const announcements: Announcement[] = Array.isArray(data) ? data : [];

  const markReadMutation = useMutation({
    mutationFn: announcementApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  const userId = user?._id;
  const myAnnouncements = announcements.filter((a) => a.createdBy === userId);
  const displayed = activeTab === "mine" ? myAnnouncements : announcements;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-black dark:text-white">Announcements</h1>
            <p className="text-sm text-body">Manage and broadcast institute announcements</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setShowCreate(true); }}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New Announcement
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stroke dark:border-strokedark">
        {(["all", "mine"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-body hover:text-black dark:hover:text-white"
            }`}
          >
            {tab === "all" ? "All Announcements" : `My Announcements`}
            {tab === "mine" && myAnnouncements.length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                {myAnnouncements.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Summary stat for my tab */}
      {activeTab === "mine" && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Published", value: myAnnouncements.length },
            { label: "Active", value: myAnnouncements.filter((a) => a.isActive).length },
            { label: "Unread by others", value: myAnnouncements.filter((a) => !(a.isRead)).length },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold text-black dark:text-white">{s.value}</p>
                <p className="mt-0.5 text-xs text-body">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : displayed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <Megaphone className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-black dark:text-white">
                {activeTab === "mine" ? "You haven't posted any announcements yet." : "No announcements."}
              </p>
              {activeTab === "mine" && (
                <p className="mt-1 text-xs text-body">Click &ldquo;New Announcement&rdquo; to get started.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayed.map((a) => (
            <AnnouncementCard
              key={a._id}
              a={a}
              userId={userId}
              onEdit={(ann) => { setEditing(ann); setShowCreate(true); }}
              onDelete={setDeleteTarget}
              onMarkRead={(id) => markReadMutation.mutate(id)}
              markingRead={markReadMutation.isPending && markReadMutation.variables === a._id}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnnouncementModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        editing={editing}
      />
      <DeleteModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
