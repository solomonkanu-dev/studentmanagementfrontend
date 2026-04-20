"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Zap,
  Building2,
} from "lucide-react";
import { auditLogApi } from "@/lib/api/auditLog";
import type { AuditLog, AuditLogParams } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_META: Record<
  string,
  { color: string; dotColor: string; icon: React.ElementType }
> = {
  CREATE: { color: "text-emerald-600 dark:text-emerald-400", dotColor: "bg-emerald-500", icon: Plus },
  UPDATE: { color: "text-blue-600 dark:text-blue-400", dotColor: "bg-blue-500", icon: Pencil },
  DELETE: { color: "text-red-600 dark:text-red-400", dotColor: "bg-red-500", icon: Trash2 },
  LOGIN:  { color: "text-purple-600 dark:text-purple-400", dotColor: "bg-purple-500", icon: LogIn },
  LOGOUT: { color: "text-gray-500 dark:text-gray-400", dotColor: "bg-gray-400", icon: LogOut },
  VIEW:   { color: "text-amber-600 dark:text-amber-400", dotColor: "bg-amber-400", icon: Eye },
};

function getActionMeta(action: string) {
  return ACTION_META[action?.toUpperCase()] ?? {
    color: "text-gray-600 dark:text-gray-400",
    dotColor: "bg-gray-400",
    icon: Zap,
  };
}

const ROLE_COLORS: Record<string, string> = {
  admin: "text-indigo-600 dark:text-indigo-400",
  lecturer: "text-teal-600 dark:text-teal-400",
  student: "text-orange-600 dark:text-orange-400",
  super_admin: "text-red-600 dark:text-red-400",
};

function timeAgo(str: string) {
  const diff = Date.now() - new Date(str).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFull(str: string) {
  return new Date(str).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function activitySentence(log: AuditLog) {
  const action = log.action?.toLowerCase() ?? "performed an action on";
  const entity = log.entity ? ` ${log.entity.toLowerCase()}` : "";
  if (log.description) return log.description;
  return `${action}${entity ? `d a${entity}` : " an action"}`;
}

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Delta Row ─────────────────────────────────────────────────────────────────

function DeltaRow({ before, after }: { before?: Record<string, unknown> | null; after?: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  if (keys.length === 0) return null;
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-[11px] text-indigo-500 hover:underline"
      >
        {open ? "hide changes" : `${keys.length} field${keys.length > 1 ? "s" : ""} changed`}
      </button>
      {open && (
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-0.5">
          {keys.map((k) => (
            <span key={k} className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{k}:</span>{" "}
              {before?.[k] !== undefined && (
                <span className="text-red-500 line-through mr-1">{String(before[k])}</span>
              )}
              {after?.[k] !== undefined && (
                <span className="text-emerald-600 dark:text-emerald-400">{String(after[k])}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity Item ─────────────────────────────────────────────────────────────

function ActivityItem({ log }: { log: AuditLog }) {
  const meta = getActionMeta(log.action);
  const Icon = meta.icon;
  const roleColor = ROLE_COLORS[log.role] ?? "text-gray-500";
  const initials = log.userFullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex gap-4 py-4">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
          {initials}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-800 ${meta.dotColor}`}
        >
          <Icon size={9} className="text-white" strokeWidth={3} />
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            {log.userFullName}
          </span>
          <span className={`text-xs font-medium capitalize ${roleColor}`}>
            ({log.role.replace("_", " ")})
          </span>
          <span className={`text-sm ${meta.color} font-medium`}>
            {activitySentence(log)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{log.userEmail}</span>
          {log.entity && (
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              {log.entity}
              {log.entityId && (
                <span className="font-mono text-[10px] opacity-60">#{log.entityId.slice(-6)}</span>
              )}
            </span>
          )}
          {log.institute && (
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <Building2 size={10} className="opacity-60" />
              <span className="font-mono text-[10px] opacity-70">{String(log.institute).slice(-8)}</span>
            </span>
          )}
          {log.ipAddress && (
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              {log.ipAddress}
            </span>
          )}
          {log.method && log.path && (
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span className="font-semibold">{log.method}</span>
              <span className="opacity-60 truncate max-w-[160px]">{log.path}</span>
            </span>
          )}
          {log.statusCode && (
            <span
              className={`font-mono font-semibold ${
                log.statusCode < 300 ? "text-emerald-600" : log.statusCode < 400 ? "text-amber-500" : "text-red-500"
              }`}
            >
              {log.statusCode}
            </span>
          )}
        </div>
        {(log.before || log.after) && (
          <DeltaRow before={log.before} after={log.after} />
        )}
      </div>

      {/* Time */}
      <div className="shrink-0 text-right">
        <span
          className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap"
          title={formatFull(log.createdAt)}
        >
          {timeAgo(log.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = ["", "super_admin", "admin", "lecturer", "student"];

export default function SuperAdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [userRole, setUserRole] = useState("");
  const [instituteId, setInstituteId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const debouncedAction = useDebounce(action);
  const debouncedEntity = useDebounce(entity);
  const debouncedInstituteId = useDebounce(instituteId);

  const params: AuditLogParams = {
    limit: 25,
    page,
    action: debouncedAction || undefined,
    entity: debouncedEntity || undefined,
    userRole: userRole || undefined,
    instituteId: debouncedInstituteId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["sa-audit-logs", params],
    queryFn: () => auditLogApi.getAll(params),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedAction, debouncedEntity, userRole, debouncedInstituteId, startDate, endDate]);

  const logs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const hasFilters = !!(action || entity || userRole || instituteId || startDate || endDate);

  function clearFilters() {
    setAction(""); setEntity(""); setUserRole("");
    setInstituteId(""); setStartDate(""); setEndDate("");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              System-wide activity across all institutes
              {isFetching && !isLoading && (
                <span className="ml-2 inline-flex items-center gap-1 text-red-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  live
                </span>
              )}
            </p>
          </div>
        </div>
        {data?.total !== undefined && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {data.total.toLocaleString()} events
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="min-w-[130px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Action</label>
          <input
            type="text"
            placeholder="e.g. CREATE, LOGIN"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="min-w-[130px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Entity</label>
          <input
            type="text"
            placeholder="e.g. User, Class"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="min-w-[130px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Role</label>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r === "" ? "All roles" : r.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Institute ID</label>
          <input
            type="text"
            placeholder="Institute ID"
            value={instituteId}
            onChange={(e) => setInstituteId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="min-w-[130px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="min-w-[130px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Feed */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Activity size={40} className="mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No activity found</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-xs text-red-500 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 px-5 dark:divide-gray-700/50">
            {logs.map((log) => (
              <ActivityItem key={log._id} log={log} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
