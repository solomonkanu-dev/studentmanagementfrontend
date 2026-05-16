"use client";

import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { financialApi } from "@/lib/api/financial";
import type { FinancialRecord, FinancialAccount } from "@/lib/api/financial";
import type { AcademicTerm } from "@/lib/types";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { errMsg } from "@/lib/utils/errMsg";
import {
  recordSchema, type RecordForm, INCOME_CATEGORIES, EXPENSE_CATEGORIES,
  PAYMENT_METHODS, PAYMENT_METHOD_LABELS, inputCls, labelCls, FieldError,
  useModalKeydown, termLabel,
} from "./shared";

interface Props {
  editing?: FinancialRecord;
  accounts: FinancialAccount[];
  terms: AcademicTerm[];
  onClose: () => void;
}

export function RecordModal({ editing, accounts, terms, onClose }: Props) {
  const queryClient = useQueryClient();
  const titleId = "record-modal-title";
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  useModalKeydown(onClose);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: editing ? {
      type: editing.type,
      category: editing.category,
      amount: editing.amount,
      date: editing.date?.split("T")[0] ?? "",
      description: editing.description ?? "",
      paymentMethod: editing.paymentMethod,
      reference: editing.reference ?? "",
      termId: typeof editing.termId === "object" && editing.termId ? editing.termId._id : (editing.termId as string) ?? "",
      accountId: typeof editing.accountId === "object" && editing.accountId ? editing.accountId._id : (editing.accountId as string) ?? "",
    } : {
      type: "income",
      paymentMethod: "cash",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const type = watch("type");
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const { mutate, isPending } = useMutation({
    mutationFn: (values: RecordForm) => {
      const payload = { ...values, termId: values.termId || undefined, accountId: values.accountId || undefined };
      return editing
        ? financialApi.updateRecord(editing._id, payload)
        : financialApi.createRecord(payload as Parameters<typeof financialApi.createRecord>[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-records"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      onClose();
    },
    onError: (err) => {
      toast.error(errMsg(err, editing ? "Failed to update record" : "Failed to create record"));
    },
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-sm font-semibold text-black dark:text-white">
            {editing ? "Edit Record" : "Add Financial Record"}
          </h2>
          <button onClick={onClose} aria-label="Close dialog"><X className="h-4 w-4 text-body" aria-hidden="true" /></button>
        </div>

        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-3">
          {/* Type toggle */}
          <div>
            <label className={labelCls}>Type</label>
            <div className="flex rounded-lg border border-stroke overflow-hidden dark:border-strokedark">
              {(["income", "expense"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setValue("type", t); setValue("category", ""); }}
                  className={[
                    "flex-1 py-2 text-sm font-medium capitalize transition-colors",
                    watch("type") === t
                      ? t === "income" ? "bg-meta-3 text-white" : "bg-meta-1 text-white"
                      : "text-body hover:bg-stroke dark:hover:bg-meta-4",
                  ].join(" ")}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="record-category" className={labelCls}>Category <span className="text-meta-1" aria-hidden="true">*</span></label>
              <select id="record-category" {...register("category")} className={inputCls}>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <FieldError msg={errors.category?.message} />
            </div>
            <div>
              <label htmlFor="record-amount" className={labelCls}>Amount <span className="text-meta-1" aria-hidden="true">*</span></label>
              <input id="record-amount" type="number" step="0.01" min="0" {...register("amount", { valueAsNumber: true })} placeholder="0.00" className={inputCls} />
              <FieldError msg={errors.amount?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="record-date" className={labelCls}>Date <span className="text-meta-1" aria-hidden="true">*</span></label>
              <input id="record-date" type="date" {...register("date")} className={inputCls} />
              <FieldError msg={errors.date?.message} />
            </div>
            <div>
              <label htmlFor="record-payment-method" className={labelCls}>Payment Method</label>
              <select id="record-payment-method" {...register("paymentMethod")} className={inputCls}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="record-description" className={labelCls}>Description</label>
            <textarea id="record-description" {...register("description")} rows={2} placeholder="Optional notes…" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="record-reference" className={labelCls}>Reference / Receipt No.</label>
              <input id="record-reference" {...register("reference")} placeholder="e.g. RCP-001" className={inputCls} />
            </div>
            <div>
              <label htmlFor="record-term" className={labelCls}>Term (optional)</label>
              <select id="record-term" {...register("termId")} className={inputCls}>
                <option value="">No term</option>
                {terms.map((t) => <option key={t._id} value={t._id}>{termLabel(t)}</option>)}
              </select>
            </div>
          </div>

          {accounts.length > 0 && (
            <div>
              <label htmlFor="record-account" className={labelCls}>Account (optional)</label>
              <select id="record-account" {...register("accountId")} className={inputCls}>
                <option value="">No account</option>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-stroke py-2 text-sm font-medium text-black hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">
              {isPending ? "Saving…" : editing ? "Update" : "Add Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
