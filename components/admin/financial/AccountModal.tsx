"use client";

import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { financialApi } from "@/lib/api/financial";
import type { FinancialAccount } from "@/lib/api/financial";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { errMsg } from "@/lib/utils/errMsg";
import { accountSchema, type AccountForm, inputCls, labelCls, FieldError, useModalKeydown } from "./shared";

interface Props {
  editing?: FinancialAccount;
  onClose: () => void;
}

export function AccountModal({ editing, onClose }: Props) {
  const queryClient = useQueryClient();
  const titleId = "account-modal-title";
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  useModalKeydown(onClose);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: editing ? {
      name: editing.name, type: editing.type,
      bankName: editing.bankName, accountNumber: editing.accountNumber,
      openingBalance: editing.openingBalance,
    } : { type: "bank", openingBalance: 0 },
  });

  const type = watch("type");

  const { mutate, isPending } = useMutation({
    mutationFn: (values: AccountForm) =>
      editing ? financialApi.updateAccount(editing._id, values) : financialApi.createAccount(values as Parameters<typeof financialApi.createAccount>[0]),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financial-accounts"] }); onClose(); },
    onError: (err) => {
      toast.error(errMsg(err, editing ? "Failed to update account" : "Failed to create account"));
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
          <h2 id={titleId} className="text-sm font-semibold text-black dark:text-white">{editing ? "Edit Account" : "Add Account"}</h2>
          <button onClick={onClose} aria-label="Close dialog"><X className="h-4 w-4 text-body" aria-hidden="true" /></button>
        </div>
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-3">
          <div>
            <label htmlFor="account-name" className={labelCls}>Account Name <span className="text-meta-1" aria-hidden="true">*</span></label>
            <input id="account-name" {...register("name")} placeholder="e.g. Main Bank Account" className={inputCls} />
            <FieldError msg={errors.name?.message} />
          </div>
          <div>
            <label htmlFor="account-type" className={labelCls}>Type</label>
            <select id="account-type" {...register("type")} className={inputCls}>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>
          {type === "bank" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="account-bank-name" className={labelCls}>Bank Name</label>
                <input id="account-bank-name" {...register("bankName")} placeholder="e.g. Ecobank" className={inputCls} />
              </div>
              <div>
                <label htmlFor="account-number" className={labelCls}>Account No.</label>
                <input id="account-number" {...register("accountNumber")} placeholder="e.g. 1234567890" className={inputCls} />
              </div>
            </div>
          )}
          <div>
            <label htmlFor="account-opening-balance" className={labelCls}>Opening Balance</label>
            <input id="account-opening-balance" type="number" step="0.01" min="0" {...register("openingBalance", { valueAsNumber: true })} placeholder="0.00" className={inputCls} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-stroke py-2 text-sm font-medium text-black hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">{isPending ? "Saving…" : editing ? "Update" : "Add Account"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
