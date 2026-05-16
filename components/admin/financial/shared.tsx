"use client";

import { useEffect } from "react";
import { z } from "zod";
import { fmtCurrency } from "@/lib/utils/currency";
import type { AcademicTerm } from "@/lib/types";

// ─── Field styling ─────────────────────────────────────────────────────────────

export const inputCls =
  "w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white";
export const labelCls = "mb-1 block text-xs font-medium text-black dark:text-white";

export function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-0.5 text-xs text-meta-1">{msg}</p> : null;
}

// ─── Modal keyboard handling (Escape to close) ─────────────────────────────────

export function useModalKeydown(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
}

// ─── Constants ─────────────────────────────────────────────────────────────────

export const INCOME_CATEGORIES = ["Fee Payments", "Government Grants", "Donations", "Bank Interest", "Other Income"];
export const EXPENSE_CATEGORIES = ["Salaries", "Utilities", "Supplies & Stationery", "Maintenance & Repairs", "Transportation", "Rent", "Equipment", "Events & Activities", "Other Expenses"];
export const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "mobile_money", "cheque", "other"] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  mobile_money: "Mobile Money",
  cheque: "Cheque",
  other: "Other",
};

// ─── Format helpers ────────────────────────────────────────────────────────────

export const fmt = fmtCurrency;
export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const termLabel = (t: AcademicTerm) => `${t.name} — ${t.academicYear}`;

// ─── Zod schemas ───────────────────────────────────────────────────────────────

export const recordSchema = z.object({
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
export type RecordForm = z.infer<typeof recordSchema>;

export const budgetSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Category is required"),
  budgetedAmount: z.number().min(0, "Amount must be 0 or more"),
  termId: z.string().min(1, "Term is required"),
});
export type BudgetForm = z.infer<typeof budgetSchema>;

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["bank", "cash", "mobile_money"]),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  openingBalance: z.number().min(0),
});
export type AccountForm = z.infer<typeof accountSchema>;
