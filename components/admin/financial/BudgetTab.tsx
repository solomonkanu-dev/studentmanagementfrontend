"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { financialApi } from "@/lib/api/financial";
import type { FinancialBudget } from "@/lib/api/financial";
import type { AcademicTerm } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { fmtCurrency } from "@/lib/utils/currency";
import { errMsg } from "@/lib/utils/errMsg";
import { inputCls, labelCls, termLabel } from "./shared";
import { BudgetModal } from "./BudgetModal";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

function BudgetRow({
  b,
  setConfirmDelete,
}: {
  b: FinancialBudget;
  setConfirmDelete: (v: { id: string; label: string } | null) => void;
}) {
  const actual = b.actual ?? 0;
  const pct = b.budgetedAmount > 0 ? Math.min((actual / b.budgetedAmount) * 100, 100) : 0;
  const variance = b.budgetedAmount - actual;
  const barColor = pct >= 100 ? "bg-meta-1" : pct >= 80 ? "bg-yellow-500" : "bg-meta-3";
  return (
    <tr className="hover:bg-stroke/20 dark:hover:bg-meta-4/20">
      <td className="px-4 py-3 text-xs font-medium text-black dark:text-white">{b.category}</td>
      <td className="px-4 py-3"><Badge variant={b.type === "income" ? "success" : "danger"}>{b.type}</Badge></td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-body">NLe {fmtCurrency(b.budgetedAmount)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-black dark:text-white">NLe {fmtCurrency(actual)}</td>
      <td className={`whitespace-nowrap px-4 py-3 text-xs font-medium ${variance >= 0 ? "text-meta-3" : "text-meta-1"}`}>{variance >= 0 ? "+" : ""}NLe {fmtCurrency(variance)}</td>
      <td className="px-4 py-3 min-w-[120px]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-stroke dark:bg-strokedark overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-body w-8 text-right">{Math.round(pct)}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => setConfirmDelete({ id: b._id, label: `${b.category} (${b.type})` })}
          className="rounded p-1 text-body hover:text-meta-1 transition-colors"
        ><Trash2 className="h-3.5 w-3.5" /></button>
      </td>
    </tr>
  );
}

export function BudgetTab({ terms }: { terms: AcademicTerm[] }) {
  const queryClient = useQueryClient();
  const currentTerm = terms.find((t) => t.isCurrent);
  const [termId, setTermId] = useState(currentTerm?._id ?? "");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["financial-budgets", termId],
    queryFn: () => financialApi.getBudgets(termId || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: financialApi.deleteBudget,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financial-budgets"] }); setConfirmDelete(null); },
    onError: (err) => {
      toast.error(errMsg(err, "Failed to remove budget"));
    },
  });

  const incomeRows = (budgets as FinancialBudget[]).filter((b) => b.type === "income");
  const expenseRows = (budgets as FinancialBudget[]).filter((b) => b.type === "expense");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="budget-filter-term" className={labelCls}>Term</label>
          <select id="budget-filter-term" value={termId} onChange={(e) => setTermId(e.target.value)} className={inputCls + " w-56"}>
            <option value="">All terms</option>
            {terms.map((t) => <option key={t._id} value={t._id}>{termLabel(t)}</option>)}
          </select>
        </div>
        <div className="ml-auto">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Set Budget
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stroke dark:border-strokedark">
        <table className="w-full text-sm">
          <thead className="bg-stroke/40 dark:bg-meta-4">
            <tr>
              {["Category", "Type", "Budgeted", "Actual", "Variance", "% Used", ""].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-black dark:text-white">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke dark:divide-strokedark">
            {isLoading ? (
              <tr><td colSpan={7} className="py-10 text-center text-xs text-body"><div className="flex justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" /></div></td></tr>
            ) : (budgets as FinancialBudget[]).length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-xs text-body">No budgets set. Click &quot;Set Budget&quot; to get started.</td></tr>
            ) : (
              <>
                {incomeRows.map((b) => <BudgetRow key={b._id} b={b} setConfirmDelete={setConfirmDelete} />)}
                {expenseRows.map((b) => <BudgetRow key={b._id} b={b} setConfirmDelete={setConfirmDelete} />)}
              </>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <BudgetModal terms={terms} onClose={() => setShowAdd(false)} />}
      {confirmDelete && (
        <ConfirmDeleteDialog
          title="Remove budget?"
          itemLabel={confirmDelete.label}
          isPending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        />
      )}
    </div>
  );
}
