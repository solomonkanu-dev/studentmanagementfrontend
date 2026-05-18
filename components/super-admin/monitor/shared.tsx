import type { GrowthPoint } from "@/lib/types";

export function fmt(n: number) {
  return `NLe ${n.toLocaleString()}`;
}

export function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

export const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function monthLabel(p: GrowthPoint) {
  return `${MONTH_NAMES[(p.month - 1) % 12]} ${String(p.year).slice(2)}`;
}

// Merge growth series into unified month slots
export function mergeGrowthSeries(
  series: { label: string; color: string; data: GrowthPoint[] }[]
) {
  const keySet = new Set<string>();
  series.forEach((s) =>
    s.data.forEach((p) => keySet.add(`${p.year}-${p.month}`))
  );
  const keys = Array.from(keySet).sort();
  return keys.map((k) => {
    const [y, m] = k.split("-").map(Number);
    const label = monthLabel({ year: y, month: m, count: 0 });
    const vals: Record<string, number> = {};
    series.forEach((s) => {
      const found = s.data.find((p) => p.year === y && p.month === m);
      vals[s.label] = found?.count ?? 0;
    });
    return { label, ...vals };
  });
}

export function ProgressBar({ value, max, color = "bg-indigo-500" }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
      <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
    </div>
  );
}
