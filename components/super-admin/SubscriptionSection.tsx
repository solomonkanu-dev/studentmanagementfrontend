"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, DollarSign, TrendingUp, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import type { SubscriptionReport } from "@/lib/types";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Loader, ErrorBlock } from "./CardState";

const money = (n: number) => `NLe ${n.toLocaleString()}`;

function StatTile({
  label,
  value,
  sub,
  icon,
  bg,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="rounded-sm border border-stroke bg-whiter p-4 dark:border-strokedark dark:bg-meta-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-body">{label}</p>
          <p className="mt-1 truncate text-lg font-bold text-black dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-body">{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function SubscriptionSection() {
  const { data, isLoading, isError, refetch } = useQuery<SubscriptionReport>({
    queryKey: ["monitor-subscriptions"],
    queryFn: () => monitorApi.getSubscriptions(),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-black dark:text-white">Subscription Revenue</h2>
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorBlock onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <Loader />
        ) : (
          <div className="space-y-6">
            {/* KPI tiles */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile
                label="Monthly Recurring (MRR)"
                value={money(data.summary.mrr)}
                icon={<DollarSign className="h-5 w-5 text-primary" />}
                bg="bg-primary/10"
              />
              <StatTile
                label="Annual Recurring (ARR)"
                value={money(data.summary.arr)}
                icon={<TrendingUp className="h-5 w-5 text-meta-3" />}
                bg="bg-meta-3/10"
              />
              <StatTile
                label="Active Subscriptions"
                value={String(data.summary.activeSubscriptions)}
                sub={`${data.summary.paidSubscriptions} paid · ${data.summary.freeSubscriptions} free`}
                icon={<CheckCircle2 className="h-5 w-5 text-indigo-500" />}
                bg="bg-indigo-500/10"
              />
              <StatTile
                label="Expiring Soon"
                value={String(data.summary.expiringSoon)}
                sub={`${data.summary.expired} expired · ${data.summary.unassigned} unassigned`}
                icon={<Clock className="h-5 w-5 text-warning" />}
                bg="bg-warning/10"
              />
            </div>

            {/* Institutes per plan */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">
                Institutes per Plan
              </h3>
              {data.byPlan.length === 0 ? (
                <p className="text-sm text-body">No active subscriptions yet.</p>
              ) : (
                <ul className="space-y-3">
                  {(() => {
                    const maxCount = Math.max(...data.byPlan.map((p) => p.instituteCount), 1);
                    return data.byPlan.map((p) => (
                      <li key={p.planId}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-black dark:text-white">
                            {p.displayName ?? p.name}
                            <span className="ml-1.5 text-body">
                              {p.price > 0 ? `${money(p.price)}/yr` : "Free"}
                            </span>
                          </span>
                          <span className="text-body">
                            {p.instituteCount} {p.instituteCount === 1 ? "institute" : "institutes"}
                            {p.mrr > 0 && ` · ${money(p.mrr)} MRR`}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.round((p.instituteCount / maxCount) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ));
                  })()}
                </ul>
              )}
            </div>

            {/* Expiring + expired lists */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-body">
                  <Clock className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                  Expiring Soon
                </h3>
                {data.expiring.length === 0 ? (
                  <p className="text-sm text-body">Nothing expiring soon.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.expiring.slice(0, 6).map((e) => (
                      <li key={e.instituteId} className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate font-medium text-black dark:text-white">
                          {e.instituteName}
                          <span className="ml-1 text-body">· {e.planName}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 font-semibold text-warning">
                          {e.daysUntilExpiry === 0 ? "today" : `${e.daysUntilExpiry}d`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-body">
                  <AlertTriangle className="h-3.5 w-3.5 text-meta-1" aria-hidden="true" />
                  Expired
                </h3>
                {data.expired.length === 0 ? (
                  <p className="text-sm text-body">No expired subscriptions.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.expired.slice(0, 6).map((e) => (
                      <li key={e.instituteId} className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate font-medium text-black dark:text-white">
                          {e.instituteName}
                          <span className="ml-1 text-body">· {e.planName}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-meta-1/10 px-2 py-0.5 font-semibold text-meta-1">
                          {e.daysSinceExpiry}d ago
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
