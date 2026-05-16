"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Wallet, Download } from "lucide-react";
import { financialApi } from "@/lib/api/financial";
import { exportApi } from "@/lib/api/export";
import type { AcademicTerm } from "@/lib/types";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { useIsDark } from "@/hooks/useIsDark";
import { IncomeExpenseBar, NetBalanceTrend, CategoryDonut, FC } from "@/components/ui/FinancialCharts";
import { inputCls, labelCls, fmt, termLabel } from "./shared";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const C = FC;

const baseChart = (isDark: boolean): ApexCharts.ApexOptions => ({
  chart: { toolbar: { show: false }, background: "transparent", fontFamily: "inherit" },
  grid: { borderColor: C.stroke, strokeDashArray: 4 },
  dataLabels: { enabled: false },
  tooltip: { theme: isDark ? "dark" : "light" },
});

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

export function ReportsTab({ terms }: { terms: AcademicTerm[] }) {
  const [termId, setTermId] = useState("");
  const isDark = useIsDark();

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

  // ── Chart: Top categories horizontal bar ──────────────────────────────────
  const topCatOptions = useMemo((): ApexCharts.ApexOptions => ({
    ...baseChart(isDark),
    chart: { ...baseChart(isDark).chart, type: "bar" },
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
      theme: isDark ? "dark" : "light",
      y: { formatter: (v) => `NLe ${v.toLocaleString()}` },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      x: { formatter: (_: string, opts: any) => { const c = allCategories[opts?.dataPointIndex]; return c ? `${c.type === "income" ? "Income" : "Expense"}: ${c.category}` : ""; } },
    },
    grid: { ...baseChart(isDark).grid, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
  }), [allCategories, isDark]);

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
    ...baseChart(isDark),
    chart: { ...baseChart(isDark).chart, type: "radialBar" },
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
  }), [summary, isDark]);

  return (
    <div className="space-y-6">
      {/* Filters + export */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="reports-filter-term" className={labelCls}>Term</label>
          <select id="reports-filter-term" value={termId} onChange={(e) => setTermId(e.target.value)} className={inputCls + " w-56"}>
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
                  <IncomeExpenseBar termComparison={termComparison} height={280} />
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
                <NetBalanceTrend termComparison={termComparison} height={200} />
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
                    <CategoryDonut categories={incomeByCategory} type="income" height={290} />
                  ) : (
                    <p className="py-10 text-center text-xs text-body">No income data.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><span className="text-sm font-semibold text-black dark:text-white">Expense by Category</span></CardHeader>
                <CardContent className="pt-0">
                  {expenseByCategory.length > 0 ? (
                    <CategoryDonut categories={expenseByCategory} type="expense" height={290} />
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
