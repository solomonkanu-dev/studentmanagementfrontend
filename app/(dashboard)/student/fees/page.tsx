"use client";

import { useQueries } from "@tanstack/react-query";
import { studentApi } from "@/lib/api/student";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreditCard, Building2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "default"> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
};

export default function StudentFeesPage() {
  const [feesQuery, accountsQuery] = useQueries({
    queries: [
      { queryKey: ["my-fees"], queryFn: studentApi.getMyFees },
      { queryKey: ["payment-accounts"], queryFn: studentApi.getPaymentAccounts },
    ],
  });

  const fee = feesQuery.data;
  const accounts = accountsQuery.data ?? [];
  const isLoading = feesQuery.isLoading || accountsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fee Particulars */}
      <Card>
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Fee Particulars</h2>
          </div>
          {fee && (
            <Badge variant={STATUS_BADGE[fee.status] ?? "default"} className="capitalize">
              {fee.status}
            </Badge>
          )}
        </div>
        <CardContent>
          {!fee ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CreditCard className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm font-medium text-black dark:text-white">No fee record found</p>
              <p className="text-xs text-body">Your administrator has not yet assigned fees to your account.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md bg-meta-2 px-4 py-3 dark:bg-meta-4">
                  <p className="text-[10px] uppercase tracking-wide text-body">Total</p>
                  <p className="mt-1 text-base font-bold text-black dark:text-white">
                    {fee.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md bg-meta-3/10 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-body">Paid</p>
                  <p className="mt-1 text-base font-bold text-meta-3">
                    {(fee.totalAmount - fee.balance).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md bg-meta-1/10 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-body">Balance</p>
                  <p className="mt-1 text-base font-bold text-meta-1">
                    {fee.balance.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Fee items table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stroke dark:border-strokedark">
                      <th className="py-2 text-left text-xs font-medium text-body">Fee Item</th>
                      <th className="py-2 text-right text-xs font-medium text-body">Amount</th>
                      <th className="py-2 text-right text-xs font-medium text-body">Paid</th>
                      <th className="py-2 text-right text-xs font-medium text-body">Balance</th>
                      <th className="py-2 text-center text-xs font-medium text-body">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-strokedark">
                    {fee.fees.map((item, i) => {
                      const title = item.fee?.title ?? "Fee Item";
                      const amount = item.amount;
                      const paid = item.paid ?? 0;
                      const balance = amount - paid;
                      const itemStatus = paid >= amount ? "paid" : paid > 0 ? "partial" : "unpaid";
                      return (
                        <tr key={i} className="hover:bg-whiter dark:hover:bg-meta-4">
                          <td className="py-3 font-medium text-black dark:text-white">{title}</td>
                          <td className="py-3 text-right text-body">{amount.toLocaleString()}</td>
                          <td className="py-3 text-right text-meta-3">{paid.toLocaleString()}</td>
                          <td className="py-3 text-right text-meta-1">{balance.toLocaleString()}</td>
                          <td className="py-3 text-center">
                            {itemStatus === "paid" ? (
                              <CheckCircle2 className="mx-auto h-4 w-4 text-meta-3" />
                            ) : itemStatus === "partial" ? (
                              <Clock className="mx-auto h-4 w-4 text-yellow-500" />
                            ) : (
                              <AlertCircle className="mx-auto h-4 w-4 text-meta-1" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Accounts */}
      <Card>
        <div className="flex items-center gap-2 border-b border-stroke px-5 py-4 dark:border-strokedark">
          <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-black dark:text-white">Payment Accounts</h2>
        </div>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Building2 className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm font-medium text-black dark:text-white">No payment accounts</p>
              <p className="text-xs text-body">Your administrator has not yet set up payment accounts.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {accounts.map((account) => (
                <div
                  key={account._id}
                  className="rounded-md border border-stroke p-4 dark:border-strokedark"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      {account.bankLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={account.bankLogo} alt={account.bankName} className="h-8 w-8 object-contain" />
                      ) : (
                        <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-black dark:text-white">{account.bankName}</p>
                      <p className="mt-0.5 text-xs text-body">{account.bankAddress}</p>
                      <div className="mt-2 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wide text-body">Account No</span>
                          <span className="font-mono text-sm font-semibold text-black dark:text-white">
                            {account.bankNo}
                          </span>
                        </div>
                      </div>
                      {account.instructions && (
                        <p className="mt-2 text-xs text-body">{account.instructions}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
