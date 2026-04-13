"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { classApi } from "@/lib/api/class";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Plus, Search, School, Users } from "lucide-react";
import type { Class, AuthUser } from "@/lib/types";
import { useClassLabel } from "@/hooks/useClassLabel";
import { errMsg } from "@/lib/utils/errMsg";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classId(c: unknown): string {
  if (!c) return "";
  if (typeof c === "string") return c;
  return (c as { _id: string })._id ?? "";
}

function genderStats(students: AuthUser[], cId: string) {
  const inClass = students.filter((s) => classId(s.class) === cId);
  const male = inClass.filter((s) => s.studentProfile?.gender?.toLowerCase() === "male").length;
  const female = inClass.filter((s) => s.studentProfile?.gender?.toLowerCase() === "female").length;
  const total = inClass.length;
  const malePct = total > 0 ? Math.round((male / total) * 100) : 0;
  const femalePct = total > 0 ? Math.round((female / total) * 100) : 0;
  return { total, male, female, malePct, femalePct };
}

function GenderBar({ malePct, femalePct }: { malePct: number; femalePct: number }) {
  if (malePct === 0 && femalePct === 0) return <span className="text-xs text-body">—</span>;
  return (
    <div className="flex h-2 w-full max-w-[120px] overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
      <div className="bg-primary transition-all" style={{ width: `${malePct}%` }} title={`Male ${malePct}%`} />
      <div className="bg-meta-6 transition-all" style={{ width: `${femalePct}%` }} title={`Female ${femalePct}%`} />
    </div>
  );
}

const createSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  lecturerId: z.string().min(1, "Select a lecturer"),
});
type CreateForm = z.infer<typeof createSchema>;

const assignSchema = z.object({
  classId: z.string().min(1, "Select a class"),
  lecturerId: z.string().min(1, "Select a lecturer"),
});
type AssignForm = z.infer<typeof assignSchema>;

