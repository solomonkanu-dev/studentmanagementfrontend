"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { planApi } from "@/lib/api/plan";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import {
  CreditCard,
  Users,
  GraduationCap,
  School,
  CalendarClock,
  Receipt,
} from "lucide-react";
import type { PlanPayment } from "@/lib/types";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  mobile_money: "Mobile Money",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  completed: "success",
  pending: "warning",
  failed: "danger",
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function MyPlanPage() {
  const { data, isLoading } = useQuery({ queryKey: ["my-plan"], queryFn: planApi.getMyPlan });
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["plan-payments"],
    queryFn: () => planApi.getPlanPayments(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
          <CreditCard className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-black dark:text-white">No plan assigned.</p>
        <Link href="/admin/plan" className="text-xs text-primary underline">
          Choose a plan
        </Link>
      </div>
    );
  }

  const plan = data.plan;
  const isPaid = plan.name === "standard";
  const expired = !!data.expired;
  const studentsPaidFor = data.subscription?.studentsPaidFor;

  return (
    <div className="max-w-2xl space-y-6">
      {/* ── Current plan ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-black dark:text-white">Current Plan</h2>
            </div>
            <Badge variant={isPaid && !expired ? "success" : expired ? "danger" : "info"}>
              {(plan.displayName || plan.name).toUpperCase()}
              {expired ? " · EXPIRED" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plan.description && <p className="text-sm text-body">{plan.description}</p>}

            {isPaid && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-stroke p-4 dark:border-strokedark">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-xs text-body">Students paid for</span>
                  <span className="text-sm font-bold text-black dark:text-white">
                    {(studentsPaidFor ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarClock
                    className={`h-4 w-4 ${expired ? "text-meta-1" : "text-primary"}`}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-body">{expired ? "Expired" : "Expires"}</span>
                  <span
                    className={`text-sm font-bold ${
                      expired ? "text-meta-1" : "text-black dark:text-white"
                    }`}
                  >
                    {fmtDate(data.planExpiry)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-stroke p-4 dark:border-strokedark">
                <div className="mb-2 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-xs font-medium text-body">Students</span>
                </div>
                <p className="text-xl font-bold text-black dark:text-white">
                  {data.usage?.students.current ?? 0}
                  <span className="text-sm font-normal text-body">
                    {" "}
                    / {data.usage?.students.max ?? plan.limits?.maxStudents ?? "—"}
                  </span>
                </p>
              </div>
              <div className="rounded-md border border-stroke p-4 dark:border-strokedark">
                <div className="mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-xs font-medium text-body">Lecturers</span>
                </div>
                <p className="text-xl font-bold text-black dark:text-white">
                  {data.usage?.lecturers.current ?? 0}
                  <span className="text-sm font-normal text-body">
                    {" "}
                    / {data.usage?.lecturers.max ?? plan.limits?.maxLecturers ?? "—"}
                  </span>
                </p>
              </div>
              <div className="rounded-md border border-stroke p-4 dark:border-strokedark">
                <div className="mb-2 flex items-center gap-2">
                  <School className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-xs font-medium text-body">Classes</span>
                </div>
                <p className="text-xl font-bold text-black dark:text-white">
                  {data.usage?.classes.current ?? 0}
                  <span className="text-sm font-normal text-body">
                    {" "}
                    / {data.usage?.classes.max ?? plan.limits?.maxClasses ?? "—"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-stroke pt-4 dark:border-strokedark">
              <p className="text-sm text-body">
                {isPaid ? (
                  <>
                    Billed at{" "}
                    <span className="font-semibold text-black dark:text-white">
                      NLe {(plan.price ?? 0).toLocaleString()}
                    </span>{" "}
                    per student / term
                  </>
                ) : (
                  "Free tier — no payment required"
                )}
              </p>
              <Link href="/admin/plan" className="text-sm font-medium text-primary hover:underline">
                {isPaid ? "Renew / change" : "Upgrade"}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Payment history ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Payment History</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            </div>
          ) : payments.length === 0 ? (
            <p className="py-10 text-center text-sm text-body">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Amount</Th>
                    <Th>Students</Th>
                    <Th>Method</Th>
                    <Th>Status</Th>
                    <Th>Receipt</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {(payments as PlanPayment[]).map((p) => (
                    <tr key={p._id}>
                      <Td>{fmtDate(p.paidAt || p.createdAt)}</Td>
                      <Td>NLe {p.amount.toLocaleString()}</Td>
                      <Td>{p.studentCount.toLocaleString()}</Td>
                      <Td>
                        {p.channel === "online"
                          ? "Online"
                          : METHOD_LABELS[p.method] ?? p.method}
                      </Td>
                      <Td>
                        <Badge variant={STATUS_VARIANT[p.status] ?? "info"}>{p.status}</Badge>
                      </Td>
                      <Td>
                        {p.status === "completed" && p.receiptNumber ? (
                          <Link
                            href={`/admin/plan/receipt?paymentId=${p._id}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {p.receiptNumber}
                          </Link>
                        ) : (
                          <span className="text-xs text-body">—</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
