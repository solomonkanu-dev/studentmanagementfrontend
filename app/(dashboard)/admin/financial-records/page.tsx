"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { financialApi } from "@/lib/api/financial";
import type { FinancialRecord, FinancialBudget, FinancialAccount, RecordFilters } from "@/lib/api/financial";
import { termApi } from "@/lib/api/term";
import { exportApi } from "@/lib/api/export";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Landmark, Plus, Trash2, Pencil, Download, TrendingUp, TrendingDown,
  Wallet, Building2, Banknote, Smartphone, X,
} from "lucide-react";
import type { AcademicTerm } from "@/lib/types";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Chart palette ────────────────────────────────────────────────────────────

const C = {
  primary: "#3c50e0",
  success: "#10b981",
  danger:  "#fb5454",
  warning: "#f59e0b",
  violet:  "#8b5cf6",
  indigo:  "#6366f1",
  cyan:    "#06b6d4",
  body:    "#64748b",
  stroke:  "#e2e8f0",
};

const baseChart: ApexCharts.ApexOptions = {
  chart: { toolbar: { show: false }, background: "transparent", fontFamily: "inherit" },
  grid: { borderColor: C.stroke, strokeDashArray: 4 },
  dataLabels: { enabled: false },
  tooltip: { theme: "light" },
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INCOME_CATEGORIES = ["Fee Payments", "Government Grants", "Donations", "Bank Interest", "Other Income"];
const EXPENSE_CATEGORIES = ["Salaries", "Utilities", "Supplies & Stationery", "Maintenance & Repairs", "Transportation", "Rent", "Equipment", "Events & Activities", "Other Expenses"];
const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "mobile_money", "cheque", "other"] as const;

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const termLabel = (t: AcademicTerm) => `${t.name} — ${t.academicYear}`;

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const recordSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  paymentMethod: z.enum(["cash", "bank_transfer", "card", "mobile_money", "cheque", "other"]),
  reference: z.string().optional(),
  termId: z.string().optional(),
  accountId: z.string().optional(),
});
type RecordForm = z.infer<typeof recordSchema>;

const budgetSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Category is required"),
  budgetedAmount: z.number().min(0, "Amount must be 0 or more"),
  termId: z.string().min(1, "Term is required"),
});
type BudgetForm = z.infer<typeof budgetSchema>;

const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["bank", "cash", "mobile_money"]),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  openingBalance: z.number().min(0),
});
type AccountForm = z.infer<typeof accountSchema>;

// ─── Shared Input Components ──────────────────────────────────────────────────

const inputCls = "w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white";
const labelCls = "mb-1 block text-xs font-medium text-black dark:text-white";

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-0.5 text-xs text-meta-1">{msg}</p> : null;
}

// ─── Record Modal ─────────────────────────────────────────────────────────────

