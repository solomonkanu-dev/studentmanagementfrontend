"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adminParentApi } from "@/lib/api/parent";
import { adminApi } from "@/lib/api/admin";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import {
  Plus,
  UserPlus,
  Link2,
  Link2Off,
  ShieldOff,
  ShieldCheck,
  Users,
  Search,
} from "lucide-react";
import type { AuthUser } from "@/lib/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  fullName: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Min 6 characters"),
  linkedStudents: z.string().optional(), // comma-separated IDs, resolved via UI
});
type CreateForm = z.infer<typeof createSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Parent {
  _id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  linkedStudents: { _id: string; fullName: string; class?: { name: string } | string }[];
  createdAt: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParentsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [linkModal, setLinkModal] = useState<{ parentId: string; parentName: string } | null>(null);
  const [search, setSearch] = useState("");

  const { data: parents = [], isLoading } = useQuery({
    queryKey: ["admin-parents"],
    queryFn: adminParentApi.getAll,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) =>
      adminParentApi.create({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-parents"] });
      setShowCreate(false);
      reset();
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (parentId: string) => adminParentApi.revoke(parentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-parents"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (parentId: string) => adminParentApi.restore(parentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-parents"] }),
  });

  const filtered = (parents as Parent[]).filter(
    (p) =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-black dark:text-white">Parents</h1>
            <p className="text-sm text-body">Manage parent/guardian accounts</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Parent
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search parents…"
          className="w-full rounded-xl border border-stroke bg-white py-2 pl-9 pr-4 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
        />
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <CardContent className="flex h-32 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          </CardContent>
        ) : filtered.length === 0 ? (
          <CardContent className="py-10 text-center text-sm text-body">
            No parents found. Add one to get started.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <tr>
                  {["Name", "Email", "Linked Children", "Status", "Actions"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </TableHead>
              <TableBody>
                {filtered.map((parent) => (
                  <tr key={parent._id} className="hover:bg-whiter dark:hover:bg-meta-4/30">
                    <Td>
                      <p className="font-medium text-black dark:text-white">{parent.fullName}</p>
                    </Td>
                    <Td className="text-body">{parent.email}</Td>
                    <Td>
                      {parent.linkedStudents?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {parent.linkedStudents.map((s) => (
                            <span
                              key={s._id}
                              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                            >
                              {s.fullName}
                              <button
                                onClick={() =>
                                  unlinkConfirm(parent._id, s._id, qc)
                                }
                                className="ml-0.5 text-meta-1 hover:text-meta-1/70"
                                title="Unlink student"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-body italic">None</span>
                      )}
                    </Td>
                    <Td>
                      <Badge variant={parent.isActive ? "success" : "danger"}>
                        {parent.isActive ? "Active" : "Revoked"}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setLinkModal({ parentId: parent._id, parentName: parent.fullName })}
                          title="Link a student"
                          className="rounded p-1 text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Link2 className="h-4 w-4" />
                        </button>
                        {parent.isActive ? (
                          <button
                            onClick={() => {
                              if (confirm(`Revoke access for ${parent.fullName}?`)) {
                                revokeMutation.mutate(parent._id);
                              }
                            }}
                            title="Revoke access"
                            className="rounded p-1 text-meta-1 hover:bg-meta-1/10 transition-colors"
                          >
                            <ShieldOff className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (confirm(`Restore access for ${parent.fullName}?`)) {
                                restoreMutation.mutate(parent._id);
                              }
                            }}
                            title="Restore access"
                            className="rounded p-1 text-meta-3 hover:bg-meta-3/10 transition-colors"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Add Parent Account">
        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Full Name</label>
            <Input {...register("fullName")} placeholder="e.g. Mrs. Amara Johnson" />
            {errors.fullName && <p className="mt-1 text-xs text-meta-1">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">Email</label>
            <Input {...register("email")} type="email" placeholder="parent@example.com" />
            {errors.email && <p className="mt-1 text-xs text-meta-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
              Temporary Password
            </label>
            <Input {...register("password")} type="password" placeholder="Min 6 characters" />
            {errors.password && <p className="mt-1 text-xs text-meta-1">{errors.password.message}</p>}
          </div>
          {createMutation.isError && (
            <p className="text-xs text-meta-1">
              {(createMutation.error as Error)?.message ?? "Failed to create parent"}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Account"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Link student modal */}
      {linkModal && (
        <LinkStudentModal
          parentId={linkModal.parentId}
          parentName={linkModal.parentName}
          students={students as AuthUser[]}
          onClose={() => setLinkModal(null)}
          onLinked={() => {
            qc.invalidateQueries({ queryKey: ["admin-parents"] });
            setLinkModal(null);
          }}
        />
      )}
    </div>
  );
}

// Helper: unlink inline
async function unlinkConfirm(parentId: string, studentId: string, qc: ReturnType<typeof useQueryClient>) {
  if (!confirm("Unlink this student from the parent?")) return;
  try {
    await adminParentApi.unlinkStudent(parentId, studentId);
    qc.invalidateQueries({ queryKey: ["admin-parents"] });
  } catch {
    alert("Failed to unlink student");
  }
}

// ─── Link student modal ───────────────────────────────────────────────────────

function LinkStudentModal({
  parentId,
  parentName,
  students,
  onClose,
  onLinked,
}: {
  parentId: string;
  parentName: string;
  students: AuthUser[];
  onClose: () => void;
  onLinked: () => void;
}) {
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);

  const filtered = students.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase())
  );

  async function link(studentId: string) {
    setLinking(studentId);
    try {
      await adminParentApi.linkStudent(parentId, studentId);
      onLinked();
    } catch {
      alert("Failed to link student");
    } finally {
      setLinking(null);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Link Student → ${parentName}`}>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students…"
            className="w-full rounded-xl border border-stroke bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
          />
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-stroke dark:divide-strokedark">
          {filtered.slice(0, 30).map((s) => (
            <div key={s._id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-black dark:text-white">{s.fullName}</p>
                <p className="text-xs text-body">{s.email}</p>
              </div>
              <button
                onClick={() => link(s._id)}
                disabled={linking === s._id}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {linking === s._id ? "Linking…" : "Link"}
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-xs text-body">No students found</p>
          )}
        </div>
        <div className="flex justify-end pt-1">
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
