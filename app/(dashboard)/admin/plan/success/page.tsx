"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { planApi } from "@/lib/api/plan";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function PlanSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = searchParams.get("sessionId");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [planName, setPlanName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMsg("Missing session ID. Cannot verify payment.");
      return;
    }

    planApi.verifyPayment(sessionId)
      .then((result) => {
        setPlanName(result.plan?.displayName || result.plan?.name || "");
        setStatus("success");
        queryClient.invalidateQueries({ queryKey: ["my-plan"] });
        setTimeout(() => router.replace("/admin"), 4000);
      })
      .catch((err) => {
        setErrorMsg(err?.response?.data?.message || "Payment verification failed.");
        setStatus("error");
      });
  }, [sessionId, queryClient, router]);

  return (
    <div className="min-h-[500px] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Verifying your payment...
            </h2>
            <p className="text-gray-500 dark:text-gray-400">Please wait, do not close this page.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Your <span className="font-semibold capitalize text-gray-700 dark:text-gray-200">{planName}</span> plan
              is now active. Redirecting you to the dashboard...
            </p>
            <button
              onClick={() => router.replace("/admin")}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{errorMsg}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.replace("/admin/plan")}
                className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back to Plans
              </button>
              <button
                onClick={() => router.replace("/admin")}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
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
