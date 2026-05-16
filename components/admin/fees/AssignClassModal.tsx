"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import type { FeeStructure, Class } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";
import { SelectField, categoryLabel } from "./shared";

export const assignClassSchema = z.object({
  classId: z.string().min(1, "Select a class"),
  feeIds: z.array(z.string()).min(1, "Select at least one fee structure"),
});
export type AssignClassForm = z.infer<typeof assignClassSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  classes: Class[];
  structures: FeeStructure[];
  onAssigned?: () => void;
}

export function AssignClassModal({ open, onClose, classes, structures, onAssigned }: Props) {
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
