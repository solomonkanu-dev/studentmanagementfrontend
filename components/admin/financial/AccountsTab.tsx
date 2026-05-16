"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Building2, Banknote, Smartphone } from "lucide-react";
import { financialApi } from "@/lib/api/financial";
import type { FinancialAccount } from "@/lib/api/financial";
import { Card, CardContent } from "@/components/ui/Card";
import { errMsg } from "@/lib/utils/errMsg";
import { fmt } from "./shared";
import { AccountModal } from "./AccountModal";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

export function AccountsTab() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FinancialAccount | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["financial-accounts"],
    queryFn: financialApi.getAccounts,
  });

  const deleteMutation = useMutation({
    mutationFn: financialApi.deleteAccount,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financial-accounts"] }); setConfirmDelete(null); },
    onError: (err) => {
      toast.error(errMsg(err, "Failed to delete account"));
    },
  });

  const typeIcon = (t: string) => {
    if (t === "bank") return <Building2 className="h-5 w-5 text-primary" />;
    if (t === "cash") return <Banknote className="h-5 w-5 text-meta-3" />;
    return <Smartphone className="h-5 w-5 text-meta-5" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Account
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" /></div>
      ) : (accounts as FinancialAccount[]).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-body">No accounts yet. Add your first account to start tracking balances.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(accounts as FinancialAccount[]).map((acc) => (
            <Card key={acc._id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stroke dark:bg-strokedark">
                      {typeIcon(acc.type)}
                    </div>
                    <div>
                      <p className="font-semibold text-black dark:text-white text-sm">{acc.name}</p>
                      <p className="text-xs text-body capitalize">{acc.type.replace("_", " ")}</p>
                      {acc.bankName && <p className="text-[11px] text-body">{acc.bankName}{acc.accountNumber ? ` · ${acc.accountNumber}` : ""}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(acc)} className="rounded p-1 text-body hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                    <button
                      onClick={() => setConfirmDelete({ id: acc._id, label: acc.name })}
                      className="rounded p-1 text-body hover:text-meta-1"
                    ><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 divide-x divide-stroke dark:divide-strokedark">
                  <div className="pr-4 text-center">
                    <p className="text-sm font-semibold text-body">NLe {fmt(acc.openingBalance)}</p>
                    <p className="text-[11px] text-body">Opening Balance</p>
                  </div>
                  <div className="pl-4 text-center">
                    <p className={`text-sm font-bold ${(acc.currentBalance ?? acc.openingBalance) >= 0 ? "text-meta-3" : "text-meta-1"}`}>
                      NLe {fmt(acc.currentBalance ?? acc.openingBalance)}
                    </p>
                    <p className="text-[11px] text-body">Current Balance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(showAdd || editing) && <AccountModal editing={editing ?? undefined} onClose={() => { setShowAdd(false); setEditing(null); }} />}
      {confirmDelete && (
        <ConfirmDeleteDialog
          title="Delete account?"
          body="Linked records will remain but will no longer be associated with this account."
          itemLabel={confirmDelete.label}
          isPending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        />
      )}
    </div>
  );
}
