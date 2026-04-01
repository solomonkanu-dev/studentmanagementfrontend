"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  notificationSettingsApi,
  type NotificationSettings,
  type EmailLogEntry,
} from "@/lib/api/notificationSettings";
import {
  Mail,
  Bell,
  BellOff,
  CreditCard,
  FileText,
  Megaphone,
  ClipboardList,
  CalendarCheck,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Zod schema for SMTP form ────────────────────────────────────────────────

const smtpSchema = z.object({
  host:      z.string().min(1, "SMTP host is required"),
  port:      z.coerce.number().int().min(1).max(65535),
  secure:    z.boolean(),
  user:      z.string().min(1, "Username is required"),
  pass:      z.string().min(1, "Password is required"),
  fromEmail: z.string().email("Must be a valid email"),
  fromName:  z.string().min(1, "From name is required"),
});
type SmtpForm = z.infer<typeof smtpSchema>;

// ─── Notification type metadata ──────────────────────────────────────────────

const notificationTypes = [
  {
    key: "feePayment" as const,
    label: "Fee Payment",
    description: "Sent to students when a fee payment is recorded by admin.",
    icon: CreditCard,
    critical: true,
  },
  {
    key: "resultsPublished" as const,
    label: "Results Published",
    description: "Sent to students when marks are assigned for a subject.",
    icon: FileText,
    critical: true,
  },
  {
    key: "announcement" as const,
    label: "Announcements",
    description: "Sent to all targeted users when a new announcement is created.",
    icon: Megaphone,
    critical: false,
  },
  {
    key: "assignmentPosted" as const,
    label: "Assignment Posted",
    description: "Sent to students in a class when a new assignment is published.",
    icon: ClipboardList,
    critical: false,
  },
  {
    key: "attendanceAlert" as const,
    label: "Attendance Alert",
    description: "Sent to students whose attendance drops below 75%.",
    icon: CalendarCheck,
    critical: true,
  },
];

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none",
        checked ? "bg-primary" : "bg-stroke dark:bg-strokedark",
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

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "smtp" | "types" | "logs";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NotificationsSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("smtp");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">Email Notifications</h1>
        <p className="mt-1 text-sm text-body">
          Configure SMTP settings, manage notification types, and review delivery logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-stroke bg-white p-1 dark:border-strokedark dark:bg-boxdark">
        {(["smtp", "types", "logs"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-primary text-white shadow"
                : "text-body hover:text-black dark:hover:text-white",
            ].join(" ")}
          >
            {tab === "smtp" && "SMTP Setup"}
            {tab === "types" && "Notification Types"}
            {tab === "logs" && "Delivery Log"}
          </button>
        ))}
      </div>

      {activeTab === "smtp"  && <SmtpTab />}
      {activeTab === "types" && <TypesTab />}
      {activeTab === "logs"  && <LogsTab />}
    </div>
  );
}

// ─── SMTP Setup tab ───────────────────────────────────────────────────────────

