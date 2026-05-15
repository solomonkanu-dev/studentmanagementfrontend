"use client";

import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/lib/api/student";
import { useAuth } from "@/context/AuthContext";
import { FullReceiptView } from "@/components/report-card/FullReceiptView";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StudentFullReceiptPage() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-full-receipt"],
    queryFn: studentApi.getMyFullReceipt,
  });

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
        <p className="text-sm text-meta-1">Failed to load receipt.</p>
        <Link href="/student/fees" className="text-xs text-primary underline">Back to Fees</Link>
      </div>
    );
  }

  const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/student/fees"
          className="flex items-center gap-1.5 text-sm text-body hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Fees
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-body">
            {data.payments.length} payment{data.payments.length !== 1 ? "s" : ""} · Total: {totalPaid.toLocaleString()}
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </button>
        </div>
      </div>

      <div className="overflow-auto print:overflow-visible">
        <FullReceiptView data={data} student={user} />
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          #full-receipt, #full-receipt * { visibility: visible; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #full-receipt { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}
