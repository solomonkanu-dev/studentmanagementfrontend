"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { feesApi } from "@/lib/api/fees";
import { adminApi } from "@/lib/api/admin";
import { termApi } from "@/lib/api/term";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Plus, X } from "lucide-react";
import type { AuthUser, Class, AcademicTerm } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";
import { SelectField } from "./shared";

export const structureSchema = z.object({
  category: z.enum(["all", "class", "student"]),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  termId: z.string().optional(),
  particulars: z
    .array(z.object({ label: z.string().min(1, "Label required"), amount: z.preprocess((v) => Number(v), z.number().min(0, "Must be ≥ 0")) }))
    .min(1, "Add at least one particular"),
});
export type StructureForm = z.infer<typeof structureSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  classes: Class[];
  students: AuthUser[];
  onCreated: () => void;
}

export function CreateStructureModal({ open, onClose, classes, students, onCreated }: Props) {
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

  const { data: terms = [] } = useQuery({
    queryKey: ["academic-terms"],
    queryFn: termApi.getAll,
  });

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
          if (values.termId) payload.termId = values.termId;
          mutation.mutate(payload);
        })}
        className="space-y-4"
      >
        <SelectField label="Category *" error={errors.category?.message} {...register("category")}>
          <option value="all">All Students</option>
          <option value="class">Specific Class</option>
          <option value="student">Specific Student</option>
        </SelectField>

        <SelectField label="Term (optional)" {...register("termId")}>
          <option value="">No specific term</option>
          {(terms as AcademicTerm[])
            .sort((a, b) => b.academicYear.localeCompare(a.academicYear))
            .map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} — {t.academicYear}{t.isCurrent ? " (current)" : ""}
              </option>
            ))}
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
