"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useController, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { z } from "zod";
import { announcementApi } from "@/lib/api/announcement";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Megaphone, Plus, Pencil, Trash2, Eye } from "lucide-react";
import type { Announcement, AnnouncementRole } from "@/lib/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const ROLES: AnnouncementRole[] = ["admin", "lecturer", "student", "super_admin"];

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  type: z.enum(["system_wide", "institute_specific"]).default("system_wide"),
  institute: z.string().optional(),
  targetRoles: z.array(z.enum(["admin", "lecturer", "student", "super_admin"])).default([]),
  expiresAt: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.type === "institute_specific" && !val.institute) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Institute is required", path: ["institute"] });
  }
});
type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errMsg(e: unknown, fallback: string) {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Role checkboxes ─────────────────────────────────────────────────────────

function RoleCheckboxes({ control }: { control: Control<FormValues> }) {
  const { field } = useController({ control, name: "targetRoles" });
  const selected: AnnouncementRole[] = field.value ?? [];

  const toggle = (role: AnnouncementRole) => {
    const next = selected.includes(role)
      ? selected.filter((r) => r !== role)
      : [...selected, role];
    field.onChange(next);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ROLES.map((role) => (
        <label key={role} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(role)}
            onChange={() => toggle(role)}
            className="h-4 w-4 rounded border-stroke accent-primary"
          />
          <span className="text-sm text-black dark:text-white capitalize">{role.replace("_", " ")}</span>
        </label>
      ))}
    </div>
  );
}

// ─── Announcement Form Modal ──────────────────────────────────────────────────