function SmtpTab() {
  const qc = useQueryClient();
  const [showPass, setShowPass] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const { data: settings, isLoading } = useQuery<NotificationSettings>({
    queryKey: ["notification-settings"],
    queryFn: notificationSettingsApi.getSettings,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SmtpForm>({
    resolver: zodResolver(smtpSchema) as Resolver<SmtpForm>,
    values: settings
      ? {
          host:      settings.smtp.host,
          port:      settings.smtp.port,
          secure:    settings.smtp.secure,
          user:      settings.smtp.user,
          pass:      settings.smtp.pass,
          fromEmail: settings.smtp.fromEmail,
          fromName:  settings.smtp.fromName,
        }
      : undefined,
  });

  const secureValue = watch("secure");

  const saveMutation = useMutation({
    mutationFn: (smtp: SmtpForm) => notificationSettingsApi.updateSettings({ smtp }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-settings"] });
    },
  });

  const onSubmit = handleSubmit((data: SmtpForm) => saveMutation.mutate(data));

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setTestLoading(true);
    setTestMsg(null);
    try {
      const res = await notificationSettingsApi.sendTestEmail(testEmail);
      setTestMsg({ ok: true, text: res.message });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to send test email";
      setTestMsg({ ok: false, text: msg });
    } finally {
      setTestLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-body">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SMTP form */}
      <div className="rounded-xl border border-stroke bg-white p-6 dark:border-strokedark dark:bg-boxdark">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-black dark:text-white">SMTP Configuration</h2>
            <p className="text-xs text-body">Credentials for outgoing email delivery.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Host */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                SMTP Host
              </label>
              <input
                {...register("host")}
                placeholder="smtp.gmail.com"
                className="w-full rounded-xl border border-stroke bg-white px-4 py-2.5 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
              {errors.host && <p className="mt-1 text-xs text-meta-1">{errors.host.message}</p>}
            </div>

            {/* Port */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                Port
              </label>
              <input
                {...register("port")}
                type="number"
                placeholder="587"
                className="w-full rounded-xl border border-stroke bg-white px-4 py-2.5 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
              {errors.port && <p className="mt-1 text-xs text-meta-1">{errors.port.message}</p>}
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                Username
              </label>
              <input
                {...register("user")}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-stroke bg-white px-4 py-2.5 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
              {errors.user && <p className="mt-1 text-xs text-meta-1">{errors.user.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                Password / App Password
              </label>
              <div className="relative">
                <input
                  {...register("pass")}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-stroke bg-white px-4 py-2.5 pr-10 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-body hover:text-black dark:hover:text-white"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.pass && <p className="mt-1 text-xs text-meta-1">{errors.pass.message}</p>}
            </div>

            {/* From Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                From Email
              </label>
              <input
                {...register("fromEmail")}
                placeholder="noreply@yourinstitute.com"
                className="w-full rounded-xl border border-stroke bg-white px-4 py-2.5 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
              {errors.fromEmail && <p className="mt-1 text-xs text-meta-1">{errors.fromEmail.message}</p>}
            </div>

            {/* From Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black dark:text-white">
                From Name
              </label>
              <input
                {...register("fromName")}
                placeholder="My Institute"
                className="w-full rounded-xl border border-stroke bg-white px-4 py-2.5 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
              {errors.fromName && <p className="mt-1 text-xs text-meta-1">{errors.fromName.message}</p>}
            </div>
          </div>

          {/* Secure toggle */}
          <div className="flex items-center gap-3">
            <Toggle
              checked={secureValue ?? false}
              onChange={(v) => setValue("secure", v, { shouldDirty: true })}
            />
            <span className="text-sm text-black dark:text-white">
              Use SSL/TLS (port 465)
            </span>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending || !isDirty}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving..." : "Save SMTP Settings"}
            </button>
            {saveMutation.isSuccess && (
              <span className="flex items-center gap-1 text-sm text-meta-3">
                <CheckCircle className="h-4 w-4" /> Saved
              </span>
            )}
            {saveMutation.isError && (
              <span className="flex items-center gap-1 text-sm text-meta-1">
                <XCircle className="h-4 w-4" /> Failed to save
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Test email */}
      <div className="rounded-xl border border-stroke bg-white p-6 dark:border-strokedark dark:bg-boxdark">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Send className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-black dark:text-white">Send Test Email</h2>
            <p className="text-xs text-body">Verify your SMTP configuration is working.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="flex-1 rounded-xl border border-stroke bg-white px-4 py-2.5 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
          />
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testLoading || !testEmail}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {testLoading ? "Sending..." : "Send Test"}
          </button>
        </div>

        {testMsg && (
          <div
            className={[
              "mt-3 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm",
              testMsg.ok
                ? "bg-meta-3/10 text-meta-3"
                : "bg-meta-1/10 text-meta-1",
            ].join(" ")}
          >
            {testMsg.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            {testMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notification Types tab ───────────────────────────────────────────────────

function TypesTab() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<NotificationSettings>({
    queryKey: ["notification-settings"],
    queryFn: notificationSettingsApi.getSettings,
  });

  const [localEnabled, setLocalEnabled] = useState<Record<string, boolean> | null>(null);

  // Initialise from server data
  const enabledState = localEnabled ?? settings?.enabled ?? {};

  const saveMutation = useMutation({
    mutationFn: (enabled: Record<string, boolean>) =>
      notificationSettingsApi.updateSettings({ enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-settings"] });
      setLocalEnabled(null);
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    setLocalEnabled((prev) => ({ ...(prev ?? settings?.enabled ?? {}), [key]: value }));
  };

  const handleSave = () => {
    if (localEnabled) saveMutation.mutate(localEnabled);
  };

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center text-body">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {notificationTypes.map(({ key, label, description, icon: Icon, critical }) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-black dark:text-white">{label}</span>
                {critical && (
                  <span className="rounded-full bg-meta-3/10 px-2 py-0.5 text-[10px] font-medium text-meta-3">
                    Critical
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-body">{description}</p>
            </div>
          </div>
          <Toggle
            checked={!!(enabledState as Record<string, boolean>)[key]}
            onChange={(v) => handleToggle(key, v)}
          />
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending || localEnabled === null}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saveMutation.isPending ? "Saving..." : "Save Preferences"}
        </button>
        {saveMutation.isSuccess && (
          <span className="flex items-center gap-1 text-sm text-meta-3">
            <CheckCircle className="h-4 w-4" /> Saved
          </span>
        )}
      </div>

      <div className="rounded-xl border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-start gap-2 text-sm text-body">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Students can opt out of <strong>Announcement</strong> and{" "}
            <strong>Assignment Posted</strong> notifications from their Notification
            Preferences page. Critical notifications (Fee Payment, Results, Attendance Alert) cannot be opted out of.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Delivery Log tab ─────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  feePayment:       "Fee Payment",
  resultsPublished: "Results",
  announcement:     "Announcement",
  assignmentPosted: "Assignment",
  attendanceAlert:  "Attendance Alert",
  test:             "Test",
};

function LogsTab() {
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["notification-logs", page],
    queryFn: () => notificationSettingsApi.getLogs(page),
  });

  const logs: EmailLogEntry[] = data?.logs ?? [];
  const totalPages = data?.pages ?? 1;

  return (
    <div className="rounded-xl border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
        <h2 className="text-base font-semibold text-black dark:text-white">Delivery Log</h2>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-body transition-colors hover:border-primary hover:text-primary dark:border-strokedark"
        >
          <RefreshCw className={["h-3.5 w-3.5", isFetching ? "animate-spin" : ""].join(" ")} />
          Refresh
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-body text-sm">
          Loading logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-body">
          <BellOff className="h-8 w-8 opacity-40" />
          <span className="text-sm">No emails sent yet</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke text-left dark:border-strokedark">
                <th className="px-5 py-3 font-medium text-body">Recipient</th>
                <th className="px-5 py-3 font-medium text-body">Type</th>
                <th className="px-5 py-3 font-medium text-body">Subject</th>
                <th className="px-5 py-3 font-medium text-body">Status</th>
                <th className="px-5 py-3 font-medium text-body">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr
                    key={log._id}
                    className="border-b border-stroke last:border-0 dark:border-strokedark"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-black dark:text-white">
                        {log.recipientUser?.fullName ?? log.recipientEmail}
                      </div>
                      {log.recipientUser && (
                        <div className="text-xs text-body">{log.recipientEmail}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-body">
                      {TYPE_LABELS[log.type] ?? log.type}
                    </td>
                    <td className="max-w-xs px-5 py-3 text-body">
                      <span className="line-clamp-1">{log.subject}</span>
                    </td>
                    <td className="px-5 py-3">
                      {log.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-meta-3/10 px-2.5 py-1 text-xs font-medium text-meta-3">
                          <CheckCircle className="h-3 w-3" /> Sent
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedRow(expandedRow === log._id ? null : log._id)}
                          className="inline-flex items-center gap-1 rounded-full bg-meta-1/10 px-2.5 py-1 text-xs font-medium text-meta-1 hover:bg-meta-1/20"
                        >
                          <XCircle className="h-3 w-3" /> Failed
                        </button>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-body text-xs">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                  </tr>
                  {expandedRow === log._id && log.error && (
                    <tr key={`${log._id}-err`} className="bg-meta-1/5">
                      <td colSpan={5} className="px-5 py-2.5">
                        <p className="text-xs text-meta-1">
                          <strong>Error:</strong> {log.error}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-stroke px-5 py-3 dark:border-strokedark">
          <span className="text-xs text-body">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-7 w-7 items-center justify-center rounded border border-stroke text-body transition-colors hover:border-primary hover:text-primary disabled:opacity-40 dark:border-strokedark"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex h-7 w-7 items-center justify-center rounded border border-stroke text-body transition-colors hover:border-primary hover:text-primary disabled:opacity-40 dark:border-strokedark"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
