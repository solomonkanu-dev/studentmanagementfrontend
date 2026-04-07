"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/superAdmin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import {
  Search,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Users,
  PlayCircle,
} from "lucide-react";
import type { PendingAdmin } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [actionTarget, setActionTarget] = useState<{ admin: PendingAdmin; type: "suspend" | "unsuspend" } | null>(null);
  const [actionError, setActionError] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["pending-admins"] });
    queryClient.invalidateQueries({ queryKey: ["all-admins"] });
    queryClient.invalidateQueries({ queryKey: ["super-stats"] });
  };

  const { data: stats } = useQuery({
    queryKey: ["super-stats"],
    queryFn: superAdminApi.getStats,
  });

  const { data: pendingAdmins = [], isLoading: loadingPending } = useQuery({
    queryKey: ["pending-admins"],
    queryFn: superAdminApi.getPendingAdmins,
  });

  const { data: allAdmins = [], isLoading: loadingAll } = useQuery({
    queryKey: ["all-admins"],
    queryFn: superAdminApi.getAllAdmins,
    enabled: tab === "all",
  });

  const approveMutation = useMutation({
    mutationFn: superAdminApi.approveAdmin,
    onSuccess: invalidate,
  });

  const suspendMutation = useMutation({
    mutationFn: superAdminApi.suspendAdmin,
    onSuccess: () => { invalidate(); setActionTarget(null); setActionError(""); },
    onError: (e: unknown) => setActionError(errMsg(e, "Failed to suspend admin")),
  });

  const unsuspendMutation = useMutation({
    mutationFn: superAdminApi.unsuspendAdmin,
    onSuccess: () => { invalidate(); setActionTarget(null); setActionError(""); },
    onError: (e: unknown) => setActionError(errMsg(e, "Failed to unsuspend admin")),
  });

  const totalAdmins = stats?.admins?.total ?? 0;
  const approvedAdmins = stats?.admins?.approved ?? 0;
  const pendingCount = stats?.admins?.pending ?? pendingAdmins.length;

  const filterList = <T extends PendingAdmin>(list: T[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((a) => a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  };

  const filteredPending = useMemo(() => filterList(pendingAdmins as PendingAdmin[]), [pendingAdmins, search]);
  const filteredAll = useMemo(() => filterList(allAdmins as PendingAdmin[]), [allAdmins, search]);

  const actionPending = suspendMutation.isPending || unsuspendMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Admins" value={totalAdmins} icon={Users} color="primary" />
        <SummaryCard label="Pending Approval" value={pendingCount} icon={Clock} color="warning" />
        <SummaryCard label="Approved" value={approvedAdmins} icon={CheckCircle2} color="success" />
      </div>

      {/* Table card */}
      <Card>
        <div className="flex flex-col gap-4 border-b border-stroke px-5 py-4 dark:border-strokedark sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setTab("pending")}
              className={[
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "pending"
                  ? "bg-primary text-white"
                  : "text-body hover:text-black dark:hover:text-white",
              ].join(" ")}
            >
              Pending
              {pendingAdmins.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-meta-1 px-1 text-[10px] font-bold text-white">
                  {pendingAdmins.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("all")}
              className={[
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "all"
                  ? "bg-primary text-white"
                  : "text-body hover:text-black dark:hover:text-white",
              ].join(" ")}
            >
              All Admins
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search admins"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded border border-stroke bg-transparent pl-9 pr-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            />
          </div>
        </div>

        {/* ── Pending tab ─── */}
        {tab === "pending" && (
          loadingPending ? <Spinner /> : filteredPending.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-7 w-7 text-meta-3" />}
              msg={search ? "No pending admins match your search." : "No pending requests — all admins are approved."}
            />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th>Admin</Th>
                  <Th>Email</Th>
                  <Th>Requested</Th>
                  <Th>Action</Th>
                </tr>
              </TableHead>
              <TableBody>
                {filteredPending.map((admin) => (
                  <tr key={admin._id} className="hover:bg-meta-2 transition-colors dark:hover:bg-meta-4">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={admin.fullName} />
                        <span className="font-medium text-black dark:text-white">{admin.fullName}</span>
                      </div>
                    </Td>
                    <Td className="text-body">{admin.email}</Td>
                    <Td className="text-xs text-body">
                      {new Date(admin.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        isLoading={approveMutation.isPending && approveMutation.variables === admin._id}
                        onClick={() => approveMutation.mutate(admin._id)}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )
        )}

        {/* ── All admins tab ─── */}
        {tab === "all" && (
          loadingAll ? <Spinner /> : filteredAll.length === 0 ? (
            <EmptyState
              icon={<Users className="h-7 w-7 text-body" />}
              msg={search ? "No admins match your search." : "No admins found."}
            />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th>Admin</Th>
                  <Th>Email</Th>
                  <Th>Approved</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                  <Th>Actions</Th>
                </tr>
              </TableHead>
              <TableBody>
                {filteredAll.map((admin) => (
                  <tr key={admin._id} className="hover:bg-meta-2 transition-colors dark:hover:bg-meta-4">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={admin.fullName} />
                        <span className="font-medium text-black dark:text-white">{admin.fullName}</span>
                      </div>
                    </Td>
                    <Td className="text-body">{admin.email}</Td>
                    <Td>
                      <Badge variant={admin.approved ? "success" : "warning"}>
                        {admin.approved ? "Approved" : "Pending"}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge variant={admin.isActive ? "success" : "danger"}>
                        {admin.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </Td>
                    <Td className="text-xs text-body">
                      {new Date(admin.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </Td>
                    <Td>
                      {admin.isActive ? (
                        <button
                          onClick={() => { setActionTarget({ admin, type: "suspend" }); setActionError(""); }}
                          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-meta-1 hover:bg-meta-1/10 transition-colors"
                          title="Suspend admin"
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => { setActionTarget({ admin, type: "unsuspend" }); setActionError(""); }}
                          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-meta-3 hover:bg-meta-3/10 transition-colors"
                          title="Unsuspend admin"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          Unsuspend
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )
        )}
      </Card>

      {/* Suspend / Unsuspend confirm modal */}
      <Modal
        open={actionTarget !== null}
        onClose={() => { setActionTarget(null); setActionError(""); }}
        title={actionTarget?.type === "suspend" ? "Suspend Admin" : "Unsuspend Admin"}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {actionTarget?.type === "suspend" ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-meta-1/10">
                <ShieldAlert className="h-5 w-5 text-meta-1" />
              </div>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-meta-3/10">
                <ShieldCheck className="h-5 w-5 text-meta-3" />
              </div>
            )}
            <div>
              <p className="text-sm text-body">
                {actionTarget?.type === "suspend" ? (
                  <>
                    Suspending <span className="font-semibold text-black dark:text-white">{actionTarget.admin.fullName}</span> will
                    prevent them from logging in. You can unsuspend at any time.
                  </>
                ) : (
                  <>
                    Unsuspending <span className="font-semibold text-black dark:text-white">{actionTarget?.admin.fullName}</span> will
                    restore their access to the platform.
                  </>
                )}
              </p>
            </div>
          </div>
          {actionError && (
            <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{actionError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setActionTarget(null); setActionError(""); }}>
              Cancel
            </Button>
            <Button
              variant={actionTarget?.type === "suspend" ? "danger" : "primary" as "danger" | "primary"}
              isLoading={actionPending}
              onClick={() => {
                if (!actionTarget) return;
                if (actionTarget.type === "suspend") suspendMutation.mutate(actionTarget.admin._id);
                else unsuspendMutation.mutate(actionTarget.admin._id);
              }}
            >
              {actionTarget?.type === "suspend" ? "Suspend" : "Unsuspend"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
      {name.charAt(0)}
    </div>
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
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
        {icon}
      </div>
      <p className="text-sm text-body">{msg}</p>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "primary" | "warning" | "success";
}

const colorMap = {
  primary: { bg: "bg-meta-2 dark:bg-meta-4", icon: "text-primary" },
  warning: { bg: "bg-yellow-50 dark:bg-yellow-900/20", icon: "text-yellow-600 dark:text-yellow-400" },
  success: { bg: "bg-meta-3/10", icon: "text-meta-3" },
};

function SummaryCard({ label, value, icon: Icon, color }: SummaryCardProps) {
  const c = colorMap[color];
  return (
    <div className="rounded-sm border border-stroke bg-white px-6 py-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-body">{label}</p>
          <p className="mt-1 text-3xl font-bold text-black dark:text-white">{value}</p>
        </div>
        <div className={["flex h-12 w-12 items-center justify-center rounded-full", c.bg].join(" ")}>
          <Icon className={["h-6 w-6", c.icon].join(" ")} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
