"use client";

import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export default function PlanCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-[500px] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Cancelled
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Your payment was cancelled and you have not been charged. You can upgrade anytime.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.replace("/admin/plan")}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
          >
            View Plans
          </button>
          <button
            onClick={() => router.replace("/admin")}
            className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
