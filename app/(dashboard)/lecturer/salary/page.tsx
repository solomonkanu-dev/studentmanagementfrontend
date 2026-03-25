"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { salaryApi } from "@/lib/api/salary";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Banknote, CheckCircle2, Clock, TrendingUp, Filter, XCircle } from "lucide-react";
import type { Salary } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUser(): { _id: string; fullName: string } | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("user") ?? "null");
  } catch {
    return null;
  }
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonth(raw: string) {
  if (!raw) return "—";
  const d = new Date(`${raw}-01`);
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function statusVariant(s: string): "success" | "warning" | "danger" {
  if (s === "paid") return "success";
  if (s === "cancelled") return "danger";
  return "warning";
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color: "default" | "green" | "yellow" | "blue";
}) {
  const colors = {
    default: "bg-meta-2 text-primary dark:bg-meta-4 dark:text-white",
    green: "bg-meta-3/10 text-meta-3",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    blue: "bg-primary/10 text-primary",
  };
  return (
    <div className="rounded-lg border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xs text-body">{label}</p>
      <p className="mt-1 text-xl font-bold text-black dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-body">{sub}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LecturerSalaryPage() {
  const user = getUser();
  const [yearFilter, setYearFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["lecturer-salary", user?._id],
    queryFn: () => salaryApi.getForLecturer(user!._id),
    enabled: !!user?._id,
  });

  const salaries: Salary[] = Array.isArray(data) ? data : [];

  // Available years for filter
  const years = useMemo(() => {
    const set = new Set<string>();
    salaries.forEach((s) => { const y = s.salaryMonth?.slice(0, 4); if (y) set.add(y); });
    return Array.from(set).sort().reverse();
  }, [salaries]);

  const filtered = useMemo(() => {
    if (yearFilter === "all") return salaries;
    return salaries.filter((s) => s.salaryMonth?.startsWith(yearFilter));
  }, [salaries, yearFilter]);

  // Stats
  const totalReceived = salaries.filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
  const totalPending = salaries.filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
  const latestSalary = [...salaries].sort((a, b) =>
    (b.salaryMonth ?? "").localeCompare(a.salaryMonth ?? "")
  )[0];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatPill
          icon={<Banknote className="h-5 w-5" aria-hidden="true" />}
          label="Total Records"
          value={String(salaries.length)}
          color="default"
        />
        <StatPill
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          label="Total Received"
          value={`$${fmt(totalReceived)}`}
          sub={`${salaries.filter((s) => s.status === "paid").length} paid`}
          color="green"
        />
        <StatPill
          icon={<Clock className="h-5 w-5" aria-hidden="true" />}
          label="Pending"
          value={`$${fmt(totalPending)}`}
          sub={`${salaries.filter((s) => s.status === "pending").length} record(s)`}
          color="yellow"
        />
        <StatPill
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
          label="Latest Total"
          value={latestSalary ? `$${fmt(latestSalary.totalAmount ?? 0)}` : "—"}
          sub={latestSalary ? formatMonth(latestSalary.salaryMonth) : undefined}
          color="blue"
        />
      </div>

      {/* Table card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-black dark:text-white">Salary History</h2>
            {years.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-body" aria-hidden="true" />
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="h-8 rounded border border-stroke bg-transparent px-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  aria-label="Filter by year"
                >
                  <option value="all">All years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" role="status" aria-label="Loading" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                <Banknote className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-black dark:text-white">
                {yearFilter !== "all" ? `No records for ${yearFilter}.` : "No salary records yet."}
              </p>
              <p className="text-xs text-body">Your salary records will appear here once processed.</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th>Month</Th>
                  <Th>Base Salary</Th>
                  <Th>Bonus</Th>
                  <Th>Deduction</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th>Paid On</Th>
                </tr>
              </TableHead>
              <TableBody>
                {filtered
                  .slice()
                  .sort((a, b) => (b.salaryMonth ?? "").localeCompare(a.salaryMonth ?? ""))
                  .map((s) => (
                    <tr key={s._id} className="hover:bg-whiter transition-colors dark:hover:bg-meta-4">
                      <Td>
                        <span className="font-medium text-black dark:text-white">
                          {formatMonth(s.salaryMonth)}
                        </span>
                      </Td>
                      <Td className="text-body">${fmt(s.salary ?? 0)}</Td>
                      <Td className="text-meta-3">+${fmt(s.bonus ?? 0)}</Td>
                      <Td className="text-meta-1">-${fmt(s.deduction ?? 0)}</Td>
                      <Td>
                        <span className="font-semibold text-black dark:text-white">
                          ${fmt(s.totalAmount ?? 0)}
                        </span>
                      </Td>
                      <Td>
                        <Badge variant={statusVariant(s.status)}>
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </Badge>
                      </Td>
                      <Td className="text-xs text-body">
                        {s.status === "paid" && s.paidDate
                          ? new Date(s.paidDate).toLocaleDateString("en-US", {
                              day: "numeric", month: "short", year: "numeric",
                            })
                          : "—"}
                      </Td>
                    </tr>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
