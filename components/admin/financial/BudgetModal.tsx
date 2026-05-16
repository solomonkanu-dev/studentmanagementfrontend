"use client";

import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { financialApi } from "@/lib/api/financial";
import type { AcademicTerm } from "@/lib/types";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { errMsg } from "@/lib/utils/errMsg";
import {
  budgetSchema, type BudgetForm, INCOME_CATEGORIES, EXPENSE_CATEGORIES,
  inputCls, labelCls, FieldError, useModalKeydown, termLabel,
} from "./shared";

interface Props {
  terms: AcademicTerm[];
  onClose: () => void;
}

export function BudgetModal({ terms, onClose }: Props) {
  const queryClient = useQueryClient();
  const titleId = "budget-modal-title";
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  useModalKeydown(onClose);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { type: "expense", termId: terms.find((t) => t.isCurrent)?._id ?? "" },
  });

  const type = watch("type");
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const { mutate, isPending } = useMutation({
    mutationFn: financialApi.upsertBudget,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financial-budgets"] }); onClose(); },
    onError: (err) => {
      toast.error(errMsg(err, "Failed to save budget"));
    },
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-sm font-semibold text-black dark:text-white">Set Budget</h2>
          <button onClick={onClose} aria-label="Close dialog"><X className="h-4 w-4 text-body" aria-hidden="true" /></button>
        </div>
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-3">
          <div>
            <label className={labelCls}>Type</label>
            <div className="flex rounded-lg border border-stroke overflow-hidden dark:border-strokedark">
              {(["income", "expense"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setValue("type", t); setValue("category", ""); }}
                  className={["flex-1 py-2 text-sm font-medium capitalize", watch("type") === t ? (t === "income" ? "bg-meta-3 text-white" : "bg-meta-1 text-white") : "text-body"].join(" ")}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="budget-term" className={labelCls}>Term <span className="text-meta-1" aria-hidden="true">*</span></label>
            <select id="budget-term" {...register("termId")} className={inputCls}>
              <option value="">Select term…</option>
              {terms.map((t) => <option key={t._id} value={t._id}>{termLabel(t)}</option>)}
            </select>
            <FieldError msg={errors.termId?.message} />
          </div>
          <div>
            <label htmlFor="budget-category" className={labelCls}>Category <span className="text-meta-1" aria-hidden="true">*</span></label>
            <select id="budget-category" {...register("category")} className={inputCls}>
              <option value="">Select…</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <FieldError msg={errors.category?.message} />
          </div>
          <div>
            <label htmlFor="budget-amount" className={labelCls}>Budgeted Amount <span className="text-meta-1" aria-hidden="true">*</span></label>
            <input id="budget-amount" type="number" step="0.01" min="0" {...register("budgetedAmount", { valueAsNumber: true })} placeholder="0.00" className={inputCls} />
            <FieldError msg={errors.budgetedAmount?.message} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-stroke py-2 text-sm font-medium text-black hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">{isPending ? "Saving…" : "Set Budget"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
