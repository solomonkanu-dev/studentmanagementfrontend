"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { feesApi } from "@/lib/api/fees";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Plus, Pencil, Trash2, Receipt, X } from "lucide-react";
import type { FeeStructure, Class, AuthUser } from "@/lib/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  category: z.enum(["all", "class", "student"]),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  particulars: z
    .array(z.object({
      label: z.string().min(1, "Label required"),
      amount: z.coerce.number().min(0, "Must be ≥ 0"),
    }))
    .min(1, "Add at least one particular"),
});
type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiMsg(e: unknown, fallback: string) {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

function categoryLabel(f: FeeStructure): string {
  if (f.category === "class") {
    const cls = f.classId;
    return `Class: ${typeof cls === "object" && cls ? (cls as { name: string }).name : cls ?? "—"}`;
  }
  if (f.category === "student") {
    const st = f.studentId;
    return `Student: ${typeof st === "object" && st ? (st as { fullName: string }).fullName : st ?? "—"}`;
  }
  return "All Students";
}

function SelectField({
  label,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-black dark:text-white">{label}</label>
      <select
        className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-meta-1">{error}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeesParticularsPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeStructure | null>(null);
  const [apiError, setApiError] = useState("");

  const { data: structures = [], isLoading } = useQuery({
    queryKey: ["fee-structures"],
    queryFn: feesApi.getStructures,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["admin-classes"],
    queryFn: adminApi.getClasses,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fee-structures"] });

  const createMutation = useMutation({
    mutationFn: feesApi.createStructure,
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: unknown) => setApiError(apiMsg(e, "Failed to create fee structure")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      feesApi.updateStructure(id, payload),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: unknown) => setApiError(apiMsg(e, "Failed to update fee structure")),
  });

  const deleteMutation = useMutation({
    mutationFn: feesApi.deleteStructure,
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { category: "all", particulars: [{ label: "", amount: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "particulars" });
  const category = watch("category");

  function openCreate() {
    setEditing(null);
    reset({ category: "all", particulars: [{ label: "", amount: 0 }] });
    setApiError("");
    setMode("create");
  }

  function openEdit(f: FeeStructure) {
    setEditing(f);
    reset({
      category: f.category,
      classId: typeof f.classId === "object" && f.classId ? (f.classId as { _id: string })._id : (f.classId as string) ?? "",
      studentId: typeof f.studentId === "object" && f.studentId ? (f.studentId as { _id: string })._id : (f.studentId as string) ?? "",
      particulars: f.particulars.length > 0 ? f.particulars : [{ label: "", amount: 0 }],
    });
    setApiError("");
    setMode("edit");
  }

  function closeModal() {
    setMode(null);
    setEditing(null);
    reset();
    setApiError("");
  }

  function onSubmit(values: FormValues) {
    setApiError("");
    const payload: Record<string, unknown> = {
      category: values.category,
      particulars: values.particulars,
    };
    if (values.category === "class" && values.classId) payload.classId = values.classId;
    if (values.category === "student" && values.studentId) payload.studentId = values.studentId;

    if (mode === "create") {
      createMutation.mutate(payload);
    } else if (editing) {
      updateMutation.mutate({ id: editing._id, payload });
    }
  }

  const list = structures as FeeStructure[];
  const totalAmount = list.reduce((sum, f) => sum + f.totalAmount, 0);
  const maxAmount = Math.max(0, ...list.map((f) => f.totalAmount));

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryTile label="Total Structures" value={list.length} />
        <SummaryTile label="Highest Total" value={`$${maxAmount.toLocaleString()}`} />
        <SummaryTile label="Sum of All" value={`$${totalAmount.toLocaleString()}`} />
      </div>

      {/* Table card */}
      <Card>
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Fee Structures</h2>
            {list.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                {list.length}
              </span>
            )}
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Fee
          </Button>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" role="status" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Receipt className="h-10 w-10 text-body" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-black dark:text-white">No fee structures yet</p>
                <p className="mt-0.5 text-xs text-body">Define fees to assign them to students.</p>
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> Add First Fee
              </Button>
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th>Category</Th>
                  <Th>Particulars</Th>
                  <Th>Total</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </tr>
              </TableHead>
              <TableBody>
                {list.map((f) => (
                  <tr key={f._id} className="transition-colors hover:bg-meta-2 dark:hover:bg-meta-4">
                    <Td>
                      <div>
                        <Badge variant={f.category === "all" ? "info" : f.category === "class" ? "warning" : "default"}>
                          {f.category}
                        </Badge>
                        <p className="mt-0.5 text-xs text-body">{categoryLabel(f)}</p>
                      </div>
                    </Td>
                    <Td className="max-w-xs text-xs text-body">
                      {f.particulars.map((p) => (
                        <span key={p.label} className="mr-2 whitespace-nowrap">
                          {p.label} <span className="font-medium text-black dark:text-white">${p.amount}</span>
                        </span>
                      ))}
                    </Td>
                    <Td>
                      <Badge variant="success">${f.totalAmount.toLocaleString()}</Badge>
                    </Td>
                    <Td className="text-xs text-body">
                      {new Date(f.createdAt).toLocaleDateString("en-US", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(f)}
                          className="rounded p-1 text-body transition-colors hover:bg-meta-2 hover:text-primary dark:hover:bg-meta-4"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(f)}
                          className="rounded p-1 text-body transition-colors hover:bg-meta-1/10 hover:text-meta-1"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit modal */}
      <Modal
        open={mode !== null}
        onClose={closeModal}
        title={mode === "create" ? "Add Fee Structure" : "Edit Fee Structure"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <SelectField label="Category *" error={errors.category?.message} {...register("category")}>
            <option value="all">All Students</option>
            <option value="class">Specific Class</option>
            <option value="student">Specific Student</option>
          </SelectField>

          {category === "class" && (
            <SelectField label="Class *" error={errors.classId?.message} {...register("classId")}>
              <option value="">Select a class</option>
              {(classes as Class[]).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </SelectField>
          )}
          {category === "student" && (
            <SelectField label="Student *" error={errors.studentId?.message} {...register("studentId")}>
              <option value="">Select a student</option>
              {(students as AuthUser[]).map((s) => (
                <option key={s._id} value={s._id}>{s.fullName}</option>
              ))}
            </SelectField>
          )}

          {/* Particulars */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-black dark:text-white">
                Fee Particulars *
              </label>
              <button
                type="button"
                onClick={() => append({ label: "", amount: 0 })}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <input
                      placeholder="Label (e.g. Tuition Fee)"
                      className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                      {...register(`particulars.${i}.label`)}
                    />
                    {errors.particulars?.[i]?.label && (
                      <p className="text-xs text-meta-1">{errors.particulars[i]?.label?.message}</p>
                    )}
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Amount"
                      className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                      {...register(`particulars.${i}.amount`)}
                    />
                    {errors.particulars?.[i]?.amount && (
                      <p className="text-xs text-meta-1">{errors.particulars[i]?.amount?.message}</p>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="mt-1 rounded p-1 text-body hover:text-meta-1 hover:bg-meta-1/10 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {typeof errors.particulars?.message === "string" && (
              <p className="mt-1 text-xs text-meta-1">{errors.particulars.message}</p>
            )}
          </div>

          {apiError && (
            <p className="rounded border border-meta-1/30 bg-meta-1/10 px-3 py-2 text-xs text-meta-1">
              {apiError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {mode === "create" ? "Create" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Fee Structure"
      >
        <p className="text-sm text-body">
          Delete fee structure for{" "}
          <span className="font-semibold text-black dark:text-white">
            {deleteTarget ? categoryLabel(deleteTarget) : ""}
          </span>
          ? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Summary tile ─────────────────────────────────────────────────────────────

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-sm border border-stroke bg-white px-5 py-4 shadow-default dark:border-strokedark dark:bg-boxdark">
      <p className="text-xs font-medium uppercase tracking-wide text-body">{label}</p>
      <p className="mt-1 text-2xl font-bold text-black dark:text-white">{value}</p>
    </div>
  );
}