function AnnouncementModal({
  existing,
  onClose,
  onSuccess,
}: {
  existing?: Announcement | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");
  const isEdit = !!existing;

  const { data: institutesData } = useQuery({
    queryKey: ["institutes-list"],
    queryFn: async () => {
      const { data } = await apiClient.get("/super-admin/monitor/institutes");
      return (data.data ?? []) as Array<{ institute: { id: string; name: string } }>;
    },
  });
  const institutes = institutesData ?? [];

  const { register, handleSubmit, formState: { errors }, control } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: existing
      ? {
          title: existing.title,
          body: existing.body,
          type: existing.type,
          institute: typeof existing.institute === "object" ? (existing.institute as { _id?: string })?._id : existing.institute ?? "",
          targetRoles: existing.targetRoles ?? [],
          expiresAt: existing.expiresAt ? existing.expiresAt.slice(0, 10) : "",
        }
      : { type: "system_wide", institute: "", targetRoles: [] },
  });

  const selectedType = useWatch({ control, name: "type" });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        title: values.title,
        body: values.body,
        type: values.type,
        institute: values.type === "institute_specific" ? values.institute : undefined,
        expiresAt: values.expiresAt || undefined,
        targetRoles: (values.targetRoles.length > 0
          ? (values.targetRoles.includes("super_admin") ? values.targetRoles : [...values.targetRoles, "super_admin"])
          : ["admin", "lecturer", "student", "super_admin"]) as import("@/lib/types").AnnouncementRole[],
      };
      return isEdit
        ? announcementApi.update(existing!._id, payload)
        : announcementApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      onSuccess();
    },
    onError: (e: unknown) => setServerError(errMsg(e, "Failed to save announcement.")),
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit Announcement" : "New Announcement"}>
      <form onSubmit={handleSubmit((v) => { setServerError(""); mutation.mutate(v); })} className="space-y-4">
        <Input label="Title *" placeholder="Announcement title" error={errors.title?.message} {...register("title")} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">Body *</label>
          <textarea
            rows={4}
            placeholder="Write your announcement..."
            className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            {...register("body")}
          />
          {errors.body && <p className="text-xs text-meta-1">{errors.body.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">Type</label>
          <select
            className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            {...register("type")}
          >
            <option value="system_wide">System Wide</option>
            <option value="institute_specific">Institute Specific</option>
          </select>
        </div>

        {selectedType === "institute_specific" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Institute *</label>
            <select
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              {...register("institute")}
            >
              <option value="">— Select institute —</option>
              {institutes.map(({ institute: inst }) => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
            {errors.institute && <p className="text-xs text-meta-1">{errors.institute.message}</p>}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">
            Target Roles <span className="text-xs text-body">(leave empty for all)</span>
          </label>
          <RoleCheckboxes control={control} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">Expires At (optional)</label>
          <input
            type="date"
            className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            {...register("expiresAt")}
          />
        </div>

        {serverError && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{serverError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEdit ? "Save Changes" : "Publish"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Read Status Modal ────────────────────────────────────────────────────────

function ReadStatusModal({ announcement, onClose }: { announcement: Announcement; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["announcement-read-status", announcement._id],
    queryFn: () => announcementApi.getReadStatus(announcement._id),
  });

  type ReadEntry = { user: { fullName?: string; email?: string; role?: string } | null; readAt?: string };
  const rawReaders: ReadEntry[] = Array.isArray(data) ? data : data?.readBy ?? [];
  const readers = rawReaders.map((r) => ({
    fullName: r.user?.fullName ?? "",
    email: r.user?.email ?? "",
    role: r.user?.role ?? "",
  }));

  const total: number = data?.total ?? readers.length;

  return (
    <Modal open onClose={onClose} title={`Read by — ${announcement.title}`}>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-body">{total} reader{total !== 1 ? "s" : ""}</p>
          {readers.length === 0 ? (
            <p className="py-4 text-center text-sm text-body">Nobody has read this yet.</p>
          ) : (
            <ul className="divide-y divide-stroke dark:divide-strokedark max-h-80 overflow-y-auto">
              {readers.map((r, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-meta-2 text-xs font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                    {r.fullName?.charAt(0) ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">{r.fullName}</p>
                    <p className="text-xs text-body">{r.email} · {r.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperAdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [readStatusTarget, setReadStatusTarget] = useState<Announcement | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: announcementApi.getAll,
  });
  const announcements: Announcement[] = Array.isArray(data) ? data : [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setDeleteTarget(null);
    },
    onError: (e: unknown) => setDeleteError(errMsg(e, "Failed to delete.")),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-body">{announcements.length} announcement{announcements.length !== 1 ? "s" : ""}</p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Announcement
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                <Megaphone className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-black dark:text-white">No announcements yet.</p>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Create First
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <tr>
                    <Th>Title</Th>
                    <Th>Type</Th>
                    <Th>Target Roles</Th>
                    <Th>Published</Th>
                    <Th>Actions</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {announcements.map((a) => (
                    <tr key={a._id}>
                      <Td>
                        <div>
                          <p className="font-medium text-black dark:text-white">{a.title}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-body">{a.body}</p>
                        </div>
                      </Td>
                      <Td>
                        <Badge variant={a.type === "system_wide" ? "info" : "warning"}>
                          {a.type === "system_wide" ? "System Wide" : "Institute Specific"}
                        </Badge>
                      </Td>
                      <Td>
                        {a.targetRoles && a.targetRoles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {a.targetRoles.map((r) => (
                              <Badge key={r} variant="default">{r}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-body">All roles</span>
                        )}
                      </Td>
                      <Td>{formatDate(a.createdAt)}</Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setReadStatusTarget(a)}
                            className="rounded p-1.5 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
                            aria-label="View read status"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => setEditTarget(a)}
                            className="rounded p-1.5 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => { setDeleteTarget(a); setDeleteError(""); }}
                            className="rounded p-1.5 text-body hover:bg-meta-1/10 hover:text-meta-1 transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {(showCreate || editTarget) && (
        <AnnouncementModal
          existing={editTarget}
          onClose={() => { setShowCreate(false); setEditTarget(null); }}
          onSuccess={() => { setShowCreate(false); setEditTarget(null); }}
        />
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="Delete Announcement">
          <p className="text-sm text-body mb-4">
            Are you sure you want to delete <span className="font-medium text-black dark:text-white">{deleteTarget.title}</span>? This cannot be undone.
          </p>
          {deleteError && <p className="mb-3 rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{deleteError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteMutation.mutate(deleteTarget._id)} isLoading={deleteMutation.isPending}>
              Delete
            </Button>
          </div>
        </Modal>
      )}

      {readStatusTarget && (
        <ReadStatusModal announcement={readStatusTarget} onClose={() => setReadStatusTarget(null)} />
      )}
    </div>
  );
}
