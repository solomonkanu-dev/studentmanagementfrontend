"use client";

import { ModuleGuard } from "@/components/ui/ModuleGuard";
import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { financialApi } from "@/lib/api/financial";
import type { FinancialAccount } from "@/lib/api/financial";
import { termApi } from "@/lib/api/term";
import type { AcademicTerm } from "@/lib/types";
import { Landmark } from "lucide-react";
import { LedgerTab } from "@/components/admin/financial/LedgerTab";
import { BudgetTab } from "@/components/admin/financial/BudgetTab";
import { AccountsTab } from "@/components/admin/financial/AccountsTab";
import { ReportsTab } from "@/components/admin/financial/ReportsTab";

type Tab = "ledger" | "budget" | "accounts" | "reports";

const TABS: { id: Tab; label: string }[] = [
  { id: "ledger", label: "Ledger" },
  { id: "budget", label: "Budget" },
  { id: "accounts", label: "Accounts" },
  { id: "reports", label: "Reports" },
];

function FinancialRecordsPageInner() {
  const [tab, setTab] = useState<Tab>("ledger");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const { data: terms = [] } = useQuery({
    queryKey: ["academic-terms"],
    queryFn: termApi.getAll,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["financial-accounts"],
    queryFn: financialApi.getAccounts,
  });

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, currentId: Tab) => {
    const ids = TABS.map((t) => t.id);
    const currentIndex = ids.indexOf(currentId);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = ids[(currentIndex + 1) % ids.length];
      setTab(next);
      tabRefs.current[next]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = ids[(currentIndex - 1 + ids.length) % ids.length];
      setTab(prev);
      tabRefs.current[prev]?.focus();
    }
  }, []);

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
      <div
        role="tablist"
        aria-label="Financial management sections"
        className="flex gap-1 rounded-xl border border-stroke bg-stroke/20 p-1 dark:border-strokedark dark:bg-meta-4/20"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            ref={(el) => { tabRefs.current[id] = el; }}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`tabpanel-${id}`}
            id={`tab-${id}`}
            onClick={() => setTab(id)}
            onKeyDown={(e) => handleTabKeyDown(e, id)}
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
      <div
        role="tabpanel"
        id={`tabpanel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === "ledger" && <LedgerTab terms={terms as AcademicTerm[]} accounts={accounts as FinancialAccount[]} />}
        {tab === "budget" && <BudgetTab terms={terms as AcademicTerm[]} />}
        {tab === "accounts" && <AccountsTab />}
        {tab === "reports" && <ReportsTab terms={terms as AcademicTerm[]} />}
      </div>
    </div>
  );
}

export default function FinancialRecordsPage() {
  return <ModuleGuard moduleKey="financialRecords"><FinancialRecordsPageInner /></ModuleGuard>;
}
