"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import {
  Archive,
  Search,
  RotateCcw,
  Eye,
  Users,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  CreditCard,
  BookOpen,
  CalendarCheck,
} from "lucide-react";
import type { AuthUser } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";

type Tab = "students" | "lecturers";

type ArchivedDetail = {
  user: AuthUser;
  fees: Array<{ _id: string; amount: number; method: string; receiptNumber: string; createdAt: string }>;
  results: Array<{ _id: string; subject?: { name: string }; marksObtained: number; totalScore: number; grade: string; term?: { name: string; academicYear: string } }>;
  attendanceSummary: { total: number; present: number; absent: number };
};

export default function ArchivePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("students");
  const [search, setSearch] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<AuthUser | null>(null);
  const [restoreError, setRestoreError] = useState("");
  const [detailTarget, setDetailTarget] = useState<AuthUser | null>(null);

  const { data: archivedStudents = [], isLoading: loadingStudents, isError: errorStudents } = useQuery({
    queryKey: ["archived-students"],
    queryFn: adminApi.getArchivedStudents,
  });

  const { data: archivedLecturers = [], isLoading: loadingLecturers, isError: errorLecturers } = useQuery({
    queryKey: ["archived-lecturers"],
    queryFn: adminApi.getArchivedLecturers,
    enabled: tab === "lecturers",
  });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["archived-detail", detailTarget?._id],
    queryFn: () => adminApi.getArchivedUserDetail(detailTarget!._id),
    enabled: detailTarget !== null,
  }) as { data: ArchivedDetail | undefined; isLoading: boolean };

  const restoreMutation = useMutation({
    mutationFn: (userId: string) => adminApi.restoreUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-students"] });
      queryClient.invalidateQueries({ queryKey: ["archived-lecturers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      queryClient.invalidateQueries({ queryKey: ["admin-lecturers"] });
      setRestoreTarget(null);
      setRestoreError("");
    },
    onError: (e: unknown) => setRestoreError(errMsg(e, "Failed to restore user")),
  });

  const list: AuthUser[] = tab === "students" ? archivedStudents : archivedLecturers;
  const isLoading = tab === "students" ? loadingStudents : loadingLecturers;
  const isError = tab === "students" ? errorStudents : errorLecturers;

  const filtered = list.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
          <Archive className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">Archive</h1>
          <p className="text-sm text-body">Long-term records for departed students and lecturers</p>
        </div>
      </div>

      <Card>
        {/* Tabs + Search */}
        <div className="flex flex-col gap-4 border-b border-stroke px-5 py-4 dark:border-strokedark sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1">
            <TabBtn active={tab === "students"} onClick={() => { setTab("students"); setSearch(""); }}>
              <GraduationCap className="h-4 w-4" />
              Students
              {archivedStudents.length > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {archivedStudents.length}
                </span>
              )}
            </TabBtn>
            <TabBtn active={tab === "lecturers"} onClick={() => { setTab("lecturers"); setSearch(""); }}>
              <Users className="h-4 w-4" />
              Lecturers
              {archivedLecturers.length > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {archivedLecturers.length}
                </span>
              )}
            </TabBtn>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search archived records"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded border border-stroke bg-transparent pl-9 pr-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <p className="py-12 text-center text-sm text-meta-1">
            Failed to load archived records. Please refresh the page.
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Archive className="h-7 w-7 text-body" />}
            msg={search ? "No archived records match your search." : `No archived ${tab} yet.`}
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                {tab === "students" ? <Th>Class</Th> : <Th>Department</Th>}
                <Th>Lifecycle</Th>
                <Th>Archived</Th>
                <Th>Note</Th>
                <Th>Actions</Th>
              </tr>
            </TableHead>
            <TableBody>
              {filtered.map((u) => {
                const classObj = typeof u.class === "string" ? null : (u.class as { _id: string; name: string } | undefined) ?? null;
                const dept = (u.lecturerProfile as unknown as { department?: string } | null)?.department;
                return (
                  <tr key={u._id} className="hover:bg-meta-2 transition-colors dark:hover:bg-meta-4">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                          {u.fullName.charAt(0)}
                        </div>
                        <span className="font-medium text-black dark:text-white">{u.fullName}</span>
                      </div>
                    </Td>
                    <Td className="text-body">{u.email}</Td>
                    <Td className="text-body text-sm">
                      {tab === "students"
                        ? (classObj?.name ?? <span className="italic opacity-50">No class</span>)
                        : (dept ?? <span className="italic opacity-50">—</span>)}
                    </Td>
                    <Td>
                      <LifecycleBadge status={u.lifecycleStatus} />
                    </Td>
                    <Td className="text-xs text-body whitespace-nowrap">
                      {u.archivedAt
                        ? new Date(u.archivedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </Td>
                    <Td className="max-w-[180px] text-xs text-body truncate">
                      {u.archiveNote || <span className="italic opacity-40">—</span>}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDetailTarget(u)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                          title="View full record"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => { setRestoreTarget(u); setRestoreError(""); }}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-meta-3 hover:bg-meta-3/10 transition-colors"
                          title="Restore to active"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Restore confirm modal */}
      <Modal
        open={restoreTarget !== null}
        onClose={() => { setRestoreTarget(null); setRestoreError(""); }}
        title="Restore from Archive"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-meta-3/10">
              <RotateCcw className="h-5 w-5 text-meta-3" />
            </div>
            <p className="text-sm text-body">
              Restoring <span className="font-semibold text-black dark:text-white">{restoreTarget?.fullName}</span> will make them active again and they will reappear in the active lists.
            </p>
          </div>
          {restoreError && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{restoreError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setRestoreTarget(null); setRestoreError(""); }}>Cancel</Button>
            <Button
              isLoading={restoreMutation.isPending}
              onClick={() => restoreTarget && restoreMutation.mutate(restoreTarget._id)}
            >
              Restore
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        title={detailTarget?.fullName ?? "Record Detail"}
      >
        {loadingDetail ? (
          <Spinner />
        ) : detail ? (
          <div className="space-y-6 text-sm">
            {/* Profile */}
            <Section title="Profile" icon={<Eye className="h-4 w-4" />}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <DataItem label="Email" value={detail.user.email} />
                <DataItem label="Role" value={detail.user.role} />
                <DataItem label="Lifecycle" value={detail.user.lifecycleStatus ?? "—"} />
                <DataItem
                  label="Archived"
                  value={detail.user.archivedAt
                    ? new Date(detail.user.archivedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                />
                {detail.user.archiveNote && (
                  <DataItem label="Note" value={detail.user.archiveNote} />
                )}
              </dl>
            </Section>

            {/* Fees */}
            <Section title={`Fees (${detail.fees.length})`} icon={<CreditCard className="h-4 w-4" />} collapsible>
              {detail.fees.length === 0 ? (
                <p className="text-xs text-body">No fee payments recorded.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-stroke dark:border-strokedark text-left">
                      <th className="pb-1.5 font-medium text-body">Receipt</th>
                      <th className="pb-1.5 font-medium text-body">Amount</th>
                      <th className="pb-1.5 font-medium text-body">Method</th>
                      <th className="pb-1.5 font-medium text-body">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.fees.map((f) => (
                      <tr key={f._id} className="border-b border-stroke/50 dark:border-strokedark/50">
                        <td className="py-1.5 text-body">{f.receiptNumber}</td>
                        <td className="py-1.5 font-medium text-black dark:text-white">NLe {f.amount?.toLocaleString()}</td>
                        <td className="py-1.5 text-body capitalize">{f.method}</td>
                        <td className="py-1.5 text-body">
                          {new Date(f.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Results */}
            <Section title={`Results (${detail.results.length})`} icon={<BookOpen className="h-4 w-4" />} collapsible>
              {detail.results.length === 0 ? (
                <p className="text-xs text-body">No results recorded.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-stroke dark:border-strokedark text-left">
                      <th className="pb-1.5 font-medium text-body">Subject</th>
                      <th className="pb-1.5 font-medium text-body">Score</th>
                      <th className="pb-1.5 font-medium text-body">Grade</th>
                      <th className="pb-1.5 font-medium text-body">Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.results.map((r) => (
                      <tr key={r._id} className="border-b border-stroke/50 dark:border-strokedark/50">
                        <td className="py-1.5 text-body">{r.subject?.name ?? "—"}</td>
                        <td className="py-1.5 font-medium text-black dark:text-white">{r.marksObtained}/{r.totalScore}</td>
                        <td className="py-1.5">
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-meta-2 text-black dark:bg-meta-4 dark:text-white">
                            {r.grade}
                          </span>
                        </td>
                        <td className="py-1.5 text-body">{r.term ? `${r.term.name} — ${r.term.academicYear}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Attendance */}
            <Section title="Attendance" icon={<CalendarCheck className="h-4 w-4" />}>
              <div className="flex gap-6 text-xs">
                <AttStat label="Total Sessions" value={detail.attendanceSummary.total} />
                <AttStat label="Present" value={detail.attendanceSummary.present} color="text-meta-3" />
                <AttStat label="Absent" value={detail.attendanceSummary.absent} color="text-meta-1" />
                {detail.attendanceSummary.total > 0 && (
                  <AttStat
                    label="Rate"
                    value={`${Math.round((detail.attendanceSummary.present / detail.attendanceSummary.total) * 100)}%`}
                  />
                )}
              </div>
            </Section>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-white" : "text-body hover:text-black dark:hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" role="status" />
    </div>
  );
}

function EmptyState({ icon, msg }: { icon: React.ReactNode; msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">{icon}</div>
      <p className="text-sm text-body">{msg}</p>
    </div>
  );
}

function LifecycleBadge({ status }: { status?: string }) {
  if (!status || status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "graduated") return <Badge variant="info">Graduated</Badge>;
  if (status === "transferred") return <Badge variant="warning">Transferred</Badge>;
  if (status === "withdrawn") return <Badge variant="danger">Withdrawn</Badge>;
  return <Badge>{status}</Badge>;
}

function Section({
  title,
  icon,
  children,
  collapsible,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-md border border-stroke dark:border-strokedark">
      <button
        type="button"
        onClick={() => collapsible && setOpen((v) => !v)}
        className={[
          "flex w-full items-center justify-between px-4 py-2.5",
          collapsible ? "cursor-pointer" : "cursor-default",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 font-medium text-black dark:text-white text-sm">
          {icon}
          {title}
        </div>
        {collapsible && (open ? <ChevronUp className="h-4 w-4 text-body" /> : <ChevronDown className="h-4 w-4 text-body" />)}
      </button>
      {open && <div className="border-t border-stroke px-4 py-3 dark:border-strokedark">{children}</div>}
    </div>
  );
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-body">{label}</dt>
      <dd className="font-medium text-black dark:text-white capitalize">{value}</dd>
    </div>
  );
}

function AttStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <p className={["text-lg font-bold", color ?? "text-black dark:text-white"].join(" ")}>{value}</p>
      <p className="text-body">{label}</p>
    </div>
  );
}
