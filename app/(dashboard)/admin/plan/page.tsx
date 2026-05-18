"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { planApi } from "@/lib/api/plan";
import { errMsg } from "@/lib/utils/errMsg";
import {
  CheckCircle2,
  Shield,
  Crown,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  Receipt,
} from "lucide-react";
import type { Plan } from "@/lib/types";

function FeatureItem({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
      {label}
    </li>
  );
}

export default function PlanPage() {
  // null until the admin edits — the input otherwise shows the live count.
  const [countOverride, setCountOverride] = useState<number | null>(null);

  const {
    data: plans = [],
    isLoading: plansLoading,
    error: plansError,
  } = useQuery({ queryKey: ["available-plans"], queryFn: planApi.getAvailable });

  const { data: myPlan } = useQuery({ queryKey: ["my-plan"], queryFn: planApi.getMyPlan });

  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: ["billing-summary"],
    queryFn: planApi.getBillingSummary,
  });

  const checkout = useMutation({
    mutationFn: (studentCount: number) => planApi.createCheckout(studentCount),
    onSuccess: ({ checkoutUrl, sessionId }) => {
      let host = "";
      try {
        host = new URL(checkoutUrl).hostname;
      } catch {
        /* invalid URL */
      }
      if (host !== "monime.io" && !host.endsWith(".monime.io")) {
        console.error("Refusing checkout redirect to untrusted host:", host);
        return;
      }
      localStorage.setItem("monime_session_id", sessionId);
      window.location.href = checkoutUrl;
    },
  });

  const freePlan = plans.find((p: Plan) => p.name === "free");
  const paidPlan =
    plans.find((p: Plan) => p.name === "standard") ?? plans.find((p: Plan) => p.name !== "free");

  const currentName = myPlan?.plan?.name;
  const onPaid = currentName === "standard";
  const expired = !!myPlan?.expired;

  const liveCount = billing?.liveStudentCount ?? 0;
  const rate = billing?.pricePerStudent ?? paidPlan?.price ?? 0;
  const studentCount = countOverride ?? liveCount;
  const total = studentCount * rate;
  const belowLive = studentCount < liveCount;
  const canPay = !!billing?.currentTerm && studentCount >= 1 && !belowLive && !checkout.isPending;

  if (plansLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (plansError) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>Failed to load plans. Please try again.</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">Subscription Plan</h1>
        <p className="text-gray-500 dark:text-gray-400">
          The Standard plan is billed at NLe {rate.toLocaleString()} per student each academic term.
        </p>
      </div>

      {/* Current plan banner */}
      {myPlan?.plan && (
        <div
          className={`mb-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-lg px-4 py-2.5 text-sm ${
            expired
              ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
              : "bg-primary/5 text-primary"
          }`}
        >
          <span className="font-medium">
            Current plan:{" "}
            <span className="capitalize">{myPlan.plan.displayName || myPlan.plan.name}</span>
          </span>
          {onPaid && myPlan.subscription?.studentsPaidFor ? (
            <span className="text-gray-500 dark:text-gray-400">
              · {myPlan.subscription.studentsPaidFor.toLocaleString()} students
            </span>
          ) : null}
          {myPlan.planExpiry && (
            <span className="text-gray-500 dark:text-gray-400">
              · {expired ? "expired" : "expires"}{" "}
              {new Date(myPlan.planExpiry).toLocaleDateString()}
            </span>
          )}
          {expired && <span className="font-semibold">— renew below</span>}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Free plan ── */}
        {freePlan && (
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-boxdark">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-gray-100 p-2 text-gray-500 dark:bg-gray-800">
                <Shield className="h-7 w-7" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">Free</h2>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">NLe 0</p>
              </div>
            </div>
            <ul className="mb-6 space-y-2">
              <FeatureItem label={`Up to ${freePlan.limits.maxStudents} students`} />
              <FeatureItem label={`Up to ${freePlan.limits.maxLecturers} lecturers`} />
              <FeatureItem label={`Up to ${freePlan.limits.maxClasses} classes`} />
            </ul>
            <div
              className={`w-full rounded-xl py-2 text-center text-sm font-medium ${
                currentName === "free"
                  ? "bg-green-50 text-green-600 dark:bg-green-900/20"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-800"
              }`}
            >
              {currentName === "free" ? "Current Plan" : "Default tier"}
            </div>
          </div>
        )}

        {/* ── Standard plan + billing calculator ── */}
        {paidPlan && (
          <div className="rounded-2xl border-2 border-primary bg-white p-6 dark:bg-boxdark">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Crown className="h-7 w-7" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">Standard</h2>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  NLe {rate.toLocaleString()}
                  <span className="text-sm font-normal text-gray-400"> / student / term</span>
                </p>
              </div>
            </div>
            <ul className="mb-4 space-y-2">
              <FeatureItem label="Student capacity = the number you pay for" />
              <FeatureItem label="Generous lecturer & class limits" />
              <FeatureItem label="Billed per academic term" />
            </ul>

            {billingLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : !billing?.currentTerm ? (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Set your current academic term first.</p>
                    <p className="mt-0.5 text-xs">
                      A subscription is billed for a term, so one must be marked current.
                    </p>
                    <Link href="/admin/terms" className="mt-1 inline-block text-xs font-semibold underline">
                      Manage terms →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-stroke p-4 dark:border-strokedark">
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  Billing for{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {billing.currentTerm.name}
                    {billing.currentTerm.academicYear ? ` · ${billing.currentTerm.academicYear}` : ""}
                  </span>
                </p>

                <label
                  htmlFor="student-count"
                  className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300"
                >
                  Number of students
                </label>
                <input
                  id="student-count"
                  type="number"
                  min={1}
                  value={studentCount}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setCountOverride(Number.isNaN(v) ? 0 : Math.max(0, v));
                  }}
                  className="h-10 w-full rounded-lg border border-stroke bg-transparent px-3 text-sm text-gray-900 outline-none focus:border-primary dark:border-strokedark dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-400">
                  You have {liveCount.toLocaleString()} students enrolled.
                </p>
                {belowLive && (
                  <p className="mt-1 text-xs font-medium text-meta-1">
                    Pay for at least {liveCount.toLocaleString()} — your current enrolment.
                  </p>
                )}

                <div className="my-3 flex items-center justify-between border-t border-stroke pt-3 text-sm dark:border-strokedark">
                  <span className="text-gray-500 dark:text-gray-400">
                    {studentCount.toLocaleString()} × NLe {rate.toLocaleString()}
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    NLe {total.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => checkout.mutate(studentCount)}
                  disabled={!canPay}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkout.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" /> Pay NLe {total.toLocaleString()} — Card / Mobile Money
                    </>
                  )}
                </button>
                <p className="mt-2 text-[11px] text-gray-400">
                  Paying by cash or bank transfer? Your service provider records those payments and
                  issues the receipt.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {checkout.isError && (
        <div className="mt-6 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errMsg(checkout.error, "Failed to start payment. Please try again.")}</span>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/admin/settings/plan"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Receipt className="h-4 w-4" />
          View payment history &amp; receipts
        </Link>
      </div>
    </div>
  );
}
