"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { planApi } from "@/lib/api/plan";
import { SubscriptionReceiptView } from "@/components/report-card/SubscriptionReceiptView";

export default function PlanReceiptPage() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId") ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["plan-payment-receipt", paymentId],
    queryFn: () => planApi.getPlanPaymentReceipt(paymentId),
    enabled: !!paymentId,
  });

  if (!paymentId) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-meta-1">No payment selected.</p>
        <Link href="/admin/plan" className="text-xs text-primary underline">
          Back to Plan
        </Link>
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
        <p className="text-sm text-meta-1">Failed to load receipt.</p>
        <Link href="/admin/plan" className="text-xs text-primary underline">
          Back to Plan
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/admin/plan"
          className="flex items-center gap-1.5 text-sm text-body transition-colors hover:text-black dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plan
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-body">Receipt {data.payment.receiptNumber ?? "—"}</span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </button>
        </div>
      </div>

      <div className="overflow-auto print:overflow-visible">
        <SubscriptionReceiptView data={data} />
      </div>

      <style>{`
        @media print {
          @page { size: A5; margin: 0; }
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #receipt { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}
