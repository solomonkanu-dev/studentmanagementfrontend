"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useIsDark } from "@/hooks/useIsDark";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Shared palette ───────────────────────────────────────────────────────────

export const FC = {
  primary: "#3c50e0",
  success: "#10b981",
  danger:  "#fb5454",
  warning: "#f59e0b",
  violet:  "#8b5cf6",
  body:    "#64748b",
  stroke:  "#e2e8f0",
};

export const INCOME_COLORS  = ["#10b981","#3c50e0","#8b5cf6","#f59e0b","#06b6d4","#84cc16"];
export const EXPENSE_COLORS = ["#fb5454","#f59e0b","#8b5cf6","#3c50e0","#ec4899","#f97316","#14b8a6","#06b6d4","#a78bfa"];

export function baseChartOptions(isDark: boolean): ApexCharts.ApexOptions {
  return {
    chart: { toolbar: { show: false }, background: "transparent", fontFamily: "inherit" },
    grid: { borderColor: FC.stroke, strokeDashArray: 4 },
    dataLabels: { enabled: false },
    tooltip: { theme: isDark ? "dark" : "light" },
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TermComparison {
  termId: string;
  term: string;
  income: number;
  expense: number;
}

export interface CategoryStat {
  type: "income" | "expense";
  category: string;
  total: number;
}

// ─── IncomeExpenseBar ─────────────────────────────────────────────────────────

export function IncomeExpenseBar({
  termComparison,
  height = 280,
}: {
  termComparison: TermComparison[];
  height?: number;
}) {
  const isDark = useIsDark();
  const base = baseChartOptions(isDark);

  const options = useMemo((): ApexCharts.ApexOptions => ({
    ...base,
    chart: { ...base.chart, type: "bar" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } },
    colors: [FC.success, FC.danger],
    xaxis: {
      categories: termComparison.map((t) => t.term),
      labels: { style: { fontSize: "11px", colors: FC.body }, rotate: -25 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px", colors: FC.body }, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) } },
    tooltip: { ...base.tooltip, y: { formatter: (v) => `NLe ${v.toLocaleString()}` } },
    legend: { position: "top", fontSize: "12px" },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [termComparison, isDark]);

  const series = useMemo(() => [
    { name: "Income",  data: termComparison.map((t) => t.income) },
    { name: "Expense", data: termComparison.map((t) => t.expense) },
  ], [termComparison]);

  return <ReactApexChart type="bar" options={options} series={series} height={height} />;
}

// ─── NetBalanceTrend ──────────────────────────────────────────────────────────

export function NetBalanceTrend({
  termComparison,
  height = 200,
}: {
  termComparison: TermComparison[];
  height?: number;
}) {
  const isDark = useIsDark();
  const base = baseChartOptions(isDark);

  const options = useMemo((): ApexCharts.ApexOptions => ({
    ...base,
    chart: { ...base.chart, type: "area" },
    stroke: { curve: "smooth", width: 2.5 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0.03 } },
    colors: [FC.primary],
    xaxis: {
      categories: termComparison.map((t) => t.term),
      labels: { style: { fontSize: "11px", colors: FC.body }, rotate: -25 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px", colors: FC.body }, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) } },
    tooltip: { ...base.tooltip, y: { formatter: (v) => `NLe ${v.toLocaleString()}` } },
    annotations: {
      yaxis: [{ y: 0, borderColor: FC.danger, strokeDashArray: 5, label: { text: "Break-even", style: { fontSize: "10px", color: FC.body, background: "transparent" } } }],
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [termComparison, isDark]);

  const series = useMemo(() => [
    { name: "Net Balance", data: termComparison.map((t) => t.income - t.expense) },
  ], [termComparison]);

  return <ReactApexChart type="area" options={options} series={series} height={height} />;
}

// ─── CategoryDonut ────────────────────────────────────────────────────────────

export function CategoryDonut({
  categories,
  type,
  height = 290,
}: {
  categories: CategoryStat[];
  type: "income" | "expense";
  height?: number;
}) {
  const isDark = useIsDark();
  const base = baseChartOptions(isDark);
  const colors = type === "income" ? INCOME_COLORS : EXPENSE_COLORS;
  const label = type === "income" ? "Income" : "Expenses";

  const options = useMemo((): ApexCharts.ApexOptions => ({
    ...base,
    chart: { ...base.chart, type: "donut" },
    labels: categories.map((c) => c.category),
    colors,
    legend: { position: "bottom", fontSize: "11px" },
    dataLabels: { enabled: true, formatter: (v: number | string) => `${Number(v).toFixed(0)}%` },
    plotOptions: {
      pie: {
        donut: {
          size: "62%",
          labels: {
            show: true,
            total: {
              show: true,
              label,
              fontSize: "12px",
              color: FC.body,
              formatter: () => `NLe ${categories.reduce((s, c) => s + c.total, 0).toLocaleString()}`,
            },
          },
        },
      },
    },
    tooltip: { ...base.tooltip, y: { formatter: (v) => `NLe ${v.toLocaleString()}` } },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [categories, type, isDark]);

  const series = useMemo(() => categories.map((c) => c.total), [categories]);

  return <ReactApexChart type="donut" options={options} series={series} height={height} />;
}
