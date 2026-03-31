"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { ReportCardView } from "@/components/report-card/ReportCardView";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReportCardData } from "@/lib/api/student";

export default function AdminReportCardPage() {
  const params = useSearchParams();
  const studentId = params.get("studentId") ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-report-card", studentId],
    queryFn: () => adminApi.getReportCard(studentId),
    enabled: !!studentId,
  });

  if (!studentId) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-meta-1">No student selected.</p>
        <Link href="/admin/results" className="text-xs text-primary underline">Back to Results</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-meta-1">Failed to load report card.</p>
        <Link href="/admin/results" className="text-xs text-primary underline">Back to Results</Link>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/admin/results"
          className="flex items-center gap-1.5 text-sm text-body hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Results
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-body">
            {(data as ReportCardData).student?.fullName}
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Download / Print PDF
          </button>
        </div>
      </div>

      <div className="overflow-auto print:overflow-visible">
        <ReportCardView data={data as ReportCardData} />
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          #report-card, #report-card * { visibility: visible; }
          #report-card { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}
