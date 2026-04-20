"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { feesApi } from "@/lib/api/fees";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Plus, Trash2, Users, User, Building2, X, Download, Receipt } from "lucide-react";
import { exportApi } from "@/lib/api/export";
import type { FeeStructure, AuthUser, Class } from "@/lib/types";
import Link from "next/link";
import type { FeePayment } from "@/lib/api/student";
import { errMsg } from "@/lib/utils/errMsg";

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


const recordPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum(["cash", "bank_transfer", "card", "mobile_money", "cheque"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
type RecordPaymentForm = z.infer<typeof recordPaymentSchema>;

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

function formatMethod(method: string): string {
  const map: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    card: "Card",
    mobile_money: "Mobile Money",
    cheque: "Cheque",
  };
  return map[method] ?? method;
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
  const [autoAssign, setAutoAssign] = useState(false);
  const [assignProgress, setAssignProgress] = useState<{ processed: number; total: number } | null>(null);
  const [assignResult, setAssignResult] = useState<{ assigned: number; skipped: number; failed: number } | null>(null);

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

  const runAutoAssign = async (studentList: AuthUser[]) => {
    if (studentList.length === 0) return;
    setAssignProgress({ processed: 0, total: studentList.length });
    let assigned = 0; let skipped = 0; let failed = 0;
    for (const student of studentList) {
      try {
        await adminApi.assignFeeToStudent({ studentId: student._id });
        assigned++;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409) {
          skipped++;
        } else {
          failed++;
          console.error(`Failed to assign fee to student ${student._id}:`, err);
        }
      }
      setAssignProgress({ processed: assigned + skipped + failed, total: studentList.length });
    }
    setAssignProgress(null);
    setAssignResult({ assigned, skipped, failed });
  };

  const mutation = useMutation({
    mutationFn: feesApi.createStructure,
    onSuccess: async () => {
      onCreated();
      setError("");
      if (autoAssign && category === "all") {
        await runAutoAssign(students);
        // modal stays open to show result
      } else {
        reset();
        setAutoAssign(false);
        onClose();
      }
    },
    onError: (err: unknown) => setError(errMsg(err, "Failed to create fee structure")),
  });

  const handleClose = () => {
    reset();
    setError("");
    setAutoAssign(false);
    setAssignProgress(null);
    setAssignResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create Fee Structure">
      <form
        onSubmit={handleSubmit((values) => {
          setError("");
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
        <SelectField label="Category *" error={errors.category?.message} {...register("category")}>
          <option value="all">All Students</option>
          <option value="class">Specific Class</option>
          <option value="student">Specific Student</option>
        </SelectField>

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

        {category === "all" && !assignResult && (
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-stroke px-3 py-2.5 hover:bg-meta-2 dark:border-strokedark dark:hover:bg-meta-4">
            <input
              type="checkbox"
              checked={autoAssign}
              onChange={(e) => setAutoAssign(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm text-black dark:text-white">
              Assign to all students immediately
              <span className="ml-1 text-xs text-body">({students.length} student{students.length !== 1 ? "s" : ""})</span>
            </span>
          </label>
        )}

        {assignProgress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-body">
              <span>Assigning fees…</span>
              <span>{assignProgress.processed} / {assignProgress.total}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(assignProgress.processed / assignProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {assignResult && (
          <div className="rounded-md bg-meta-3/10 px-3 py-2 text-xs text-meta-3 space-y-0.5">
            <p>Created and assigned to {assignResult.assigned} student{assignResult.assigned !== 1 ? "s" : ""}.</p>
            {assignResult.skipped > 0 && (
              <p className="text-body">{assignResult.skipped} already had fees assigned (skipped).</p>
            )}
            {assignResult.failed > 0 && (
              <p className="text-meta-1">{assignResult.failed} failed to assign due to errors.</p>
            )}
          </div>
        )}

        {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {assignResult ? "Close" : "Cancel"}
          </Button>
          {!assignResult && (
            <Button type="submit" isLoading={mutation.isPending || !!assignProgress}>
              {autoAssign && category === "all" ? "Create & Assign" : "Create"}
            </Button>
          )}
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
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  classes: Class[];
  structures: FeeStructure[];
  onAssigned?: () => void;
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
    onSuccess: (res: unknown) => {
      const r = res as { assigned?: number; skipped?: number };
      const msg = `Assigned to ${r.assigned ?? 0} student${(r.assigned ?? 0) !== 1 ? "s" : ""}${(r.skipped ?? 0) > 0 ? `, ${r.skipped} already had fees (skipped)` : ""}.`;
      setSuccess(msg);
      setError("");
      reset();
      onAssigned?.();
    },
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
                  <Badge variant="info">Nle {f.totalAmount.toLocaleString()}</Badge>
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
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  students: AuthUser[];
  onAssigned?: () => void;
}) {
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [result, setResult] = useState<{ assigned: number; skipped: number; failed: number } | null>(null);

  const handleAssign = async () => {
    setError(""); setResult(null);
    if (students.length === 0) { setError("No students found."); return; }
    setProgress({ processed: 0, total: students.length });
    let assigned = 0; let skipped = 0; let failed = 0;
    for (const student of students) {
      try {
        await adminApi.assignFeeToStudent({ studentId: student._id });
        assigned++;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409) skipped++; // already assigned
        else failed++;               // no structure, no class, etc.
      }
      setProgress({ processed: assigned + skipped + failed, total: students.length });
    }
    setProgress(null);
    setResult({ assigned, skipped, failed });
    if (assigned > 0) onAssigned?.();
  };

  const handleClose = () => { setError(""); setProgress(null); setResult(null); onClose(); };

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
              <span>{progress.processed} / {progress.total}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        {result && (
          <div className="rounded-md bg-meta-3/10 px-3 py-2 text-xs text-meta-3 space-y-0.5">
            <p>Done — {result.assigned} student{result.assigned !== 1 ? "s" : ""} newly assigned.</p>
            {result.skipped > 0 && (
              <p className="text-body">{result.skipped} already had fees assigned (skipped).</p>
            )}
            {result.failed > 0 && (
              <p className="text-meta-1">{result.failed} failed — these students may have no class or no applicable fee structure.</p>
            )}
          </div>
        )}
        {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button isLoading={!!progress} onClick={handleAssign}>
              Assign to All ({students.length})
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Assign to Specific Student modal ─────────────────────────────────────────

type Particular = { label: string; amount: number };
type FeeStructureOption = { _id: string; category: string; particulars: Particular[] };

function AssignStudentModal({
  open,
  onClose,
  students,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  students: AuthUser[];
  onAssigned?: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [structures, setStructures] = useState<FeeStructureOption[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load fee structures when student changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!studentId) { setStructures([]); setChecked(new Set()); return; }
    setLoadingStructures(true);
    setError(""); setSuccess("");
    adminApi.getFeeStructuresForStudent(studentId)
      .then((data) => {
        setStructures(data);
        // Pre-check all particulars by default
        const all = new Set<string>();
        data.forEach((s) => s.particulars.forEach((_, i) => all.add(`${s._id}-${i}`)));
        setChecked(all);
      })
      .catch(() => setError("Failed to load fee structures for this student."))
      .finally(() => setLoadingStructures(false));
  }, [studentId]);

  const toggleParticular = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectedParticulars: Particular[] = structures.flatMap((s) =>
    s.particulars
      .filter((_, i) => checked.has(`${s._id}-${i}`))
      .map((p) => ({ label: p.label, amount: p.amount }))
  );

  const mutation = useMutation({
    mutationFn: () => adminApi.assignFeeToStudent({ studentId, selectedParticulars }),
    onSuccess: () => { setSuccess("Fees assigned successfully."); setError(""); onAssigned?.(); },
    onError: (err: unknown) => { setError(errMsg(err, "Failed to assign fees")); setSuccess(""); },
  });

  const handleClose = () => {
    setStudentId(""); setStructures([]); setChecked(new Set());
    setError(""); setSuccess(""); onClose();
  };

  const total = selectedParticulars.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Modal open={open} onClose={handleClose} title="Assign Fees to Student">
      <div className="space-y-4">
        <SelectField
          label="Student *"
          value={studentId}
          onChange={(e) => { setStudentId(e.target.value); setSuccess(""); }}
        >
          <option value="">Select a student</option>
          {students.map((s) => <option key={s._id} value={s._id}>{s.fullName}</option>)}
        </SelectField>

        {loadingStructures && (
          <div className="flex items-center gap-2 text-xs text-body">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            Loading fee particulars…
          </div>
        )}

        {!loadingStructures && studentId && structures.length === 0 && (
          <p className="text-xs text-body">No fee structures found for this student.</p>
        )}

        {structures.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-body">
              Select Fee Particulars
            </p>
            {structures.map((s) => (
              <div key={s._id} className="rounded border border-stroke p-3 dark:border-strokedark space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-body">
                  {s.category === "all" ? "All Students" : s.category === "class" ? "Class" : "Student-specific"}
                </p>
                {s.particulars.map((p, i) => {
                  const key = `${s._id}-${i}`;
                  return (
                    <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded px-1 py-1 hover:bg-whiter dark:hover:bg-meta-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked.has(key)}
                          onChange={() => toggleParticular(key)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm text-black dark:text-white">{p.label}</span>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-black dark:text-white">
                        NLe {p.amount.toLocaleString()}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
            <div className="flex items-center justify-between rounded border border-stroke bg-whiter px-3 py-2 dark:border-strokedark dark:bg-meta-4">
              <span className="text-xs font-semibold text-black dark:text-white">Total</span>
              <span className="text-sm font-bold text-primary">NLe {total.toLocaleString()}</span>
            </div>
          </div>
        )}

        {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
        {success && <p className="rounded-md bg-meta-3/10 px-3 py-2 text-xs text-meta-3">{success}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Close</Button>
          <Button
            onClick={() => { setError(""); setSuccess(""); mutation.mutate(); }}
            isLoading={mutation.isPending}
            disabled={!studentId || selectedParticulars.length === 0 || !!success}
          >
            Assign Fees ({selectedParticulars.length})
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Record Payment modal ──────────────────────────────────────────────────────

function RecordPaymentModal({
  open,
  onClose,
  studentId,
  balance,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  balance: number;
  onRecorded: () => void;
}) {
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecordPaymentForm>({
    resolver: zodResolver(recordPaymentSchema) as Resolver<RecordPaymentForm>,
    defaultValues: { method: "cash" },
  });

  const mutation = useMutation({
    mutationFn: (values: RecordPaymentForm) =>
      adminApi.recordPayment(studentId, {
        amount: values.amount,
        method: values.method,
        reference: values.reference,
        notes: values.notes,
      }),
    onSuccess: () => {
      onRecorded();
      reset();
      setError("");
      onClose();
    },
    onError: (err: unknown) => setError(errMsg(err, "Failed to record payment")),
  });

  const handleClose = () => { reset(); setError(""); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Record Payment">
      <form
        onSubmit={handleSubmit((values) => { setError(""); mutation.mutate(values); })}
        className="space-y-4"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-black dark:text-white">
            Amount * <span className="font-normal text-body">(max: {balance.toLocaleString()})</span>
          </label>
          <input
            type="number"
            step="0.01"
            max={balance}
            placeholder="Enter amount"
            className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            {...register("amount")}
          />
          {errors.amount && <p className="text-xs text-meta-1">{errors.amount.message}</p>}
        </div>

        <SelectField label="Payment Method *" error={errors.method?.message} {...register("method")}>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="card">Card</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="cheque">Cheque</option>
        </SelectField>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-black dark:text-white">
            Reference <span className="font-normal text-body">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="Transaction reference"
            className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            {...register("reference")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-black dark:text-white">
            Notes <span className="font-normal text-body">(optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Any additional notes"
            className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            {...register("notes")}
          />
        </div>

        {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>Record Payment</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Student Payments tab ──────────────────────────────────────────────────────

interface AdminStudentFeeRecord {
  _id: string;
  student: { _id: string; fullName: string; email: string } | null;
  class: { _id: string; name: string } | string | null;
  totalAmount: number;
  balance: number;
  status: string;
}

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "default"> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
};

function StudentPaymentsTab({ classes }: { classes: Class[] }) {
  const queryClient = useQueryClient();
  const [selectedFee, setSelectedFee] = useState<AdminStudentFeeRecord | null>(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("");

  const { data: feeRecords = [], isLoading } = useQuery({
    queryKey: ["admin-student-fees"],
    queryFn: adminApi.getStudentFees,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["admin-student-payments", showHistory],
    queryFn: () => adminApi.getStudentPayments(showHistory!),
    enabled: !!showHistory,
  });

  const allRecords = feeRecords as AdminStudentFeeRecord[];
  const records = classFilter
    ? allRecords.filter((r) => {
        const classId = typeof r.class === "object" && r.class ? r.class._id : r.class;
        return classId === classFilter;
      })
    : allRecords;
  const paymentList = payments as FeePayment[];

  const handlePaymentRecorded = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-student-fees"] });
    queryClient.invalidateQueries({ queryKey: ["admin-student-payments", showHistory] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* All fee records table */}
      <Card>
        <div className="border-b border-stroke px-5 py-3 dark:border-strokedark">
          <div className="flex items-center gap-3">
            <label className="shrink-0 text-xs font-medium text-black dark:text-white">Filter by class</label>
            <select
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setShowHistory(null); setSelectedFee(null); }}
              className="h-8 rounded border border-stroke bg-transparent px-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {classFilter && (
              <span className="text-xs text-body">
                {records.length} student{records.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        {records.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Receipt className="h-8 w-8 text-body" aria-hidden="true" />
            <p className="text-sm font-medium text-black dark:text-white">
              {classFilter ? "No fee records for this class" : "No fee records yet"}
            </p>
            <p className="text-xs text-body">
              {classFilter ? "Try a different class or clear the filter." : "Assign fees to students first using the Fee Structures tab."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Student</Th>
                <Th>Class</Th>
                <Th>Total</Th>
                <Th>Paid</Th>
                <Th>Balance</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </TableHead>
            <TableBody>
              {records.map((r) => {
                const paid = r.totalAmount - r.balance;
                const className = typeof r.class === "object" && r.class ? r.class.name : "—";
                return (
                  <tr key={r._id} className="hover:bg-meta-2 transition-colors dark:hover:bg-meta-4">
                    <Td>
                      <div>
                        <p className="font-medium text-black dark:text-white">
                          {r.student?.fullName ?? "—"}
                        </p>
                        <p className="text-xs text-body">{r.student?.email}</p>
                      </div>
                    </Td>
                    <Td className="text-body text-xs">{className}</Td>
                    <Td className="font-medium text-black dark:text-white">
                      {(r.totalAmount ?? 0).toLocaleString()}
                    </Td>
                    <Td className="text-meta-3">{paid.toLocaleString()}</Td>
                    <Td className="text-meta-1">{(r.balance ?? 0).toLocaleString()}</Td>
                    <Td>
                      <Badge variant={STATUS_BADGE[r.status] ?? "default"} className="capitalize">
                        {r.status}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedFee(r);
                            setShowHistory(r.student?._id ?? null);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          History
                        </button>
                        {r.balance > 0 && (
                          <button
                            onClick={() => {
                              setSelectedFee(r);
                              setShowHistory(r.student?._id ?? null);
                              setShowRecordPayment(true);
                            }}
                            className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-white hover:bg-opacity-90"
                          >
                            <Receipt className="h-3 w-3" aria-hidden="true" /> Pay
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Payment history drawer */}
      {showHistory && (
        <Card>
          <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Payment History — {selectedFee?.student?.fullName}
              </h2>
            </div>
            <button
              onClick={() => { setShowHistory(null); setSelectedFee(null); }}
              className="text-xs text-body hover:text-black dark:hover:text-white"
            >
              Close
            </button>
          </div>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            </div>
          ) : paymentList.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Receipt className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm text-body">No payments recorded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th>Receipt No.</Th>
                  <Th>Amount</Th>
                  <Th>Method</Th>
                  <Th>Date</Th>
                  <Th>Receipt</Th>
                </tr>
              </TableHead>
              <TableBody>
                {paymentList.map((payment) => (
                  <tr key={payment._id} className="hover:bg-meta-2 transition-colors dark:hover:bg-meta-4">
                    <Td className="font-mono text-xs text-black dark:text-white">
                      {payment.receiptNumber}
                    </Td>
                    <Td>
                      <span className="font-semibold text-black dark:text-white">
                        {payment.amount.toLocaleString()}
                      </span>
                    </Td>
                    <Td className="text-body text-xs">{formatMethod(payment.method)}</Td>
                    <Td className="text-body text-xs">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/fees/receipt?paymentId=${payment._id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Receipt className="h-3.5 w-3.5" aria-hidden="true" /> View
                      </Link>
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {selectedFee && showRecordPayment && (
        <RecordPaymentModal
          open={showRecordPayment}
          onClose={() => setShowRecordPayment(false)}
          studentId={selectedFee.student?._id ?? ""}
          balance={selectedFee.balance}
          onRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"structures" | "payments">("structures");
  const [showCreate, setShowCreate] = useState(false);
  const [showAssignClass, setShowAssignClass] = useState(false);
  const [showAssignAll, setShowAssignAll] = useState(false);
  const [showAssignStudent, setShowAssignStudent] = useState(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

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

  const allStructures = structures as FeeStructure[];
  const displayedStructures = showUnassignedOnly
    ? allStructures.filter((s) => !s.isAssigned)
    : allStructures;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-stroke dark:border-strokedark">
        <button
          onClick={() => setActiveTab("structures")}
          className={`px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "structures"
              ? "border-b-2 border-primary text-primary"
              : "text-body hover:text-black dark:hover:text-white"
          }`}
        >
          Fee Structures
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "payments"
              ? "border-b-2 border-primary text-primary"
              : "text-body hover:text-black dark:hover:text-white"
          }`}
        >
          Student Payments
        </button>
      </div>

      {activeTab === "structures" && (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-sm text-body">
                {displayedStructures.length}{showUnassignedOnly ? "" : ` of ${allStructures.length}`} fee structure{displayedStructures.length !== 1 ? "s" : ""}
                {showUnassignedOnly && <span className="ml-1 text-xs">(unassigned)</span>}
              </p>
              <button
                onClick={() => setShowUnassignedOnly((v) => !v)}
                className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                  showUnassignedOnly
                    ? "border-primary bg-primary text-white"
                    : "border-stroke text-body hover:border-primary hover:text-primary dark:border-strokedark"
                }`}
              >
                {showUnassignedOnly ? "Show All" : "Unassigned Only"}
              </button>
            </div>
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
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th>Actions</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {displayedStructures.length === 0 ? (
                    <tr>
                      <Td colSpan={6} className="py-10 text-center text-body">
                        {showUnassignedOnly ? "All fee structures have been assigned." : "No fee structures yet."}
                      </Td>
                    </tr>
                  ) : (
                    displayedStructures.map((f) => (
                      <tr key={f._id} className="hover:bg-meta-2 transition-colors dark:hover:bg-meta-4">
                        <Td>
                          <Badge variant={f.category === "all" ? "info" : f.category === "class" ? "warning" : "default"}>
                            {categoryLabel(f)}
                          </Badge>
                        </Td>
                        <Td className="text-body text-xs">
                          {f.particulars.map((p) => `${p.label} (Nle${p.amount})`).join(", ")}
                        </Td>
                        <Td>
                          <span className="font-semibold text-black dark:text-white">
                            Nle{f.totalAmount.toLocaleString()}
                          </span>
                        </Td>
                        <Td>
                          {f.isAssigned === true ? (
                            <Badge variant="success">Assigned</Badge>
                          ) : f.isAssigned === false ? (
                            <Badge variant="warning">Unassigned</Badge>
                          ) : null}
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
            onAssigned={() => queryClient.invalidateQueries({ queryKey: ["fee-structures"] })}
          />
          <AssignAllStudentsModal
            open={showAssignAll}
            onClose={() => setShowAssignAll(false)}
            students={students as AuthUser[]}
            onAssigned={() => queryClient.invalidateQueries({ queryKey: ["fee-structures"] })}
          />
          <AssignStudentModal
            open={showAssignStudent}
            onClose={() => setShowAssignStudent(false)}
            students={students as AuthUser[]}
            onAssigned={() => queryClient.invalidateQueries({ queryKey: ["fee-structures"] })}
          />
        </>
      )}

      {activeTab === "payments" && (
        <StudentPaymentsTab classes={classes as Class[]} />
      )}
    </div>
  );
}
