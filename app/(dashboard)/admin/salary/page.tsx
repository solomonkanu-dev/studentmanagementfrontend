"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { salaryApi } from "@/lib/api/salary";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  CheckCircle,
  Trash2,
  Banknote,
  TrendingUp,
  Clock,
  XCircle,
  Filter,
  Download,
} from "lucide-react";
import { exportApi } from "@/lib/api/export";
import type { Salary, AuthUser } from "@/lib/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  lecturerId: z.string().min(1, "Select a lecturer"),
  salaryMonth: z.string().min(1, "Required").regex(/^\d{4}-\d{2}$/, "Use YYYY-MM format"),
  date: z.string().min(1, "Required"),
  salary: z.coerce.number().min(0, "Must be ≥ 0"),
  bonus: z.coerce.number().min(0).optional(),
  deduction: z.coerce.number().min(0).optional(),
  remarks: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonth(raw: string) {
  if (!raw) return "—";
  const d = new Date(`${raw}-01`);
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function statusVariant(s: string): "success" | "warning" | "danger" {
  if (s === "paid") return "success";
  if (s === "cancelled") return "danger";
  return "warning";
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string;
  color: "default" | "green" | "yellow" | "red";
}) {
  const colors = {
    default: "bg-meta-2 text-primary dark:bg-meta-4 dark:text-white",
    green: "bg-meta-3/10 text-meta-3",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    red: "bg-meta-1/10 text-meta-1",
  };
  return (
    <div className="rounded-lg border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xs text-body">{label}</p>
      <p className="mt-1 text-xl font-bold text-black dark:text-white">{value}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminSalaryPage() {
  const queryClient = useQueryClient();
  const [showPay, setShowPay] = useState(false);
  const [formError, setFormError] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  // ── Queries ──
  const { data: salaryRes, isLoading } = useQuery({
    queryKey: ["salaries", filterMonth, filterStatus, page],
    queryFn: () =>
      salaryApi.getAll({
        ...(filterMonth && { salaryMonth: filterMonth }),
        ...(filterStatus && { status: filterStatus }),
        page,
        limit,
      }),
  });

  const salaries: Salary[] = Array.isArray(salaryRes?.data) ? salaryRes.data : [];
  const total: number = salaryRes?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const { data: lecturers = [] } = useQuery({
    queryKey: ["admin-lecturers"],
    queryFn: adminApi.getLecturers,
  });

  // ── Mutations ──
  const payMutation = useMutation({
    mutationFn: salaryApi.pay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      setShowPay(false);
      reset();
      setFormError("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to record salary";
      setFormError(msg);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: salaryApi.markPaid,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salaries"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: salaryApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salaries"] }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { bonus: 0, deduction: 0 },
  });

  // ── Stats from current page data ──
  const totalSalary = salaries.reduce((s, r) => s + (r.salary ?? 0), 0);
  const totalPaid = salaries.filter((r) => r.status === "paid").reduce((s, r) => s + (r.totalAmount ?? 0), 0);
  const pendingCount = salaries.filter((r) => r.status === "pending").length;

  const getLecturerName = (lecturer: string | AuthUser) =>
    typeof lecturer === "object" ? lecturer.fullName : "—";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatPill icon={<Banknote className="h-5 w-5" />} label="Total Records" value={String(total)} color="default" />
        <StatPill icon={<TrendingUp className="h-5 w-5" />} label="Base Salary (page)" value={`$${fmt(totalSalary)}`} color="green" />
        <StatPill icon={<CheckCircle className="h-5 w-5" />} label="Paid (page)" value={`$${fmt(totalPaid)}`} color="green" />
        <StatPill icon={<Clock className="h-5 w-5" />} label="Pending (page)" value={String(pendingCount)} color="yellow" />
      </div>

      {/* Filters + Add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-body" aria-hidden="true" />
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }}
            className="h-8 rounded border border-stroke bg-transparent px-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            aria-label="Filter by month"
          />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="h-8 rounded border border-stroke bg-transparent px-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {(filterMonth || filterStatus) && (
            <button
              type="button"
              onClick={() => { setFilterMonth(""); setFilterStatus(""); setPage(1); }}
              className="text-xs text-body underline hover:text-primary"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => exportApi.salary()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button onClick={() => setShowPay(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Record Salary
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" role="status" />
            </div>
          ) : salaries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                <Banknote className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <p className="text-sm text-body">No salary records found.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <tr>
                    <Th>Lecturer</Th>
                    <Th>Month</Th>
                    <Th>Salary</Th>
                    <Th>Bonus</Th>
                    <Th>Deduction</Th>
                    <Th>Total</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {salaries.map((s: Salary) => (
                    <tr key={s._id} className="hover:bg-whiter transition-colors dark:hover:bg-meta-4">
                      <Td className="font-medium text-black dark:text-white">
                        {getLecturerName(s.lecturer)}
                      </Td>
                      <Td className="text-body">{formatMonth(s.salaryMonth)}</Td>
                      <Td className="text-body">${fmt(s.salary ?? 0)}</Td>
                      <Td className="text-meta-3">+${fmt(s.bonus ?? 0)}</Td>
                      <Td className="text-meta-1">-${fmt(s.deduction ?? 0)}</Td>
                      <Td>
                        <span className="font-semibold text-black dark:text-white">
                          ${fmt(s.totalAmount ?? 0)}
                        </span>
                      </Td>
                      <Td>
                        <Badge variant={statusVariant(s.status)}>
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          {s.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                isLoading={markPaidMutation.isPending}
                                onClick={() => markPaidMutation.mutate(s._id)}
                              >
                                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                Pay
                              </Button>
                              <button
                                type="button"
                                onClick={() => deleteMutation.mutate(s._id)}
                                className="flex h-7 w-7 items-center justify-center rounded text-meta-1 hover:bg-meta-1/10 transition-colors"
                                aria-label="Delete salary"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </>
                          )}
                          {s.status === "paid" && s.paidDate && (
                            <span className="text-xs text-body">
                              {new Date(s.paidDate).toLocaleDateString("en-US", {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-stroke px-5 py-3 dark:border-strokedark">
                  <p className="text-xs text-body">
                    Page {page} of {totalPages} · {total} records
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Record Salary Modal */}
      <Modal open={showPay} onClose={() => { setShowPay(false); reset(); setFormError(""); }} title="Record Salary">
        <form
          onSubmit={handleSubmit((values) => {
            setFormError("");
            payMutation.mutate({ ...values, role: "lecturer" });
          })}
          className="space-y-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Lecturer</label>
            <select
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              {...register("lecturerId")}
            >
              <option value="">Select a lecturer</option>
              {(lecturers as AuthUser[]).map((l) => (
                <option key={l._id} value={l._id}>{l.fullName}</option>
              ))}
            </select>
            {errors.lecturerId && <p className="text-xs text-meta-1">{errors.lecturerId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-black dark:text-white">Salary Month</label>
              <input
                type="month"
                className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                {...register("salaryMonth")}
              />
              {errors.salaryMonth && <p className="text-xs text-meta-1">{errors.salaryMonth.message}</p>}
            </div>
            <Input label="Payment Date" type="date" error={errors.date?.message} {...register("date")} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Base Salary ($)" type="number" placeholder="2000" error={errors.salary?.message} {...register("salary")} />
            <Input label="Bonus ($)" type="number" placeholder="0" {...register("bonus")} />
            <Input label="Deduction ($)" type="number" placeholder="0" {...register("deduction")} />
          </div>

          <Input label="Remarks (optional)" placeholder="e.g. March 2026 salary" {...register("remarks")} />

          {formError && (
            <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowPay(false); reset(); setFormError(""); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={payMutation.isPending}>Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