function RecordModal({
  editing,
  accounts,
  terms,
  onClose,
}: {
  editing?: FinancialRecord;
  accounts: FinancialAccount[];
  terms: AcademicTerm[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
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
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-black dark:text-white">
            {editing ? "Edit Record" : "Add Financial Record"}
          </h2>
          <button onClick={onClose}><X className="h-4 w-4 text-body" /></button>
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
              <label className={labelCls}>Category <span className="text-meta-1">*</span></label>
              <select {...register("category")} className={inputCls}>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <FieldError msg={errors.category?.message} />
            </div>
            <div>
              <label className={labelCls}>Amount <span className="text-meta-1">*</span></label>
              <input type="number" step="0.01" min="0" {...register("amount", { valueAsNumber: true })} placeholder="0.00" className={inputCls} />
              <FieldError msg={errors.amount?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date <span className="text-meta-1">*</span></label>
              <input type="date" {...register("date")} className={inputCls} />
              <FieldError msg={errors.date?.message} />
            </div>
            <div>
              <label className={labelCls}>Payment Method</label>
              <select {...register("paymentMethod")} className={inputCls}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea {...register("description")} rows={2} placeholder="Optional notes…" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Reference / Receipt No.</label>
              <input {...register("reference")} placeholder="e.g. RCP-001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Term (optional)</label>
              <select {...register("termId")} className={inputCls}>
                <option value="">No term</option>
                {terms.map((t) => <option key={t._id} value={t._id}>{termLabel(t)}</option>)}
              </select>
            </div>
          </div>

          {accounts.length > 0 && (
            <div>
              <label className={labelCls}>Account (optional)</label>
              <select {...register("accountId")} className={inputCls}>
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

// ─── Budget Modal ─────────────────────────────────────────────────────────────

function BudgetModal({ terms, onClose }: { terms: AcademicTerm[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { type: "expense", termId: terms.find((t) => t.isCurrent)?._id ?? "" },
  });

  const type = watch("type");
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const { mutate, isPending } = useMutation({
    mutationFn: financialApi.upsertBudget,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financial-budgets"] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-black dark:text-white">Set Budget</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-body" /></button>
        </div>
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-3">
          <div>
            <label className={labelCls}>Type</label>
            <div className="flex rounded-lg border border-stroke overflow-hidden dark:border-strokedark">
              {(["income", "expense"] as const).map((t) => (
                <button key={t} type="button" onClick={() => { }} className={["flex-1 py-2 text-sm font-medium capitalize", watch("type") === t ? (t === "income" ? "bg-meta-3 text-white" : "bg-meta-1 text-white") : "text-body"].join(" ")}>
                  <input type="radio" {...register("type")} value={t} className="sr-only" />{t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Term <span className="text-meta-1">*</span></label>
            <select {...register("termId")} className={inputCls}>
              <option value="">Select term…</option>
              {terms.map((t) => <option key={t._id} value={t._id}>{termLabel(t)}</option>)}
            </select>
            <FieldError msg={errors.termId?.message} />
          </div>
          <div>
            <label className={labelCls}>Category <span className="text-meta-1">*</span></label>
            <select {...register("category")} className={inputCls}>
              <option value="">Select…</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <FieldError msg={errors.category?.message} />
          </div>
          <div>
            <label className={labelCls}>Budgeted Amount <span className="text-meta-1">*</span></label>
            <input type="number" step="0.01" min="0" {...register("budgetedAmount", { valueAsNumber: true })} placeholder="0.00" className={inputCls} />
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

// ─── Account Modal ────────────────────────────────────────────────────────────

function AccountModal({ editing, onClose }: { editing?: FinancialAccount; onClose: () => void }) {
  const queryClient = useQueryClient();
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
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-black dark:text-white">{editing ? "Edit Account" : "Add Account"}</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-body" /></button>
        </div>
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-3">
          <div>
            <label className={labelCls}>Account Name <span className="text-meta-1">*</span></label>
            <input {...register("name")} placeholder="e.g. Main Bank Account" className={inputCls} />
            <FieldError msg={errors.name?.message} />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select {...register("type")} className={inputCls}>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>
          {type === "bank" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Bank Name</label>
                <input {...register("bankName")} placeholder="e.g. Ecobank" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Account No.</label>
                <input {...register("accountNumber")} placeholder="e.g. 1234567890" className={inputCls} />
              </div>
            </div>
          )}
          <div>
            <label className={labelCls}>Opening Balance</label>
            <input type="number" step="0.01" min="0" {...register("openingBalance", { valueAsNumber: true })} placeholder="0.00" className={inputCls} />
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

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "ledger" | "budget" | "accounts" | "reports";

// ─── Ledger Tab ───────────────────────────────────────────────────────────────

function LedgerTab({ terms, accounts }: { terms: AcademicTerm[]; accounts: FinancialAccount[] }) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<RecordFilters>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FinancialRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
  });

  const totalIncome = useMemo(() => (records as FinancialRecord[]).filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0), [records]);
  const totalExpense = useMemo(() => (records as FinancialRecord[]).filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0), [records]);

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelCls}>Type</label>
          <select value={filters.type ?? ""} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as "income" | "expense" || undefined }))} className={inputCls + " w-36"}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Term</label>
          <select value={filters.termId ?? ""} onChange={(e) => setFilters((f) => ({ ...f, termId: e.target.value || undefined }))} className={inputCls + " w-48"}>
            <option value="">All terms</option>
            {terms.map((t) => <option key={t._id} value={t._id}>{termLabel(t)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>From</label>
          <input type="date" value={filters.startDate ?? ""} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value || undefined }))} className={inputCls + " w-36"} />
        </div>
        <div>
          <label className={labelCls}>To</label>
          <input type="date" value={filters.endDate ?? ""} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value || undefined }))} className={inputCls + " w-36"} />
        </div>
        <button onClick={() => setFilters({})} className="rounded-lg border border-stroke px-3 py-2 text-xs text-body hover:bg-stroke dark:border-strokedark dark:hover:bg-meta-4">Clear</button>
        <div className="ml-auto">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Record
          </button>
        </div>
      </div>

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
                  <td className="px-4 py-3 text-xs text-body capitalize">{r.paymentMethod?.replace("_", " ") || "—"}</td>
                  <td className="px-4 py-3 text-xs text-body">{r.reference || "—"}</td>
                  <td className="px-4 py-3 text-xs text-body">
                    {r.termId && typeof r.termId === "object" ? `${r.termId.name}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(r)} className="rounded p-1 text-body hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setConfirmDelete(r._id)} className="rounded p-1 text-body hover:text-meta-1 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-2 text-sm font-semibold text-black dark:text-white">Delete record?</h3>
            <p className="mb-5 text-xs text-body">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border border-stroke py-2 text-sm text-black hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4">Cancel</button>
              <button onClick={() => deleteMutation.mutate(confirmDelete)} disabled={deleteMutation.isPending} className="flex-1 rounded-lg bg-meta-1 py-2 text-sm font-medium text-white hover:bg-meta-1/90 disabled:opacity-60">{deleteMutation.isPending ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Budget Tab ───────────────────────────────────────────────────────────────

function BudgetTab({ terms }: { terms: AcademicTerm[] }) {
  const queryClient = useQueryClient();
  const currentTerm = terms.find((t) => t.isCurrent);
  const [termId, setTermId] = useState(currentTerm?._id ?? "");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["financial-budgets", termId],
    queryFn: () => financialApi.getBudgets(termId || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: financialApi.deleteBudget,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financial-budgets"] }); setConfirmDelete(null); },
  });

  const incomeRows = (budgets as FinancialBudget[]).filter((b) => b.type === "income");
  const expenseRows = (budgets as FinancialBudget[]).filter((b) => b.type === "expense");

  const BudgetRow = ({ b }: { b: FinancialBudget }) => {
    const actual = b.actual ?? 0;
    const pct = b.budgetedAmount > 0 ? Math.min((actual / b.budgetedAmount) * 100, 100) : 0;
    const variance = b.budgetedAmount - actual;
    const barColor = pct >= 100 ? "bg-meta-1" : pct >= 80 ? "bg-yellow-500" : "bg-meta-3";
    return (
      <tr className="hover:bg-stroke/20 dark:hover:bg-meta-4/20">
        <td className="px-4 py-3 text-xs font-medium text-black dark:text-white">{b.category}</td>
        <td className="px-4 py-3"><Badge variant={b.type === "income" ? "success" : "danger"}>{b.type}</Badge></td>
        <td className="whitespace-nowrap px-4 py-3 text-xs text-body">NLe {fmt(b.budgetedAmount)}</td>
        <td className="whitespace-nowrap px-4 py-3 text-xs text-black dark:text-white">NLe {fmt(actual)}</td>
        <td className={`whitespace-nowrap px-4 py-3 text-xs font-medium ${variance >= 0 ? "text-meta-3" : "text-meta-1"}`}>{variance >= 0 ? "+" : ""}NLe {fmt(variance)}</td>
        <td className="px-4 py-3 min-w-[120px]">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-stroke dark:bg-strokedark overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-body w-8 text-right">{Math.round(pct)}%</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <button onClick={() => setConfirmDelete(b._id)} className="rounded p-1 text-body hover:text-meta-1 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelCls}>Term</label>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} className={inputCls + " w-56"}>
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
              <tr><td colSpan={7} className="py-10 text-center text-xs text-body">No budgets set. Click "Set Budget" to get started.</td></tr>
            ) : (
              <>
                {incomeRows.map((b) => <BudgetRow key={b._id} b={b} />)}
                {expenseRows.map((b) => <BudgetRow key={b._id} b={b} />)}
              </>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <BudgetModal terms={terms} onClose={() => setShowAdd(false)} />}
      {confirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-2 text-sm font-semibold text-black dark:text-white">Remove budget?</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border border-stroke py-2 text-sm text-black hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4">Cancel</button>
              <button onClick={() => deleteMutation.mutate(confirmDelete)} disabled={deleteMutation.isPending} className="flex-1 rounded-lg bg-meta-1 py-2 text-sm font-medium text-white hover:bg-meta-1/90 disabled:opacity-60">{deleteMutation.isPending ? "Removing…" : "Remove"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Accounts Tab ─────────────────────────────────────────────────────────────

function AccountsTab() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FinancialAccount | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["financial-accounts"],
    queryFn: financialApi.getAccounts,
  });

  const deleteMutation = useMutation({
    mutationFn: financialApi.deleteAccount,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financial-accounts"] }); setConfirmDelete(null); },
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
                    <button onClick={() => setConfirmDelete(acc._id)} className="rounded p-1 text-body hover:text-meta-1"><Trash2 className="h-3.5 w-3.5" /></button>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-2 text-sm font-semibold text-black dark:text-white">Delete account?</h3>
            <p className="mb-4 text-xs text-body">Linked records will remain but will no longer be associated with this account.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border border-stroke py-2 text-sm text-black dark:border-strokedark dark:text-white">Cancel</button>
              <button onClick={() => deleteMutation.mutate(confirmDelete)} disabled={deleteMutation.isPending} className="flex-1 rounded-lg bg-meta-1 py-2 text-sm text-white disabled:opacity-60">{deleteMutation.isPending ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

const INCOME_COLORS  = ["#10b981","#3c50e0","#8b5cf6","#f59e0b","#06b6d4","#84cc16"];
const EXPENSE_COLORS = ["#fb5454","#f59e0b","#8b5cf6","#3c50e0","#ec4899","#f97316","#14b8a6","#06b6d4","#a78bfa"];

function KpiCard({
  icon, iconBg, value, label, sub,
}: { icon: React.ReactNode; iconBg: string; value: string; label: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
          {icon}
        </div>
        <p className="text-lg font-bold text-black dark:text-white">{value}</p>
        <p className="text-xs font-medium text-body">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-body">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ReportsTab({ terms }: { terms: AcademicTerm[] }) {
  const [termId, setTermId] = useState("");

  const { data: summary, isLoading } = useQuery({
    queryKey: ["financial-summary", termId],
    queryFn: () => financialApi.getSummary(termId || undefined),
  });

  const incomeByCategory = useMemo(() => summary?.byCategory.filter((c) => c.type === "income") ?? [], [summary]);
  const expenseByCategory = useMemo(() => summary?.byCategory.filter((c) => c.type === "expense") ?? [], [summary]);
  const termComparison = useMemo(() => summary?.termComparison ?? [], [summary]);

  const allCategories = useMemo(() =>
    [...incomeByCategory, ...expenseByCategory].sort((a, b) => b.total - a.total).slice(0, 10),
    [incomeByCategory, expenseByCategory]
  );

  const savingsRate = summary && summary.totalIncome > 0
    ? Math.round((summary.netBalance / summary.totalIncome) * 100) : null;
  const expenseRatio = summary && summary.totalIncome > 0
    ? Math.round((summary.totalExpense / summary.totalIncome) * 100) : null;

  // ── Chart: Income vs Expense grouped bar (per term) ───────────────────────
  const termBarOptions = useMemo((): ApexCharts.ApexOptions => ({
    ...baseChart,
    chart: { ...baseChart.chart, type: "bar" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } },
    colors: [C.success, C.danger],
    xaxis: {
      categories: termComparison.map((t) => t.term),
      labels: { style: { fontSize: "11px", colors: C.body }, rotate: -25 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px", colors: C.body }, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) } },
    tooltip: { y: { formatter: (v) => `NLe ${v.toLocaleString()}` } },
    legend: { position: "top", fontSize: "12px" },
  }), [termComparison]);

  const termBarSeries = useMemo(() => [
    { name: "Income",  data: termComparison.map((t) => t.income) },
    { name: "Expense", data: termComparison.map((t) => t.expense) },
  ], [termComparison]);

  // ── Chart: Net balance area trend ─────────────────────────────────────────
  const netTrendOptions = useMemo((): ApexCharts.ApexOptions => ({
    ...baseChart,
    chart: { ...baseChart.chart, type: "area" },
    stroke: { curve: "smooth", width: 2.5 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0.03 } },
    colors: [C.primary],
    xaxis: {
      categories: termComparison.map((t) => t.term),
      labels: { style: { fontSize: "11px", colors: C.body }, rotate: -25 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px", colors: C.body }, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) } },
    tooltip: { y: { formatter: (v) => `NLe ${v.toLocaleString()}` } },
    annotations: {
      yaxis: [{ y: 0, borderColor: C.danger, strokeDashArray: 5, label: { text: "Break-even", style: { fontSize: "10px", color: C.body, background: "transparent" } } }],
    },
  }), [termComparison]);

  const netTrendSeries = useMemo(() => [
    { name: "Net Balance", data: termComparison.map((t) => t.income - t.expense) },
  ], [termComparison]);

  // ── Chart: Income breakdown donut ─────────────────────────────────────────
  const incomeDonutOptions = useMemo((): ApexCharts.ApexOptions => ({
    ...baseChart,
    chart: { ...baseChart.chart, type: "donut" },
    labels: incomeByCategory.map((c) => c.category),
    colors: INCOME_COLORS,
    legend: { position: "bottom", fontSize: "11px" },
    dataLabels: { enabled: true, formatter: (v: number | string) => `${Number(v).toFixed(0)}%` },
    plotOptions: {
      pie: {
        donut: {
          size: "62%",
          labels: {
            show: true,
            total: {
              show: true, label: "Income", fontSize: "12px", color: C.body,
              formatter: () => `NLe ${incomeByCategory.reduce((s, c) => s + c.total, 0).toLocaleString()}`,
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (v) => `NLe ${v.toLocaleString()}` } },
  }), [incomeByCategory]);

  // ── Chart: Expense breakdown donut ────────────────────────────────────────
  const expenseDonutOptions = useMemo((): ApexCharts.ApexOptions => ({
    ...baseChart,
    chart: { ...baseChart.chart, type: "donut" },
    labels: expenseByCategory.map((c) => c.category),
    colors: EXPENSE_COLORS,
    legend: { position: "bottom", fontSize: "11px" },
    dataLabels: { enabled: true, formatter: (v: number | string) => `${Number(v).toFixed(0)}%` },
    plotOptions: {
      pie: {
        donut: {
          size: "62%",
          labels: {
            show: true,
            total: {
              show: true, label: "Expenses", fontSize: "12px", color: C.body,
              formatter: () => `NLe ${expenseByCategory.reduce((s, c) => s + c.total, 0).toLocaleString()}`,
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (v) => `NLe ${v.toLocaleString()}` } },
  }), [expenseByCategory]);

  // ── Chart: Top categories horizontal bar ──────────────────────────────────
  const topCatOptions = useMemo((): ApexCharts.ApexOptions => ({
    ...baseChart,
    chart: { ...baseChart.chart, type: "bar" },
    plotOptions: { bar: { horizontal: true, barHeight: "65%", borderRadius: 4, distributed: true } },
    colors: allCategories.map((c) => c.type === "income" ? C.success : C.danger),
    legend: { show: false },
    xaxis: {
      categories: allCategories.map((c) => c.category),
      labels: { style: { fontSize: "11px", colors: C.body }, formatter: (v) => { const n = Number(v); return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(v); } },
      axisBorder: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px", colors: C.body } } },
    tooltip: {
      y: { formatter: (v) => `NLe ${v.toLocaleString()}` },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      x: { formatter: (_: string, opts: any) => { const c = allCategories[opts?.dataPointIndex]; return c ? `${c.type === "income" ? "Income" : "Expense"}: ${c.category}` : ""; } },
    },
    grid: { ...baseChart.grid, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
  }), [allCategories]);

  const topCatSeries = useMemo(() => [{ name: "Amount", data: allCategories.map((c) => c.total) }], [allCategories]);

  // ── Chart: Radial income vs expense ratio ─────────────────────────────────
  const radialSeries = useMemo(() => {
    const max = Math.max(summary?.totalIncome ?? 0, summary?.totalExpense ?? 0, 1);
    return [
      Math.round(((summary?.totalIncome ?? 0) / max) * 100),
      Math.round(((summary?.totalExpense ?? 0) / max) * 100),
    ];
  }, [summary]);

  const radialOptions = useMemo((): ApexCharts.ApexOptions => ({
    ...baseChart,
    chart: { ...baseChart.chart, type: "radialBar" },
    plotOptions: {
      radialBar: {
        startAngle: -135, endAngle: 135,
        hollow: { size: "28%", margin: 5 },
        track: { background: C.stroke, strokeWidth: "97%", margin: 5 },
        dataLabels: {
          name: { fontSize: "12px", color: C.body, offsetY: -8 },
          value: { fontSize: "14px", fontWeight: 700, offsetY: 4, formatter: (v: number | string) => `${Number(v).toFixed(0)}%` },
          total: {
            show: true, label: "Net", color: C.body, fontSize: "11px",
            formatter: () => summary
              ? (summary.netBalance >= 0
                ? `+NLe ${summary.netBalance.toLocaleString()}`
                : `-NLe ${Math.abs(summary.netBalance).toLocaleString()}`)
              : "—",
          },
        },
      },
    },
    colors: [C.success, C.danger],
    labels: ["Income", "Expense"],
  }), [summary]);

  return (
    <div className="space-y-6">
      {/* Filters + export */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelCls}>Term</label>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} className={inputCls + " w-56"}>
            <option value="">All time</option>
            {terms.map((t) => <option key={t._id} value={t._id}>{termLabel(t)}</option>)}
          </select>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => exportApi.financialRecords()}
            className="flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" /></div>
      ) : summary ? (
        <>
          {/* ── KPI cards ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
              iconBg="bg-meta-3/10"
              icon={<TrendingUp className="h-5 w-5 text-meta-3" />}
              value={`NLe ${fmt(summary.totalIncome)}`}
              label="Total Income"
            />
            <KpiCard
              iconBg="bg-meta-1/10"
              icon={<TrendingDown className="h-5 w-5 text-meta-1" />}
              value={`NLe ${fmt(summary.totalExpense)}`}
              label="Total Expense"
            />
            <KpiCard
              iconBg={summary.netBalance >= 0 ? "bg-primary/10" : "bg-meta-1/10"}
              icon={<Wallet className={`h-5 w-5 ${summary.netBalance >= 0 ? "text-primary" : "text-meta-1"}`} />}
              value={`NLe ${fmt(Math.abs(summary.netBalance))}`}
              label={`Net ${summary.netBalance >= 0 ? "Surplus" : "Deficit"}`}
            />
            <KpiCard
              iconBg="bg-violet-500/10"
              icon={<TrendingUp className="h-5 w-5 text-violet-500" />}
              value={savingsRate !== null ? `${savingsRate}%` : "—"}
              label="Savings Rate"
              sub="of income retained"
            />
            <KpiCard
              iconBg="bg-amber-500/10"
              icon={<TrendingDown className="h-5 w-5 text-amber-500" />}
              value={expenseRatio !== null ? `${expenseRatio}%` : "—"}
              label="Expense Ratio"
              sub="of income spent"
            />
          </div>

          {/* ── Income vs Expense bar + Radial ratio ── */}
          {termComparison.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader><span className="text-sm font-semibold text-black dark:text-white">Income vs Expense — by Term</span></CardHeader>
                <CardContent className="pt-0">
                  <ReactApexChart
                    type="bar"
                    options={termBarOptions}
                    series={termBarSeries}
                    height={280}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><span className="text-sm font-semibold text-black dark:text-white">Income / Expense Ratio</span></CardHeader>
                <CardContent className="pt-0">
                  <ReactApexChart
                    type="radialBar"
                    options={radialOptions}
                    series={radialSeries}
                    height={280}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Net balance trend ── */}
          {termComparison.length > 1 && (
            <Card>
              <CardHeader><span className="text-sm font-semibold text-black dark:text-white">Net Balance Trend</span></CardHeader>
              <CardContent className="pt-0">
                <ReactApexChart
                  type="area"
                  options={netTrendOptions}
                  series={netTrendSeries}
                  height={200}
                />
              </CardContent>
            </Card>
          )}

          {/* ── Category donut charts ── */}
          {(incomeByCategory.length > 0 || expenseByCategory.length > 0) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader><span className="text-sm font-semibold text-black dark:text-white">Income by Category</span></CardHeader>
                <CardContent className="pt-0">
                  {incomeByCategory.length > 0 ? (
                    <ReactApexChart
                      type="donut"
                      options={incomeDonutOptions}
                      series={incomeByCategory.map((c) => c.total)}
                      height={290}
                    />
                  ) : (
                    <p className="py-10 text-center text-xs text-body">No income data.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><span className="text-sm font-semibold text-black dark:text-white">Expense by Category</span></CardHeader>
                <CardContent className="pt-0">
                  {expenseByCategory.length > 0 ? (
                    <ReactApexChart
                      type="donut"
                      options={expenseDonutOptions}
                      series={expenseByCategory.map((c) => c.total)}
                      height={290}
                    />
                  ) : (
                    <p className="py-10 text-center text-xs text-body">No expense data.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Top categories horizontal bar ── */}
          {allCategories.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-black dark:text-white">Top Categories by Amount</span>
                  <div className="flex items-center gap-3 text-[11px] text-body">
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-meta-3" /> Income</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-meta-1" /> Expense</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ReactApexChart
                  type="bar"
                  options={topCatOptions}
                  series={topCatSeries}
                  height={Math.max(220, allCategories.length * 42)}
                />
              </CardContent>
            </Card>
          )}

          {/* ── Term-over-term comparison table ── */}
          {termComparison.length > 0 && (
            <Card>
              <CardHeader><span className="text-sm font-semibold text-black dark:text-white">Term-over-Term Summary</span></CardHeader>
              <CardContent className="overflow-x-auto pt-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stroke dark:border-strokedark">
                      {["Term", "Income", "Expense", "Net", "Trend"].map((h) => (
                        <th key={h} className="pb-3 text-left text-xs font-semibold text-black dark:text-white">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-strokedark">
                    {termComparison.map((row, i) => {
                      const net = row.income - row.expense;
                      const prev = termComparison[i - 1];
                      const prevNet = prev ? prev.income - prev.expense : null;
                      const improved = prevNet !== null ? net > prevNet : null;
                      return (
                        <tr key={row.termId} className="hover:bg-stroke/20 dark:hover:bg-meta-4/20">
                          <td className="py-2.5 pr-4 text-xs font-medium text-black dark:text-white">{row.term}</td>
                          <td className="py-2.5 pr-4 text-xs font-medium text-meta-3">NLe {fmt(row.income)}</td>
                          <td className="py-2.5 pr-4 text-xs font-medium text-meta-1">NLe {fmt(row.expense)}</td>
                          <td className={`py-2.5 pr-4 text-xs font-semibold ${net >= 0 ? "text-primary" : "text-meta-1"}`}>
                            {net >= 0 ? "+" : ""}NLe {fmt(net)}
                          </td>
                          <td className="py-2.5 text-xs">
                            {improved === null ? <span className="text-body">—</span>
                              : improved
                                ? <span className="flex items-center gap-1 text-meta-3"><TrendingUp className="h-3 w-3" /> Up</span>
                                : <span className="flex items-center gap-1 text-meta-1"><TrendingDown className="h-3 w-3" /> Down</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      ) : !isLoading ? (
        <Card><CardContent className="py-14 text-center text-sm text-body">No financial data found. Add records in the Ledger tab to see reports.</CardContent></Card>
      ) : null}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "ledger", label: "Ledger" },
  { id: "budget", label: "Budget" },
  { id: "accounts", label: "Accounts" },
  { id: "reports", label: "Reports" },
];

export default function FinancialRecordsPage() {
  const [tab, setTab] = useState<Tab>("ledger");

  const { data: terms = [] } = useQuery({
    queryKey: ["academic-terms"],
    queryFn: termApi.getAll,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["financial-accounts"],
    queryFn: financialApi.getAccounts,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Landmark className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white">Financial Records</h1>
          <p className="text-sm text-body">Track income, expenses, budgets and accounts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-stroke bg-stroke/20 p-1 dark:border-strokedark dark:bg-meta-4/20">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              tab === id
                ? "bg-white text-black shadow-sm dark:bg-boxdark dark:text-white"
                : "text-body hover:text-black dark:hover:text-white",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "ledger" && <LedgerTab terms={terms as AcademicTerm[]} accounts={accounts as FinancialAccount[]} />}
      {tab === "budget" && <BudgetTab terms={terms as AcademicTerm[]} />}
      {tab === "accounts" && <AccountsTab />}
      {tab === "reports" && <ReportsTab terms={terms as AcademicTerm[]} />}
    </div>
  );
}
