"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { feesApi } from "@/lib/api/fees";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Plus, Trash2, Users, User, Building2, X, Download } from "lucide-react";
import { exportApi } from "@/lib/api/export";
import type { FeeStructure, AuthUser, Class } from "@/lib/types";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const structureSchema = z.object({
  category: z.enum(["all", "class", "student"]),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  particulars: z
    .array(z.object({ label: z.string().min(1, "Label required"), amount: z.preprocess((v) => Number(v), z.number().min(0, "Must be ≥ 0")) }))
    .min(1, "Add at least one particular"),
});
type StructureForm = z.infer<typeof structureSchema>;

const assignClassSchema = z.object({
  classId: z.string().min(1, "Select a class"),
  feeIds: z.array(z.string()).min(1, "Select at least one fee structure"),
});
type AssignClassForm = z.infer<typeof assignClassSchema>;

const assignStudentSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
});
type AssignStudentForm = z.infer<typeof assignStudentSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function errMsg(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

function categoryLabel(s: FeeStructure): string {
  if (s.category === "class") {
    const cls = s.classId;
    return `Class: ${typeof cls === "object" && cls ? cls.name : cls ?? "—"}`;
  }
  if (s.category === "student") {
    const st = s.studentId;
    return `Student: ${typeof st === "object" && st ? st.fullName : st ?? "—"}`;
  }
  return "All Students";
}

// ─── Create Fee Structure modal ───────────────────────────────────────────────

function CreateStructureModal({
  open,
  onClose,
  classes,
  students,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  classes: Class[];
  students: AuthUser[];
  onCreated: () => void;
}) {
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<StructureForm>({
    resolver: zodResolver(structureSchema) as Resolver<StructureForm>,
    defaultValues: { category: "all", particulars: [{ label: "", amount: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "particulars" });
  const category = watch("category");

  const mutation = useMutation({
    mutationFn: feesApi.createStructure,
    onSuccess: () => {
      onCreated();
      reset();
      setError("");
      onClose();
    },
    onError: (err: unknown) => setError(errMsg(err, "Failed to create fee structure")),
  });

  const handleClose = () => { reset(); setError(""); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Create Fee Structure">
      <form
        onSubmit={handleSubmit((values) => {
          setError("");
          // strip unused id fields
          const payload: Record<string, unknown> = {
            category: values.category,
            particulars: values.particulars,
          };
          if (values.category === "class" && values.classId) payload.classId = values.classId;
          if (values.category === "student" && values.studentId) payload.studentId = values.studentId;
          mutation.mutate(payload);
        })}
        className="space-y-4"
      >
        {/* Category */}
        <SelectField label="Category *" error={errors.category?.message} {...register("category")}>
          <option value="all">All Students</option>
          <option value="class">Specific Class</option>
          <option value="student">Specific Student</option>
        </SelectField>

        {/* Conditional selects */}
        {category === "class" && (
          <SelectField label="Class *" error={errors.classId?.message} {...register("classId")}>
            <option value="">Select a class</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </SelectField>
        )}
        {category === "student" && (
          <SelectField label="Student *" error={errors.studentId?.message} {...register("studentId")}>
            <option value="">Select a student</option>
            {students.map((s) => (
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
          {errors.particulars?.root && (
            <p className="mt-1 text-xs text-meta-1">{errors.particulars.root.message}</p>
          )}
          {typeof errors.particulars?.message === "string" && (
            <p className="mt-1 text-xs text-meta-1">{errors.particulars.message}</p>
          )}
        </div>

        {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>Create</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Assign to Class modal ────────────────────────────────────────────────────

function AssignClassModal({
  open,
  onClose,
  classes,
  structures,
}: {
  open: boolean;
  onClose: () => void;
  classes: Class[];
  structures: FeeStructure[];
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<AssignClassForm>({
      resolver: zodResolver(assignClassSchema),
      defaultValues: { feeIds: [] },
    });

  const mutation = useMutation({
    mutationFn: adminApi.assignFeeToClass,
    onSuccess: () => { setSuccess("Fees assigned to class successfully."); setError(""); reset(); },
    onError: (err: unknown) => { setError(errMsg(err, "Failed to assign fees to class")); setSuccess(""); },
  });

  const selectedFees = watch("feeIds") ?? [];
  const toggleFee = (id: string) => {
    setValue(
      "feeIds",
      selectedFees.includes(id) ? selectedFees.filter((f) => f !== id) : [...selectedFees, id],
      { shouldValidate: true },
    );
  };
  const handleClose = () => { reset(); setError(""); setSuccess(""); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Assign Fees to Class">
      <form
        onSubmit={handleSubmit((values) => {
          setError(""); setSuccess("");
          mutation.mutate({ classId: values.classId, fees: values.feeIds });
        })}
        className="space-y-4"
      >
        <SelectField label="Class *" error={errors.classId?.message} {...register("classId")}>
          <option value="">Select a class</option>
          {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </SelectField>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-black dark:text-white">
            Fee Structures * <span className="font-normal text-body">(select one or more)</span>
          </label>
          <div className="max-h-48 overflow-y-auto rounded border border-stroke dark:border-strokedark">
            {structures.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-body">No fee structures found.</p>
            ) : (
              structures.map((f) => (
                <label
                  key={f._id}
                  className="flex cursor-pointer items-center gap-3 border-b border-stroke px-3 py-2.5 last:border-b-0 hover:bg-meta-2 dark:border-strokedark dark:hover:bg-meta-4"
                >
                  <input
                    type="checkbox"
                    checked={selectedFees.includes(f._id)}
                    onChange={() => toggleFee(f._id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="flex-1 text-sm text-black dark:text-white">
                    {categoryLabel(f)}
                  </span>
                  <Badge variant="info">${f.totalAmount.toLocaleString()}</Badge>
                </label>
              ))
            )}
          </div>
          {errors.feeIds && <p className="text-xs text-meta-1">{errors.feeIds.message}</p>}
        </div>

        {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
        {success && <p className="rounded-md bg-meta-3/10 px-3 py-2 text-xs text-meta-3">{success}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Close</Button>
          <Button type="submit" isLoading={mutation.isPending}>Assign to Class</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Assign to All Students modal ─────────────────────────────────────────────

function AssignAllStudentsModal({
  open,
  onClose,
  students,
}: {
  open: boolean;
  onClose: () => void;
  students: AuthUser[];
}) {
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [done, setDone] = useState(false);

  const handleAssign = async () => {
    setError(""); setDone(false);
    if (students.length === 0) { setError("No students found."); return; }
    setProgress({ done: 0, total: students.length });
    let succeeded = 0;
    for (const student of students) {
      try { await adminApi.assignFeeToStudent({ studentId: student._id }); succeeded++; } catch { /* skip */ }
      setProgress({ done: succeeded, total: students.length });
    }
    setDone(true);
  };

  const handleClose = () => { setError(""); setProgress(null); setDone(false); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Assign Fees to All Students">
      <div className="space-y-4">
        <p className="text-sm text-body">
          Generates fees for all{" "}
          <span className="font-semibold text-black dark:text-white">{students.length}</span>{" "}
          students based on their class fee structure.
        </p>
        {progress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-body">
              <span>Processing…</span>
              <span>{progress.done} / {progress.total}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        {done && (
          <p className="rounded-md bg-meta-3/10 px-3 py-2 text-xs text-meta-3">
            Done — fees assigned to {progress?.done} student{progress?.done !== 1 ? "s" : ""}.
          </p>
        )}
        {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {done ? "Close" : "Cancel"}
          </Button>
          {!done && (
            <Button isLoading={!!progress && !done} onClick={handleAssign}>
              Assign to All ({students.length})
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Assign to Specific Student modal ─────────────────────────────────────────

function AssignStudentModal({
  open,
  onClose,
  students,
}: {
  open: boolean;
  onClose: () => void;
  students: AuthUser[];
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<AssignStudentForm>({ resolver: zodResolver(assignStudentSchema) });

  const mutation = useMutation({
    mutationFn: (v: AssignStudentForm) => adminApi.assignFeeToStudent({ studentId: v.studentId }),
    onSuccess: () => { setSuccess("Fees assigned successfully."); setError(""); reset(); },
    onError: (err: unknown) => { setError(errMsg(err, "Failed to assign fees")); setSuccess(""); },
  });

  const handleClose = () => { reset(); setError(""); setSuccess(""); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Assign Fees to Student">
      <form
        onSubmit={handleSubmit((v) => { setError(""); setSuccess(""); mutation.mutate(v); })}
        className="space-y-4"
      >
        <SelectField label="Student *" error={errors.studentId?.message} {...register("studentId")}>
          <option value="">Select a student</option>
          {students.map((s) => <option key={s._id} value={s._id}>{s.fullName}</option>)}
        </SelectField>
        <p className="text-xs text-body">
          Fees will be generated from the fee structures assigned to the student&apos;s class.
        </p>
        {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
        {success && <p className="rounded-md bg-meta-3/10 px-3 py-2 text-xs text-meta-3">{success}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Close</Button>
          <Button type="submit" isLoading={mutation.isPending}>Assign Fees</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showAssignClass, setShowAssignClass] = useState(false);
  const [showAssignAll, setShowAssignAll] = useState(false);
  const [showAssignStudent, setShowAssignStudent] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: feesApi.deleteStructure,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fee-structures"] }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-body">
          {(structures as FeeStructure[]).length} fee structure{(structures as FeeStructure[]).length !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowAssignClass(true)}>
            <Building2 className="h-4 w-4" aria-hidden="true" /> Assign to Class
          </Button>
          <Button variant="secondary" onClick={() => setShowAssignAll(true)}>
            <Users className="h-4 w-4" aria-hidden="true" /> Assign to All Students
          </Button>
          <Button variant="secondary" onClick={() => setShowAssignStudent(true)}>
            <User className="h-4 w-4" aria-hidden="true" /> Assign to Student
          </Button>
          <Button variant="ghost" onClick={() => exportApi.feeCollection()}>
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New Structure
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
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
              {(structures as FeeStructure[]).length === 0 ? (
                <tr>
                  <Td colSpan={5} className="py-10 text-center text-body">
                    No fee structures yet.
                  </Td>
                </tr>
              ) : (
                (structures as FeeStructure[]).map((f) => (
                  <tr key={f._id} className="hover:bg-meta-2 transition-colors dark:hover:bg-meta-4">
                    <Td>
                      <Badge variant={f.category === "all" ? "info" : f.category === "class" ? "warning" : "default"}>
                        {f.category}
                      </Badge>
                    </Td>
                    <Td className="text-body text-xs">
                      {f.particulars.map((p) => `${p.label} ($${p.amount})`).join(", ")}
                    </Td>
                    <Td>
                      <span className="font-semibold text-black dark:text-white">
                        ${f.totalAmount.toLocaleString()}
                      </span>
                    </Td>
                    <Td className="text-body text-xs">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </Td>
                    <Td>
                      <button
                        onClick={() => deleteMutation.mutate(f._id)}
                        className="rounded p-1 text-body hover:text-meta-1 hover:bg-meta-1/10 transition-colors"
                        aria-label="Delete fee structure"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modals */}
      <CreateStructureModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        classes={classes as Class[]}
        students={students as AuthUser[]}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["fee-structures"] })}
      />
      <AssignClassModal
        open={showAssignClass}
        onClose={() => setShowAssignClass(false)}
        classes={classes as Class[]}
        structures={structures as FeeStructure[]}
      />
      <AssignAllStudentsModal
        open={showAssignAll}
        onClose={() => setShowAssignAll(false)}
        students={students as AuthUser[]}
      />
      <AssignStudentModal
        open={showAssignStudent}
        onClose={() => setShowAssignStudent(false)}
        students={students as AuthUser[]}
      />
    </div>
  );
}
