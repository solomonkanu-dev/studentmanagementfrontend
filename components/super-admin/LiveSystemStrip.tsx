"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ServerCog, ArrowRight, RefreshCw } from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import type { OnlineUsersData } from "@/lib/api/monitor";
import { systemConfigApi } from "@/lib/api/systemConfig";
import { Badge } from "@/components/ui/Badge";
import { useSocket } from "@/context/SocketContext";

// ─── Shared bits ──────────────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      {children}
    </div>
  );
}

function InlineRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      Retry
    </button>
  );
}

// ─── Live Activity ────────────────────────────────────────────────────────────

function LiveActivityPanel() {
  const qc = useQueryClient();
  const socket = useSocket();

  const { data, isLoading, isError, refetch } = useQuery<OnlineUsersData>({
    queryKey: ["online-users"],
    queryFn: monitorApi.getOnlineUsers,
    staleTime: Infinity, // socket is the primary update path
    refetchInterval: 30_000, // polling fallback
    retry: 1,
  });

  // Real-time presence updates over the socket (same channel OnlineUsersCard uses)
  useEffect(() => {
    if (!socket) return;
    const handler = (snapshot: OnlineUsersData) => qc.setQueryData(["online-users"], snapshot);
    const onConnect = () => socket.emit("request_presence");
    socket.on("presence:update", handler);
    socket.on("connect", onConnect);
    socket.emit("request_presence");
    return () => {
      socket.off("presence:update", handler);
      socket.off("connect", onConnect);
    };
  }, [socket, qc]);

  const counts = data?.counts ?? { student: 0, lecturer: 0, parent: 0, admin: 0 };
  const total = counts.student + counts.lecturer + counts.parent + counts.admin;

  const roles = [
    { label: "Students", value: counts.student, color: "text-primary" },
    { label: "Teachers", value: counts.lecturer, color: "text-meta-3" },
    { label: "Parents", value: counts.parent, color: "text-warning" },
    { label: "Admins", value: counts.admin, color: "text-meta-1" },
  ];

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-meta-3 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-meta-3" />
          </span>
          <h2 className="text-sm font-semibold text-black dark:text-white">Live Activity</h2>
        </div>
        {isError ? (
          <InlineRetry onRetry={() => refetch()} />
        ) : (
          <span className="text-xs text-body">
            {isLoading ? "Loading…" : `${total} online now`}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {roles.map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-sm bg-whiter px-2 py-2.5 text-center dark:bg-meta-4"
          >
            <p className={`text-lg font-bold ${color}`}>
              {isLoading || isError ? "—" : value}
            </p>
            <p className="text-[10px] font-medium text-body">{label}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── System Health ────────────────────────────────────────────────────────────

function SystemHealthPanel() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["maintenance-status"],
    queryFn: systemConfigApi.getMaintenance,
  });

  const maintenanceOn = data?.globalMaintenance ?? false;

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ServerCog className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-black dark:text-white">System Health</h2>
        </div>
        <Link
          href="/super-admin/system"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Manage <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4">
        {isError ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-body">Couldn&apos;t load system status.</span>
            <InlineRetry onRetry={() => refetch()} />
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            <span className="text-sm text-body">Checking status…</span>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Badge variant={maintenanceOn ? "danger" : "success"}>
              {maintenanceOn ? "Maintenance Mode" : "Operational"}
            </Badge>
            <p className="text-xs text-body">
              {maintenanceOn
                ? data?.message?.trim()
                  ? data.message
                  : "All institutes are currently in maintenance mode."
                : "All institutes are online and accessible."}
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}

// ─── Strip ────────────────────────────────────────────────────────────────────

export function LiveSystemStrip() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <LiveActivityPanel />
      <SystemHealthPanel />
    </div>
  );
}
