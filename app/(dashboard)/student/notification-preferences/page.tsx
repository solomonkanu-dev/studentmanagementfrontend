"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { errMsg } from "@/lib/utils/errMsg";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import {
  Bell,
  BellOff,
  CreditCard,
  FileText,
  Megaphone,
  ClipboardList,
  CalendarCheck,
  CheckCircle,
  Lock,
} from "lucide-react";

// ─── Notification type config ─────────────────────────────────────────────────

interface NotificationType {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  critical: boolean;
}

const notificationTypes: NotificationType[] = [
  {
    key: "feePayment",
    label: "Fee Payment Receipt",
    description: "Email sent when a fee payment is recorded for your account.",
    icon: CreditCard,
    critical: true,
  },
  {
    key: "resultsPublished",
    label: "Results Published",
    description: "Email sent when your marks for a subject are published.",
    icon: FileText,
    critical: true,
  },
  {
    key: "announcement",
    label: "Announcements",
    description: "Email sent when a new announcement is posted for your role.",
    icon: Megaphone,
    critical: false,
  },
  {
    key: "assignmentPosted",
    label: "Assignment Posted",
    description: "Email sent when a new assignment is published in your class.",
    icon: ClipboardList,
    critical: false,
  },
  {
    key: "attendanceAlert",
    label: "Attendance Alert",
    description: "Email sent when your attendance drops below 75%.",
    icon: CalendarCheck,
    critical: true,
  },
];

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        checked ? "bg-primary" : "bg-stroke dark:bg-strokedark",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={[
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationPreferencesPage() {
  const { user } = useAuth();

  // emailOptOut is an array of opted-out type keys stored on the user object
  const initialOptOut: string[] = (user as { emailOptOut?: string[] })?.emailOptOut ?? [];
  const [optOut, setOptOut] = useState<Set<string>>(new Set(initialOptOut));
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: async (optOutArr: string[]) => {
      const { data } = await apiClient.patch("/student/email-preferences", { optOut: optOutArr });
      return data;
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleToggle = (key: string, wantEmails: boolean) => {
    setOptOut((prev) => {
      const next = new Set(prev);
      if (wantEmails) {
        next.delete(key); // receiving = NOT opted out
      } else {
        next.add(key);    // not receiving = opted out
      }
      return next;
    });
    setSaved(false);
  };

  const handleSave = () => {
    mutation.mutate(Array.from(optOut));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">
            Notification Preferences
          </h1>
          <p className="text-sm text-body">
            Choose which email notifications you want to receive.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {notificationTypes.map(({ key, label, description, icon: Icon, critical }) => {
          const isReceiving = !optOut.has(key);

          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark"
            >
              <div className="flex items-start gap-4">
                <div
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    isReceiving ? "bg-primary/10" : "bg-stroke dark:bg-meta-4",
                  ].join(" ")}
                >
                  <Icon
                    className={["h-5 w-5", isReceiving ? "text-primary" : "text-body"].join(" ")}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-black dark:text-white">
                      {label}
                    </span>
                    {critical ? (
                      <span className="flex items-center gap-0.5 rounded-full bg-meta-3/10 px-2 py-0.5 text-[10px] font-medium text-meta-3">
                        <Lock className="h-2.5 w-2.5" />
                        Always On
                      </span>
                    ) : isReceiving ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        On
                      </span>
                    ) : (
                      <span className="rounded-full bg-stroke px-2 py-0.5 text-[10px] font-medium text-body dark:bg-meta-4">
                        Off
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-body">{description}</p>
                  {critical && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-meta-3">
                      <Lock className="h-3 w-3" />
                      This notification cannot be turned off.
                    </p>
                  )}
                </div>
              </div>

              {critical ? (
                <div className="ml-4 shrink-0">
                  <BellOff className="h-5 w-5 text-body opacity-30" />
                </div>
              ) : (
                <div className="ml-4 shrink-0">
                  <Toggle
                    checked={isReceiving}
                    onChange={(v) => handleToggle(key, v)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={mutation.isPending}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving..." : "Save Preferences"}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-meta-3">
            <CheckCircle className="h-4 w-4" /> Preferences saved
          </span>
        )}
        {mutation.isError && (
          <span className="text-sm text-meta-1">
            {errMsg(mutation.error, "Failed to save preferences")}
          </span>
        )}
      </div>
    </div>
  );
}
