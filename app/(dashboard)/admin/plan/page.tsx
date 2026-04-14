"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { planApi } from "@/lib/api/plan";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, Zap, Shield, Crown, Loader2, AlertCircle } from "lucide-react";
import type { Plan } from "@/lib/types";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Shield className="w-7 h-7" />,
  basic: <Zap className="w-7 h-7" />,
  pro: <Crown className="w-7 h-7" />,
};

const PLAN_COLORS: Record<string, string> = {
  free: "border-gray-200 dark:border-gray-700",
  basic: "border-primary",
  pro: "border-violet-500",
};

const PLAN_BADGE: Record<string, string> = {
  basic: "bg-primary/10 text-primary",
  pro: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};

export default function PlanPage() {
  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ["available-plans"],
    queryFn: planApi.getAvailable,
  });

  const { data: myPlan } = useQuery({
    queryKey: ["my-plan"],
    queryFn: planApi.getMyPlan,
  });

  const checkout = useMutation({
    mutationFn: (planId: string) => planApi.createCheckout(planId),
    onSuccess: ({ checkoutUrl, sessionId }) => {
      localStorage.setItem("monime_session_id", sessionId);
      window.location.href = checkoutUrl;
    },
  });

  const currentPlanName = myPlan?.plan?.name;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>Failed to load plans. Please try again.</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose a Plan
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Upgrade your institute to unlock more students, lecturers, and features.
        </p>
        {myPlan?.plan && (
          <p className="mt-2 text-sm text-primary font-medium">
            Current plan: <span className="capitalize">{myPlan.plan.displayName || myPlan.plan.name}</span>
            {myPlan.planExpiry && (
              <span className="ml-2 text-gray-400 font-normal">
                · Expires {new Date(myPlan.planExpiry).toLocaleDateString()}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan: Plan) => {
          const isCurrent = plan.name === currentPlanName;
          const isSelected = selectedPlanId === plan._id;
          const isFree = plan.name === "free";

          return (
            <div
              key={plan._id}
              onClick={() => !isFree && setSelectedPlanId(plan._id)}
              className={`relative rounded-2xl border-2 p-6 transition-all duration-200 bg-white dark:bg-boxdark
                ${PLAN_COLORS[plan.name] || "border-gray-200 dark:border-gray-700"}
                ${!isFree ? "cursor-pointer hover:shadow-lg" : "opacity-80"}
                ${isSelected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900" : ""}
              `}
            >
              {plan.name === "basic" && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-primary text-white">
                  Popular
                </span>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${PLAN_BADGE[plan.name] || "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                  {PLAN_ICONS[plan.name] || <Shield className="w-7 h-7" />}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white capitalize">
                    {plan.displayName || plan.name}
                  </h2>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isFree ? "Free" : `NLe ${(plan.price || 0).toLocaleString()}`}
                    {!isFree && <span className="text-sm font-normal text-gray-400">/mo</span>}
                  </p>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                <FeatureItem label={`Up to ${plan.limits.maxStudents} students`} />
                <FeatureItem label={`Up to ${plan.limits.maxLecturers} lecturers`} />
                <FeatureItem label={`Up to ${plan.limits.maxClasses} classes`} />
                {plan.limits.maxStorageMB && (
                  <FeatureItem label={`${plan.limits.maxStorageMB} MB storage`} />
                )}
              </ul>

              {isFree ? (
                <div className="w-full py-2 rounded-xl text-center text-sm font-medium text-gray-400 bg-gray-100 dark:bg-gray-800">
                  {isCurrent ? "Current Plan" : "Default"}
                </div>
              ) : isCurrent ? (
                <div className="w-full py-2 rounded-xl text-center text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20">
                  Active Plan
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    checkout.mutate(plan._id);
                  }}
                  disabled={checkout.isPending && selectedPlanId === plan._id}
                  className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {checkout.isPending && selectedPlanId === plan._id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Redirecting...
                    </span>
                  ) : (
                    "Upgrade Now"
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {checkout.isError && (
        <div className="mt-6 flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Failed to initiate payment. Please try again.</span>
        </div>
      )}
    </div>
  );
}

function FeatureItem({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      {label}
    </li>
  );
}