export default function ClassesListPage() {
  const { label: classLabel, plural: classesLabel } = useClassLabel();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["admin-classes"],
    queryFn: adminApi.getClasses,
  });

  const { data: lecturers = [] } = useQuery({
    queryKey: ["admin-lecturers"],
    queryFn: adminApi.getLecturers,
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const createMutation = useMutation({
    mutationFn: classApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      setShowCreate(false);
      resetCreate();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create class";
      setFormError(msg);
    },
  });

  const assignMutation = useMutation({
    mutationFn: classApi.assignLecturer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      setShowAssign(false);
      resetAssign();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to assign lecturer";
      setFormError(msg);
    },
  });

  const {
    register: registerCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const {
    register: registerAssign,
    handleSubmit: handleAssign,
    reset: resetAssign,
    formState: { errors: assignErrors },
  } = useForm<AssignForm>({ resolver: zodResolver(assignSchema) });

  const filtered = classes.filter((c: Class) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs w-full">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body"
            aria-hidden="true"
          />
          <input
            type="text"
            aria-label="Search classes"
            placeholder="Search classes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded border border-stroke bg-transparent pl-9 pr-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowAssign(true)}>
            Assign Lecturer
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New {classLabel}
          </Button>
        </div>
      </div>

      {/* ── Overall gender stats ── */}
      {!isLoading && (allStudents as AuthUser[]).length > 0 && (() => {
        const total = (allStudents as AuthUser[]).length;
        const male = (allStudents as AuthUser[]).filter((s) => s.studentProfile?.gender?.toLowerCase() === "male").length;
        const female = (allStudents as AuthUser[]).filter((s) => s.studentProfile?.gender?.toLowerCase() === "female").length;
        const other = total - male - female;
        return (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Students", value: total, color: "text-primary", bg: "bg-primary/10" },
              { label: "Male", value: male, sub: `${total > 0 ? Math.round((male / total) * 100) : 0}%`, color: "text-primary", bg: "bg-primary/10" },
              { label: "Female", value: female, sub: `${total > 0 ? Math.round((female / total) * 100) : 0}%`, color: "text-meta-6", bg: "bg-meta-6/10" },
              { label: "Other / Unknown", value: other, sub: `${total > 0 ? Math.round((other / total) * 100) : 0}%`, color: "text-body", bg: "bg-stroke/50 dark:bg-meta-4" },
            ].map(({ label, value, sub, color, bg }) => (
              <div key={label} className="rounded-xl border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark">
                <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${bg}`}>
                  <Users className={`h-5 w-5 ${color}`} aria-hidden="true" />
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-body">{label}</p>
                {sub && <p className={`mt-0.5 text-xs font-medium ${color}`}>{sub}</p>}
              </div>
            ))}
          </div>
        );
      })()}

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary"
              role="status"
              aria-label="Loading classes"
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <School className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm text-body">
              {search ? "No classes match your search." : "No classes found."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Class Name</Th>
                <Th>Total</Th>
                <Th>Male</Th>
                <Th>Female</Th>
                <Th>Ratio</Th>
                <Th>Created</Th>
              </tr>
            </TableHead>
            <TableBody>
              {filtered.map((c: Class) => {
                const stats = genderStats(allStudents as AuthUser[], c._id);
                return (
                  <tr
                    key={c._id}
                    className="hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                          {c.name.charAt(0)}
                        </div>
                        <span className="font-medium text-black dark:text-white">
                          {c.name}
                        </span>
                      </div>
                    </Td>
                    <Td className="text-body">{stats.total}</Td>
                    <Td>
                      <span className="font-medium text-primary">{stats.male}</span>
                      {stats.total > 0 && (
                        <span className="ml-1 text-xs text-body">({stats.malePct}%)</span>
                      )}
                    </Td>
                    <Td>
                      <span className="font-medium text-meta-6">{stats.female}</span>
                      {stats.total > 0 && (
                        <span className="ml-1 text-xs text-body">({stats.femalePct}%)</span>
                      )}
                    </Td>
                    <Td>
                      <GenderBar malePct={stats.malePct} femalePct={stats.femalePct} />
                    </Td>
                    <Td className="text-xs text-body">
                      {new Date(c.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Td>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); resetCreate(); setFormError(""); }}
        title="Create Class"
      >
        <form
          onSubmit={handleCreate((values) => {
            setFormError("");
            createMutation.mutate(values);
          })}
          className="space-y-4"
        >
          <Input
            label={`${classLabel} Name`}
            placeholder="e.g. Year 1 - Science"
            error={createErrors.name?.message}
            {...registerCreate("name")}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Lecturer</label>
            <select
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              {...registerCreate("lecturerId")}
            >
              <option value="">Select a lecturer</option>
              {(lecturers as AuthUser[]).map((l) => (
                <option key={l._id} value={l._id}>{l.fullName}</option>
              ))}
            </select>
            {createErrors.lecturerId && (
              <p className="text-xs text-meta-1">{createErrors.lecturerId.message}</p>
            )}
          </div>
          {formError && (
            <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showAssign}
        onClose={() => { setShowAssign(false); resetAssign(); setFormError(""); }}
        title="Assign Lecturer to Class"
      >
        <form
          onSubmit={handleAssign((values) => {
            setFormError("");
            assignMutation.mutate(values);
          })}
          className="space-y-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Class</label>
            <select
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              {...registerAssign("classId")}
            >
              <option value="">Select a class</option>
              {classes.map((c: Class) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {assignErrors.classId && (
              <p className="text-xs text-meta-1">{assignErrors.classId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Lecturer</label>
            <select
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              {...registerAssign("lecturerId")}
            >
              <option value="">Select a lecturer</option>
              {(lecturers as AuthUser[]).map((l) => (
                <option key={l._id} value={l._id}>{l.fullName}</option>
              ))}
            </select>
            {assignErrors.lecturerId && (
              <p className="text-xs text-meta-1">{assignErrors.lecturerId.message}</p>
            )}
          </div>

          {formError && (
            <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button type="submit" isLoading={assignMutation.isPending}>Assign</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
