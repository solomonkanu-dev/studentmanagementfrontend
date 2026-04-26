"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { parentApi } from "@/lib/api/parent";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreditCard, GraduationCap } from "lucide-react";
import { groupFeesByTerm } from "@/lib/utils/feeGrouping";
import type { LinkedStudent } from "@/lib/types";

interface FeeItem {
  title: string;
  amount: number;
  paid: number;
}

interface ChildFeeRecord {
  _id: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
  dueDate?: string;
  items?: FeeItem[];
  termId?: string | { _id: string; name: string; academicYear: string };
  termName?: string;
  academicYear?: string;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
};

function FeeRow({ fee }: { fee: ChildFeeRecord }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-body">
            Paid: NLe {(fee.amountPaid ?? 0).toLocaleString()} / NLe {(fee.totalAmount ?? 0).toLocaleString()}
          </p>
          {fee.dueDate && (
            <p className="text-[11px] text-body">
              Due: {new Date(fee.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={STATUS_VARIANT[fee.status] ?? "default"}>
            {fee.status}
          </Badge>
          {fee.balance > 0 && (
            <span className="text-xs font-medium text-meta-1">
              NLe {(fee.balance ?? 0).toLocaleString()} due
            </span>
          )}
        </div>
      </div>
      {(fee.items?.length ?? 0) > 0 && (
        <div className="mt-2 space-y-1">
          {fee.items?.map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-whiter px-3 py-1.5 dark:bg-meta-4/20">
              <p className="text-sm font-medium text-black dark:text-white">{item.title}</p>
              <p className="text-xs text-body">NLe {(item.amount ?? 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeesPage() {
  const searchParams = useSearchParams();
  const urlChild = searchParams.get("child");

  const { data: children = [] } = useQuery({
    queryKey: ["parent-children"],
    queryFn: parentApi.getMyChildren,
  });

  const [selectedId, setSelectedId] = useState<string | null>(urlChild);
  const childId =
    selectedId ??
    (children as LinkedStudent[])[0]?._id ??
    null;

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ["parent-fees", childId],
    queryFn: () => parentApi.getChildFees(childId!),
    enabled: !!childId,
  });

  const typedFees = fees as unknown as ChildFeeRecord[];
  const grouped = groupFeesByTerm(typedFees);
  const showHeadings = grouped.size > 1;

  const totalBilled = typedFees.reduce((s, f) => s + f.totalAmount, 0);
  const totalPaid = typedFees.reduce((s, f) => s + f.amountPaid, 0);
  const totalOutstanding = typedFees.reduce((s, f) => s + f.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-meta-1/10">
          <CreditCard className="h-5 w-5 text-meta-1" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white">Fees</h1>
          <p className="text-sm text-body">Fee balance and payment status</p>
        </div>
      </div>

      {/* Child selector */}
      {(children as LinkedStudent[]).length > 1 && (
        <div className="flex flex-wrap gap-2">
          {(children as LinkedStudent[]).map((child) => (
            <button
              key={child._id}
              onClick={() => setSelectedId(child._id)}
              className={[
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                childId === child._id
                  ? "border-meta-1 bg-meta-1/10 text-meta-1"
                  : "border-stroke text-body hover:border-meta-1 dark:border-strokedark",
              ].join(" ")}
            >
              <GraduationCap className="h-4 w-4" />
              {child.fullName}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-meta-1" />
        </div>
      ) : typedFees.length === 0 ? (
        <p className="text-sm text-body">No fee records found.</p>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Billed", value: totalBilled, color: "text-black dark:text-white" },
              { label: "Amount Paid", value: totalPaid, color: "text-meta-3" },
              { label: "Outstanding", value: totalOutstanding, color: totalOutstanding > 0 ? "text-meta-1" : "text-meta-3" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>
                    NLe {s.value.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-body">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Fee breakdown grouped by term */}
          <Card>
            <CardHeader>
              <span className="text-sm font-semibold text-black dark:text-white">Fee Breakdown</span>
            </CardHeader>
            <CardContent className="divide-y divide-stroke dark:divide-strokedark">
              {[...grouped].map(([label, groupFees]) => (
                <div key={label}>
                  {showHeadings && (
                    <div className="border-b border-stroke/50 pb-1 pt-3 first:pt-0 dark:border-strokedark/50">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-body">
                        {label}
                      </p>
                    </div>
                  )}
                  {groupFees.map((fee) => (
                    <FeeRow key={fee._id} fee={fee} />
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>

          {totalOutstanding === 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-meta-3/30 bg-meta-3/10 px-4 py-3">
              <span className="text-sm font-medium text-meta-3">All fees paid — no outstanding balance.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ParentFeesPage() {
  return (
    <Suspense>
      <FeesPage />
    </Suspense>
  );
}
