"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { monitorApi } from "@/lib/api/monitor";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  School,
  DollarSign,
  Search,
  BarChart2,
  ClipboardList,
  CalendarCheck,
  ChevronRight,
} from "lucide-react";
import type { InstituteHealthReport, InstituteDeepReport } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function currency(n: number) {
  return `NLe ${fmt(n)}`;
}

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

function feeRateVariant(rate: number): "success" | "warning" | "danger" {
  if (rate >= 80) return "success";
  if (rate >= 50) return "warning";
  return "danger";
}

// ─── Deep Report Modal ────────────────────────────────────────────────────────

function DeepReportModal({
  instituteId,
  instituteName,
  onClose,
}: {
  instituteId: string;
  instituteName: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<InstituteDeepReport>({
    queryKey: ["institute-deep", instituteId],
    queryFn: () => monitorApi.getInstituteDeep(instituteId),
  });

  return (
    <Modal open onClose={onClose} title={`${instituteName} — Deep Report`}>
      {isLoading ? (
        <div className="flex items-center justify-center py-14">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : !data ? (
        <p className="py-10 text-center text-sm text-body">No data available.</p>
      ) : (
        <div className="space-y-5">
          {/* Users breakdown */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">Users</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.users.map((u) => (
                <div key={u.role} className="rounded-sm border border-stroke bg-whiter p-3 dark:border-strokedark dark:bg-meta-4">
                  <p className="text-xs capitalize text-body">{u.role.replace("_", " ")}</p>
                  <p className="mt-0.5 text-xl font-bold text-black dark:text-white">{u.total}</p>
                  <div className="mt-1.5 flex gap-2 text-[10px] text-body">
                    <span className="text-meta-3">{u.active} active</span>
                    {u.suspended > 0 && <span className="text-meta-1">{u.suspended} suspended</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Academics */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">Academics</h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {[
                { label: "Classes", value: data.academics.classes, icon: School },
                { label: "Subjects", value: data.academics.subjects, icon: BookOpen },
                { label: "Assignments", value: data.academics.assignments, icon: ClipboardList },
                { label: "Results", value: data.academics.results, icon: BarChart2 },
                { label: "Attendance", value: data.academics.attendanceRecords, icon: CalendarCheck },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-sm border border-stroke bg-whiter p-3 text-center dark:border-strokedark dark:bg-meta-4">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <p className="text-lg font-bold text-black dark:text-white">{value}</p>
                  <p className="text-[10px] text-body">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Fees */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">Fees</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Billed", value: currency(data.fees.totalBilled) },
                { label: "Collected", value: currency(data.fees.totalCollected), highlight: true },
                { label: "Outstanding", value: currency(data.fees.outstanding), danger: true },
                { label: "Paid", value: data.fees.paidCount },
                { label: "Partial", value: data.fees.partialCount },
                { label: "Unpaid", value: data.fees.unpaidCount },
              ].map(({ label, value, highlight, danger }) => (
                <div key={label} className="rounded-sm border border-stroke bg-whiter p-3 dark:border-strokedark dark:bg-meta-4">
                  <p className="text-xs text-body">{label}</p>
                  <p className={`mt-0.5 text-sm font-bold ${highlight ? "text-meta-3" : danger ? "text-meta-1" : "text-black dark:text-white"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Salaries */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">Salaries</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Disbursed", value: currency(data.salaries.totalDisbursed) },
                { label: "Paid", value: currency(data.salaries.totalPaid), highlight: true },
                { label: "Pending", value: currency(data.salaries.totalPending), danger: true },
              ].map(({ label, value, highlight, danger }) => (
                <div key={label} className="rounded-sm border border-stroke bg-whiter p-3 dark:border-strokedark dark:bg-meta-4">
                  <p className="text-xs text-body">{label}</p>
                  <p className={`mt-0.5 text-sm font-bold ${highlight ? "text-meta-3" : danger ? "text-meta-1" : "text-black dark:text-white"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InstitutesPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const { data = [], isLoading } = useQuery<InstituteHealthReport[]>({
    queryKey: ["monitor-institutes"],
    queryFn: monitorApi.getInstitutes,
  });

  const filtered = data.filter((r) =>
    r.institute.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.institute.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" aria-hidden="true" />
          <input
            type="text"
            aria-label="Search institutes"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded border border-stroke bg-transparent pl-9 pr-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          />
        </div>
        <p className="text-sm text-body">
          {data.length} institute{data.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <Building2 className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-black dark:text-white">
            {search ? "No institutes match your search." : "No institutes registered yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const feeRate = pct(r.fees.totalCollected, r.fees.totalBilled);
            return (
              <button
                key={r.institute.id}
                type="button"
                onClick={() => setSelected({ id: r.institute.id, name: r.institute.name })}
                className="w-full rounded-sm border border-stroke bg-white text-left shadow-default transition-all hover:border-primary/50 dark:border-strokedark dark:bg-boxdark"
              >
                <div className="p-5">
                  {/* Icon + name */}
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                      <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-black dark:text-white">
                        {r.institute.name}
                      </h3>
                      {r.institute.email && (
                        <p className="truncate text-xs text-body">{r.institute.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Stat grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded bg-meta-2 p-2 dark:bg-meta-4">
                      <GraduationCap className="mx-auto mb-0.5 h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      <p className="text-sm font-bold text-black dark:text-white">{r.users.students}</p>
                      <p className="text-[10px] text-body">Students</p>
                    </div>
                    <div className="rounded bg-meta-2 p-2 dark:bg-meta-4">
                      <Users className="mx-auto mb-0.5 h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      <p className="text-sm font-bold text-black dark:text-white">{r.users.lecturers}</p>
                      <p className="text-[10px] text-body">Teachers</p>
                    </div>
                    <div className="rounded bg-meta-2 p-2 dark:bg-meta-4">
                      <School className="mx-auto mb-0.5 h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      <p className="text-sm font-bold text-black dark:text-white">{r.academics.classes}</p>
                      <p className="text-[10px] text-body">Classes</p>
                    </div>
                  </div>

                  {/* Fee rate */}
                  <div className="mt-4 flex items-center justify-between border-t border-stroke pt-3 dark:border-strokedark">
                    <div className="flex items-center gap-1.5 text-xs text-body">
                      <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                      Fee collection
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={feeRateVariant(feeRate)}>{feeRate}%</Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-body" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <DeepReportModal
          instituteId={selected.id}
          instituteName={selected.name}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
