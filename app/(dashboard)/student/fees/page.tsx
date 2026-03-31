"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import { studentApi } from "@/lib/api/student";
import type { FeePayment } from "@/lib/api/student";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { CreditCard, Building2, CheckCircle2, AlertCircle, Clock, Receipt } from "lucide-react";
import Link from "next/link";

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "default"> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
};

function formatMethod(method: string): string {
  const map: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    card: "Card",
    mobile_money: "Mobile Money",
    cheque: "Cheque",
  };
  return map[method] ?? method;
}

export default function StudentFeesPage() {
  const [feesQuery, accountsQuery] = useQueries({
    queries: [
      { queryKey: ["my-fees"], queryFn: studentApi.getMyFees },
      { queryKey: ["payment-accounts"], queryFn: studentApi.getPaymentAccounts },
    ],
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["my-payments"],
    queryFn: studentApi.getMyPayments,
  });

  const fee = feesQuery.data;
  const accounts = accountsQuery.data ?? [];
  const paymentList = payments as FeePayment[];
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

      {/* Payment History */}
      <Card>
        <div className="flex items-center gap-2 border-b border-stroke px-5 py-4 dark:border-strokedark">
          <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-black dark:text-white">Payment History</h2>
        </div>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            </div>
          ) : paymentList.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Receipt className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm font-medium text-black dark:text-white">No payments yet</p>
              <p className="text-xs text-body">Your payment history will appear here once payments are recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <tr>
                    <Th>Receipt No.</Th>
                    <Th>Amount</Th>
                    <Th>Method</Th>
                    <Th>Date</Th>
                    <Th>Receipt</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {paymentList.map((payment) => (
                    <tr key={payment._id} className="hover:bg-meta-2 transition-colors dark:hover:bg-meta-4">
                      <Td className="font-mono text-xs text-black dark:text-white">
                        {payment.receiptNumber}
                      </Td>
                      <Td>
                        <span className="font-semibold text-black dark:text-white">
                          {payment.amount.toLocaleString()}
                        </span>
                      </Td>
                      <Td className="text-body text-xs">{formatMethod(payment.method)}</Td>
                      <Td className="text-body text-xs">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </Td>
                      <Td>
                        <Link
                          href={`/student/fees/receipt?paymentId=${payment._id}`}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Receipt className="h-3.5 w-3.5" aria-hidden="true" /> View Receipt
                        </Link>
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
