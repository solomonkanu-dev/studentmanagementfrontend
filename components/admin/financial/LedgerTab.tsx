"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { financialApi } from "@/lib/api/financial";
import type { FinancialRecord, FinancialAccount, RecordFilters } from "@/lib/api/financial";
import type { AcademicTerm } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { errMsg } from "@/lib/utils/errMsg";
import { inputCls, labelCls, fmt, fmtDate, termLabel, PAYMENT_METHOD_LABELS } from "./shared";
import { RecordModal } from "./RecordModal";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

interface Props {
  terms: AcademicTerm[];
  accounts: FinancialAccount[];
}

export function LedgerTab({ terms, accounts }: Props) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<RecordFilters>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FinancialRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);

  const addBtnRef = useRef<HTMLButtonElement>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["financial-records", filters],
    queryFn: () => financialApi.getRecords(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: financialApi.deleteRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-records"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      setConfirmDelete(null);
    },
    onError: (err) => {
      toast.error(errMsg(err, "Failed to delete record"));
    },
  });

  const totalIncome = useMemo(() => (records as FinancialRecord[]).filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0), [records]);
  const totalExpense = useMemo(() => (records as FinancialRecord[]).filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0), [records]);

  const dateRangeError =
    filters.startDate && filters.endDate && filters.startDate > filters.endDate;

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="ledger-filter-type" className={labelCls}>Type</label>
          <select id="ledger-filter-type" value={filters.type ?? ""} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as "income" | "expense" || undefined }))} className={inputCls + " w-36"}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label htmlFor="ledger-filter-term" className={labelCls}>Term</label>
          <select id="ledger-filter-term" value={filters.termId ?? ""} onChange={(e) => setFilters((f) => ({ ...f, termId: e.target.value || undefined }))} className={inputCls + " w-48"}>
            <option value="">All terms</option>
            {terms.map((t) => <option key={t._id} value={t._id}>{termLabel(t)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ledger-filter-from" className={labelCls}>From</label>
          <input id="ledger-filter-from" type="date" value={filters.startDate ?? ""} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value || undefined }))} className={inputCls + " w-36"} />
        </div>
        <div>
          <label htmlFor="ledger-filter-to" className={labelCls}>To</label>
          <input id="ledger-filter-to" type="date" value={filters.endDate ?? ""} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value || undefined }))} className={inputCls + " w-36"} />
        </div>
        <button onClick={() => setFilters({})} className="rounded-lg border border-stroke px-3 py-2 text-xs text-body hover:bg-stroke dark:border-strokedark dark:hover:bg-meta-4">Clear</button>
        <div className="ml-auto">
          <button ref={addBtnRef} onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Record
          </button>
        </div>
      </div>

      {dateRangeError && (
        <p className="text-xs text-meta-1">Start date must be before end date</p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-stroke dark:border-strokedark">
        <table className="w-full text-sm">
          <thead className="bg-stroke/40 dark:bg-meta-4">
            <tr>
              {["Date", "Type", "Category", "Description", "Amount", "Method", "Ref", "Term", ""].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-black dark:text-white">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke dark:divide-strokedark">
            {isLoading ? (
              <tr><td colSpan={9} className="py-10 text-center text-xs text-body"><div className="flex justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" /></div></td></tr>
            ) : (records as FinancialRecord[]).length === 0 ? (
              <tr><td colSpan={9} className="py-10 text-center text-xs text-body">No records found.</td></tr>
            ) : (
              (records as FinancialRecord[]).map((r) => (
                <tr key={r._id} className="hover:bg-stroke/20 dark:hover:bg-meta-4/20">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-body">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3"><Badge variant={r.type === "income" ? "success" : "danger"}>{r.type}</Badge></td>
                  <td className="px-4 py-3 text-xs font-medium text-black dark:text-white">{r.category}</td>
                  <td className="max-w-[160px] px-4 py-3 text-xs text-body truncate">{r.description || "—"}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-xs font-semibold ${r.type === "income" ? "text-meta-3" : "text-meta-1"}`}>NLe {fmt(r.amount)}</td>
                  <td className="px-4 py-3 text-xs text-body">{PAYMENT_METHOD_LABELS[r.paymentMethod ?? ""] || "—"}</td>
                  <td className="px-4 py-3 text-xs text-body">{r.reference || "—"}</td>
                  <td className="px-4 py-3 text-xs text-body">
                    {r.termId && typeof r.termId === "object" ? `${r.termId.name}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(r)} className="rounded p-1 text-body hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button
                        onClick={() => setConfirmDelete({
                          id: r._id,
                          label: `${r.category} — NLe ${fmt(r.amount)} on ${fmtDate(r.date)}`,
                        })}
                        className="rounded p-1 text-body hover:text-meta-1 transition-colors"
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {(records as FinancialRecord[]).length > 0 && (
            <tfoot className="border-t border-stroke bg-stroke/20 dark:border-strokedark dark:bg-meta-4/20">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-black dark:text-white">Totals</td>
                <td className="px-4 py-2 text-xs font-semibold">
                  <span className="text-meta-3">+NLe {fmt(totalIncome)}</span>
                  <span className="mx-1 text-body">/</span>
                  <span className="text-meta-1">−NLe {fmt(totalExpense)}</span>
                  <span className="ml-2 font-bold text-black dark:text-white">= NLe {fmt(totalIncome - totalExpense)}</span>
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {(showAdd || editing) && (
        <RecordModal editing={editing ?? undefined} accounts={accounts} terms={terms} onClose={() => { setShowAdd(false); setEditing(null); }} />
      )}

      {confirmDelete && (
        <ConfirmDeleteDialog
          title="Delete record?"
          body="This cannot be undone."
          itemLabel={confirmDelete.label}
          isPending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        />
      )}
    </div>
  );
}
