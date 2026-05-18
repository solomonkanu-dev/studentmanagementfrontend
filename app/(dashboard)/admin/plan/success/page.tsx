"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { planApi } from "@/lib/api/plan";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle, Receipt } from "lucide-react";

export default function PlanSuccessPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [planName, setPlanName] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const sessionId = localStorage.getItem("monime_session_id");

    // All state updates happen in the async callbacks below — the missing-session
    // case flows through .catch() too, so nothing is set synchronously here.
    const run = sessionId
      ? planApi.verifyPayment(sessionId)
      : Promise.reject(new Error("Missing session reference — cannot verify payment."));

    run
      .then((result) => {
        localStorage.removeItem("monime_session_id");
        setPlanName(result.plan?.displayName || result.plan?.name || "");
        setReceiptId(result.payment?._id ?? "");
        setStatus("success");
        queryClient.invalidateQueries({ queryKey: ["my-plan"] });
        queryClient.invalidateQueries({ queryKey: ["billing-summary"] });
        queryClient.invalidateQueries({ queryKey: ["plan-payments"] });
      })
      .catch((err) => {
        setErrorMsg(
          err?.response?.data?.message || err?.message || "Payment verification failed."
        );
        setStatus("error");
      });
  }, [queryClient]);

  return (
    <div className="flex min-h-[500px] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-primary" />
            <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              Verifying your payment…
            </h2>
            <p className="text-gray-500 dark:text-gray-400">Please wait, do not close this page.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              Payment Successful
            </h2>
            <p className="mb-6 text-gray-500 dark:text-gray-400">
              Your{" "}
              <span className="font-semibold capitalize text-gray-700 dark:text-gray-200">
                {planName}
              </span>{" "}
              subscription is now active.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {receiptId && (
                <button
                  onClick={() => router.push(`/admin/plan/receipt?paymentId=${receiptId}`)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  <Receipt className="h-4 w-4" />
                  View Receipt
                </button>
              )}
              <button
                onClick={() => router.replace("/admin")}
                className="rounded-xl border border-gray-300 px-6 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              Verification Failed
            </h2>
            <p className="mb-6 text-gray-500 dark:text-gray-400">{errorMsg}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => router.replace("/admin/plan")}
                className="rounded-xl border border-gray-300 px-6 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Back to Plan
              </button>
              <button
                onClick={() => router.replace("/admin")}
                className="rounded-xl bg-primary px-6 py-2.5 font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
