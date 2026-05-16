"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { errMsg } from "@/lib/utils/errMsg";

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum(["cash", "bank_transfer", "card", "mobile_money", "cheque"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
export type RecordPaymentForm = z.infer<typeof recordPaymentSchema>;

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

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  balance: number;
  onRecorded: () => void;
}

export function RecordPaymentModal({ open, onClose, studentId, balance, onRecorded }: Props) {
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
