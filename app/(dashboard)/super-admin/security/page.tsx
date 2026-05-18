"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, LogIn, Globe, KeyRound, AlertTriangle } from "lucide-react";
import { auditLogApi } from "@/lib/api/auditLog";
import type { AuditLog } from "@/lib/types";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Loader, ErrorBlock } from "@/components/super-admin/CardState";

// ─── Constants ────────────────────────────────────────────────────────────────

// Privileged / destructive actions worth a dedicated security trail.
const SENSITIVE_ACTIONS = new Set([
  "SUSPEND_ADMIN",
  "UNSUSPEND_ADMIN",
  "SUSPEND_USER",
  "UNSUSPEND_USER",
  "DELETE_USER",
  "DELETE",
  "ARCHIVE_USER",
  "RESTORE_USER",
  "RESET_PASSWORD",
  "APPROVE_ADMIN",
  "REJECT_ADMIN",
  "SET_ADMIN_UNDER_REVIEW",
  "TOGGLE_GLOBAL_MAINTENANCE",
  "TOGGLE_INSTITUTE_MAINTENANCE",
]);

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-meta-1/10 text-meta-1",
  admin: "bg-primary/10 text-primary",
  lecturer: "bg-indigo-500/10 text-indigo-500",
  student: "bg-meta-3/10 text-meta-3",
  parent: "bg-warning/10 text-warning",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function titleCase(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function fmtTime(s: string) {
  return new Date(s).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deviceLabel(ua?: string) {
  if (!ua) return "Unknown device";
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  return `${browser} · ${mobile ? "Mobile" : "Desktop"}`;
}

function RoleTag({ role }: { role: string }) {
  const cls = ROLE_BADGE[role] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {titleCase(role)}
    </span>
  );
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────

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
    <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-body">{label}</p>
          <p className="mt-1 truncate text-lg font-bold text-black dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-body">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Login activity table — shared by the recent-logins and failed-logins cards.
function LoginTable({ rows }: { rows: AuditLog[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-stroke bg-whiter dark:border-strokedark dark:bg-meta-4">
            <th className="px-4 py-2.5 text-left font-semibold text-body">User</th>
            <th className="px-4 py-2.5 text-left font-semibold text-body">Role</th>
            <th className="px-4 py-2.5 text-left font-semibold text-body">IP Address</th>
            <th className="px-4 py-2.5 text-left font-semibold text-body">Device</th>
            <th className="px-4 py-2.5 text-right font-semibold text-body">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stroke dark:divide-strokedark">
          {rows.map((l) => (
            <tr key={l._id}>
              <td className="max-w-[180px] px-4 py-2.5">
                <p className="truncate font-medium text-black dark:text-white">
                  {l.userFullName}
                </p>
                <p className="truncate text-[10px] text-body">{l.userEmail}</p>
              </td>
              <td className="px-4 py-2.5">
                <RoleTag role={l.role} />
              </td>
              <td className="px-4 py-2.5 font-mono text-body">{l.ipAddress || "—"}</td>
              <td className="px-4 py-2.5 text-body">{deviceLabel(l.userAgent)}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-body">
                {fmtTime(l.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SecurityMonitoringPage() {
  const loginsQuery = useQuery({
    queryKey: ["security-logins"],
    queryFn: () => auditLogApi.getAll({ action: "LOGIN", limit: 100 }),
  });
  const recentQuery = useQuery({
    queryKey: ["security-recent"],
    queryFn: () => auditLogApi.getAll({ limit: 100 }),
  });
  const failedQuery = useQuery({
    queryKey: ["security-failed-logins"],
    queryFn: () => auditLogApi.getAll({ action: "LOGIN_FAILED", limit: 100 }),
  });

  const logins: AuditLog[] = useMemo(() => loginsQuery.data?.data ?? [], [loginsQuery.data]);
  const totalLogins = loginsQuery.data?.total ?? 0;
  const failedLogins: AuditLog[] = useMemo(
    () => failedQuery.data?.data ?? [],
    [failedQuery.data]
  );
  const totalFailed = failedQuery.data?.total ?? 0;

  const sensitive = useMemo(
    () => (recentQuery.data?.data ?? []).filter((l) => SENSITIVE_ACTIONS.has(l.action)),
    [recentQuery.data]
  );

  const byIp = useMemo(() => {
    const map = new Map<string, { ip: string; count: number; users: Set<string> }>();
    for (const l of logins) {
      const ip = l.ipAddress || "unknown";
      const entry = map.get(ip) ?? { ip, count: 0, users: new Set<string>() };
      entry.count += 1;
      entry.users.add(l.userEmail);
      map.set(ip, entry);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [logins]);

  const uniqueIps = byIp.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">Security Monitoring</h1>
          <p className="text-sm text-body">
            Login activity and sensitive actions across the platform
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total Logins"
          value={totalLogins.toLocaleString()}
          sub="all-time, platform-wide"
          icon={<LogIn className="h-5 w-5 text-primary" />}
          bg="bg-primary/10"
        />
        <StatTile
          label="Unique IP Addresses"
          value={uniqueIps.toLocaleString()}
          sub={`across last ${logins.length} logins`}
          icon={<Globe className="h-5 w-5 text-meta-3" />}
          bg="bg-meta-3/10"
        />
        <StatTile
          label="Failed Logins"
          value={totalFailed.toLocaleString()}
          sub="all-time, platform-wide"
          icon={<AlertTriangle className="h-5 w-5 text-meta-1" />}
          bg="bg-meta-1/10"
        />
        <StatTile
          label="Sensitive Actions"
          value={sensitive.length.toLocaleString()}
          sub="in recent activity"
          icon={<KeyRound className="h-5 w-5 text-warning" />}
          bg="bg-warning/10"
        />
      </div>

      {/* Recent logins + by IP */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Recent Logins</h2>
          </CardHeader>
          <CardContent className="p-0">
            {loginsQuery.isError ? (
              <ErrorBlock onRetry={() => loginsQuery.refetch()} className="py-10" />
            ) : loginsQuery.isLoading ? (
              <Loader className="py-10" />
            ) : logins.length === 0 ? (
              <p className="py-10 text-center text-sm text-body">No login activity recorded.</p>
            ) : (
              <LoginTable rows={logins.slice(0, 20)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Logins by IP Address</h2>
          </CardHeader>
          <CardContent className="p-0">
            {loginsQuery.isError ? (
              <ErrorBlock onRetry={() => loginsQuery.refetch()} className="py-10" />
            ) : loginsQuery.isLoading ? (
              <Loader className="py-10" />
            ) : byIp.length === 0 ? (
              <p className="py-10 text-center text-sm text-body">No IP data available.</p>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {byIp.slice(0, 10).map((entry) => {
                  const shared = entry.users.size > 1;
                  return (
                    <li key={entry.ip} className="flex items-center justify-between gap-2 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-medium text-black dark:text-white">
                          {entry.ip}
                        </p>
                        <p className="text-[10px] text-body">
                          {entry.count} {entry.count === 1 ? "login" : "logins"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          shared
                            ? "bg-warning/10 text-warning"
                            : "bg-meta-3/10 text-meta-3"
                        }`}
                        title={shared ? "Multiple accounts logged in from this IP" : undefined}
                      >
                        {entry.users.size} {entry.users.size === 1 ? "account" : "accounts"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Failed login attempts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-meta-1" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Failed Login Attempts
            </h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {failedQuery.isError ? (
            <ErrorBlock onRetry={() => failedQuery.refetch()} className="py-10" />
          ) : failedQuery.isLoading ? (
            <Loader className="py-10" />
          ) : failedLogins.length === 0 ? (
            <p className="py-10 text-center text-sm text-body">
              No failed login attempts recorded.
            </p>
          ) : (
            <LoginTable rows={failedLogins.slice(0, 20)} />
          )}
        </CardContent>
      </Card>

      {/* Sensitive actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Sensitive Actions
            </h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentQuery.isError ? (
            <ErrorBlock onRetry={() => recentQuery.refetch()} className="py-10" />
          ) : recentQuery.isLoading ? (
            <Loader className="py-10" />
          ) : sensitive.length === 0 ? (
            <p className="py-10 text-center text-sm text-body">
              No sensitive actions in recent activity.
            </p>
          ) : (
            <ul className="divide-y divide-stroke dark:divide-strokedark">
              {sensitive.slice(0, 15).map((l) => (
                <li key={l._id} className="flex items-center gap-3 px-5 py-3">
                  <span className="shrink-0 rounded bg-meta-1/10 px-1.5 py-0.5 text-[10px] font-semibold text-meta-1">
                    {titleCase(l.action)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-black dark:text-white">
                      {l.userFullName}
                      {l.description && (
                        <span className="font-normal text-body"> — {l.description}</span>
                      )}
                    </p>
                    <p className="truncate text-[10px] text-body">
                      {l.userEmail}
                      {l.ipAddress && ` · ${l.ipAddress}`}
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[10px] text-body">
                    {fmtTime(l.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
