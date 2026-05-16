"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wifi } from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import type { OnlineUsersData } from "@/lib/api/monitor";
import { useSocket } from "@/context/SocketContext";

export function OnlineUsersCard() {
  const qc = useQueryClient();
  const socket = useSocket();

  const { data, isLoading, isError } = useQuery<OnlineUsersData>({
    queryKey: ["online-users"],
    queryFn: monitorApi.getOnlineUsers,
    staleTime: Infinity,        // socket is the primary update path
    refetchInterval: 30_000,    // polling fallback every 30 s
    retry: 1,
  });

  // Real-time updates via socket
  useEffect(() => {
    if (!socket) return;
    const handler = (snapshot: OnlineUsersData) => {
      qc.setQueryData(["online-users"], snapshot);
    };
    const onConnect = () => socket.emit("request_presence");
    socket.on("presence:update", handler);
    socket.on("connect", onConnect);
    // Ask for the latest snapshot now that the listener is ready (works even
    // if the socket is already connected and buffers the emit if not yet connected)
    socket.emit("request_presence");
    return () => {
      socket.off("presence:update", handler);
      socket.off("connect", onConnect);
    };
  }, [socket, qc]);

  const counts = data?.counts ?? { student: 0, lecturer: 0, parent: 0, admin: 0 };
  const admins = data?.admins ?? [];
  const total = counts.student + counts.lecturer + counts.parent + counts.admin;

  const pills = [
    { label: "Students",  value: counts.student,  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    { label: "Teachers",  value: counts.lecturer, color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
    { label: "Parents",   value: counts.parent,   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    { label: "Admins",    value: counts.admin,    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <Wifi size={17} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Online Users</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Live — updates in real time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          {isLoading ? (
            <span className="text-xs text-gray-400">Loading…</span>
          ) : isError ? (
            <span className="text-xs text-red-500">API error — check console</span>
          ) : (
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{total} online</span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Role counts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pills.map(({ label, value, color }) => (
            <div key={label} className={`flex items-center justify-between rounded-xl px-4 py-3 ${color}`}>
              <span className="text-xs font-medium">{label}</span>
              <span className="text-lg font-bold">{isLoading ? "—" : value}</span>
            </div>
          ))}
        </div>

        {/* Admin detail table */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Admin Sessions
          </h3>
          {isLoading ? (
            <p className="py-4 text-center text-sm text-gray-400">Loading…</p>
          ) : admins.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No admins currently online</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Admin</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Institute</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Online Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {admins.map((a) => (
                    <tr key={a.userId} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{a.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {a.institute?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(a.connectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
