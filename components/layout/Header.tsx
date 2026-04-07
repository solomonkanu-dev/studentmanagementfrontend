"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Menu, CheckCheck, Trash2, Camera, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { notificationApi } from "@/lib/api/notification";
import { uploadApi } from "@/lib/api/upload";
import DarkModeSwitcher from "@/components/ui/Header/DarkModeSwitcher";
import type { Notification } from "@/lib/types";

function pageTitle(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean).pop() ?? "dashboard";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationApi.getAll,
  });
  const notifications = data as Notification[];

  const readAllMutation = useMutation({
    mutationFn: notificationApi.readAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  const readOneMutation = useMutation({
    mutationFn: notificationApi.readOne,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
        <span className="text-sm font-semibold text-black dark:text-white">
          Notifications {unreadCount > 0 && <span className="text-primary">({unreadCount} new)</span>}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={() => readAllMutation.mutate()}
            className="flex items-center gap-1 text-xs text-body hover:text-primary transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Bell className="h-6 w-6 text-body" aria-hidden="true" />
            <p className="text-xs text-body">No notifications yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-stroke dark:divide-strokedark">
            {notifications.map((n) => (
              <li
                key={n._id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  !n.isRead ? "bg-primary/5" : "hover:bg-whiter dark:hover:bg-meta-4"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                  <Bell className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium ${!n.isRead ? "text-black dark:text-white" : "text-body"}`}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-body">{n.message}</p>
                  <p className="mt-1 text-xs text-body">
                    {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {!n.isRead && (
                    <button
                      onClick={() => readOneMutation.mutate(n._id)}
                      className="rounded p-1 text-body hover:text-primary transition-colors"
                      aria-label="Mark as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(n._id)}
                    className="rounded p-1 text-body hover:text-meta-1 transition-colors"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export function Header({ sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed }: HeaderProps) {
  const { user, updateUser } = useAuth();
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notification-count"],
    queryFn: notificationApi.getUnreadCount,
    refetchInterval: 30_000, // poll every 30s
  });

  return (
    <header className="sticky top-0 z-10 flex h-14 w-full items-center justify-between border-b border-stroke bg-white px-4 shadow-sm dark:border-strokedark dark:bg-boxdark md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          aria-label="Toggle sidebar"
          className="rounded-md p-1.5 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex rounded-md p-1.5 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <h1 className="text-base font-semibold text-black dark:text-white">
          {pageTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <ul className="flex items-center">
          <DarkModeSwitcher />
        </ul>

        {/* Notifications */}
        <div className="relative">
          <button
            aria-label="Notifications"
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((v) => !v)}
            className="relative rounded-md p-1.5 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {(unreadCount as number) > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-meta-1 text-[10px] font-bold text-white">
                {(unreadCount as number) > 9 ? "9+" : (unreadCount as number)}
              </span>
            )}
          </button>
          {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
        </div>

        {/* User avatar */}
        <div ref={avatarRef} className="relative">
          <button
            onClick={() => setAvatarOpen((v) => !v)}
            className="relative flex h-8 w-8 items-center justify-center rounded-full overflow-hidden ring-2 ring-transparent hover:ring-primary/50 transition-all focus:outline-none focus:ring-primary"
            aria-label="Profile options"
            title={user?.fullName ?? "Profile"}
          >
            {user?.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profilePhoto}
                alt={user.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-primary text-sm font-bold text-white uppercase">
                {user?.fullName?.charAt(0) ?? "?"}
              </span>
            )}
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </span>
            )}
          </button>

          {avatarOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark z-50">
              <div className="border-b border-stroke px-4 py-2.5 dark:border-strokedark">
                <p className="truncate text-xs font-semibold text-black dark:text-white">
                  {user?.fullName}
                </p>
                <p className="truncate text-[10px] text-body capitalize">
                  {user?.role?.replace("_", " ")}
                </p>
              </div>
              <button
                onClick={() => {
                  setAvatarOpen(false);
                  fileInputRef.current?.click();
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-black transition-colors hover:bg-whiter dark:text-white dark:hover:bg-meta-4"
              >
                <Camera className="h-4 w-4 text-body" aria-hidden="true" />
                {user?.profilePhoto ? "Change photo" : "Upload photo"}
              </button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const { profilePhoto } = await uploadApi.profilePhoto(file);
                updateUser({ profilePhoto });
              } catch {
                // silently fail — user stays as-is
              } finally {
                setUploading(false);
                e.target.value = "";
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}
