"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import type { Class } from "@/lib/types";
import type { FeePayment } from "@/lib/api/student";
import { RecordPaymentModal } from "./RecordPaymentModal";

interface AdminStudentFeeRecord {
  _id: string;
  student: { _id: string; fullName: string; email: string } | null;
  class: { _id: string; name: string } | string | null;
  totalAmount: number;
  balance: number;
  status: string;
}

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "default"> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
};

const PAYMENTS_PAGE_SIZE = 10;

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  mobile_money: "Mobile Money",
  cheque: "Cheque",
};
const formatMethod = (m: string) => METHOD_LABELS[m] ?? m;

export function StudentPaymentsTab({ classes }: { classes: Class[] }) {
  const queryClient = useQueryClient();
  const [selectedFee, setSelectedFee] = useState<AdminStudentFeeRecord | null>(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data: feeRecords = [], isLoading } = useQuery({
    queryKey: ["admin-student-fees"],
    queryFn: adminApi.getStudentFees,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["admin-student-payments", showHistory],
    queryFn: () => adminApi.getStudentPayments(showHistory!),
    enabled: !!showHistory,
  });

  const allRecords = feeRecords as AdminStudentFeeRecord[];
  const records = classFilter
    ? allRecords.filter((r) => {
        const classId = typeof r.class === "object" && r.class ? r.class._id : r.class;
        return classId === classFilter;
      })
    : allRecords;

  const totalPages = Math.max(1, Math.ceil(records.length / PAYMENTS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = records.slice((safePage - 1) * PAYMENTS_PAGE_SIZE, safePage * PAYMENTS_PAGE_SIZE);
  const paymentList = payments as FeePayment[];

  const handlePaymentRecorded = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-student-fees"] });
    queryClient.invalidateQueries({ queryKey: ["admin-student-payments", showHistory] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="border-b border-stroke px-5 py-3 dark:border-strokedark">
          <div className="flex items-center gap-3">
            <label className="shrink-0 text-xs font-medium text-black dark:text-white">Filter by class</label>
            <select
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setShowHistory(null); setSelectedFee(null); setPage(1); }}
              className="h-8 rounded border border-stroke bg-transparent px-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {classFilter && (
              <span className="text-xs text-body">
                {records.length} student{records.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        {records.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Receipt className="h-8 w-8 text-body" aria-hidden="true" />
            <p className="text-sm font-medium text-black dark:text-white">
              {classFilter ? "No fee records for this class" : "No fee records yet"}
            </p>
            <p className="text-xs text-body">
              {classFilter ? "Try a different class or clear the filter." : "Assign fees to students first using the Fee Structures tab."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Student</Th>
                <Th>Class</Th>
                <Th>Total</Th>
                <Th>Paid</Th>
                <Th>Balance</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </TableHead>
            <TableBody>
              {paginated.map((r) => {
                const paid = r.totalAmount - r.balance;
                const className = typeof r.class === "object" && r.class ? r.class.name : "—";
                return (
                  <tr key={r._id} className="hover:bg-meta-2 transition-colors dark:hover:bg-meta-4">
                    <Td>
                      <div>
                        <p className="font-medium text-black dark:text-white">
                          {r.student?.fullName ?? "—"}
                        </p>
                        <p className="text-xs text-body">{r.student?.email}</p>
                      </div>
                    </Td>
                    <Td className="text-body text-xs">{className}</Td>
                    <Td className="font-medium text-black dark:text-white">
                      {(r.totalAmount ?? 0).toLocaleString()}
                    </Td>
                    <Td className="text-meta-3">{paid.toLocaleString()}</Td>
                    <Td className="text-meta-1">{(r.balance ?? 0).toLocaleString()}</Td>
                    <Td>
                      <Badge variant={STATUS_BADGE[r.status] ?? "default"} className="capitalize">
                        {r.status}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedFee(r);
                            setShowHistory(r.student?._id ?? null);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          History
                        </button>
                        {r.balance > 0 && (
                          <button
                            onClick={() => {
                              setSelectedFee(r);
                              setShowHistory(r.student?._id ?? null);
                              setShowRecordPayment(true);
                            }}
                            className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-white hover:bg-opacity-90"
                          >
                            <Receipt className="h-3 w-3" aria-hidden="true" /> Pay
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        )}
        {records.length > PAYMENTS_PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-stroke px-5 py-3 dark:border-strokedark">
            <p className="text-xs text-body">
              {(safePage - 1) * PAYMENTS_PAGE_SIZE + 1}–{Math.min(safePage * PAYMENTS_PAGE_SIZE, records.length)} of {records.length} students
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded p-1.5 text-body transition-colors hover:bg-meta-2 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-meta-4"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs text-black dark:text-white">{safePage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded p-1.5 text-body transition-colors hover:bg-meta-2 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-meta-4"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={!!showHistory}
        onClose={() => { setShowHistory(null); setSelectedFee(null); }}
        title={`Payment History — ${selectedFee?.student?.fullName ?? ""}`}
        className="max-w-5xl"
      >
        {paymentsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          </div>
        ) : paymentList.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Receipt className="h-8 w-8 text-body" aria-hidden="true" />
            <p className="text-sm text-body">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="-mx-5 -my-4">
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
                        href={`/admin/fees/receipt?paymentId=${payment._id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Receipt className="h-3.5 w-3.5" aria-hidden="true" /> View
                      </Link>
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Modal>

      {selectedFee && showRecordPayment && (
        <RecordPaymentModal
          open={showRecordPayment}
          onClose={() => setShowRecordPayment(false)}
          studentId={selectedFee.student?._id ?? ""}
          balance={selectedFee.balance}
          onRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  );
}
