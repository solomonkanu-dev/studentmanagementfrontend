"use client";

import { useQuery } from "@tanstack/react-query";
import { termApi } from "@/lib/api/term";
import { CalendarDays } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function AcademicTermBanner() {
  const { data: terms = [], isLoading } = useQuery({
    queryKey: ["academic-terms"],
    queryFn: termApi.getAll,
  });

  if (isLoading) return null;

  const current = terms.find((t) => t.isCurrent);
  if (!current) return null;

  const remaining = daysLeft(current.endDate);
  const total =
    (new Date(current.endDate).getTime() - new Date(current.startDate).getTime()) /
    (1000 * 60 * 60 * 24);
  const elapsed = total - remaining;
  const progressPct = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 py-4 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: icon + label */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-body">
              Current {current.type === "semester" ? "Semester" : "Term"}
            </p>
            <p className="text-sm font-semibold text-black dark:text-white">
              {current.name}
              <span className="ml-2 text-xs font-normal text-body">
                {current.academicYear}
              </span>
            </p>
          </div>
        </div>

        {/* Right: dates + days left */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-body">
          <span>
            <span className="font-medium text-black dark:text-white">Start:</span>{" "}
            {formatDate(current.startDate)}
          </span>
          <span>
            <span className="font-medium text-black dark:text-white">End:</span>{" "}
            {formatDate(current.endDate)}
          </span>
          <span
            className={`font-semibold ${
              remaining <= 14
                ? "text-meta-1"
                : remaining <= 30
                ? "text-warning"
                : "text-meta-3"
            }`}
          >
            {remaining} day{remaining !== 1 ? "s" : ""} left
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark h-1.5">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-body">
        <span>{progressPct}% complete</span>
        <span>{remaining} days remaining</span>
      </div>
    </div>
  );
}
