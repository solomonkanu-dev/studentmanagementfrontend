import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
        <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <div className="mt-4">
        <h4 className="text-2xl font-bold text-black dark:text-white">{value}</h4>
        <span className="text-sm font-medium text-body">{label}</span>
      </div>
    </div>
  );
}
