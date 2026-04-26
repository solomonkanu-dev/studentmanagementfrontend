"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { parentApi } from "@/lib/api/parent";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  CalendarCheck,
  FileText,
  CreditCard,
  Megaphone,
  GraduationCap,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { LinkedStudent } from "@/lib/types";
import AcademicCalendarWidget from "@/components/ui/AcademicCalendarWidget";
import type { ChildPromotionHistory } from "@/lib/api/parent";
import { groupFeesByTerm } from "@/lib/utils/feeGrouping";

interface FeeRecord {
  _id: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
  dueDate?: string;
  termId?: string | { _id: string; name: string; academicYear: string };
  termName?: string;
  academicYear?: string;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
};

function FeeHistoryCard({ fees, childId }: { fees: FeeRecord[]; childId?: string }) {
  const totalBilled = fees.reduce((s, f) => s + f.totalAmount, 0);
  const totalPaid = fees.reduce((s, f) => s + f.amountPaid, 0);
  const totalOutstanding = fees.reduce((s, f) => s + f.balance, 0);
  const grouped = groupFeesByTerm(fees);
  const showHeadings = grouped.size > 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-body" />
            <span className="text-sm font-semibold text-black dark:text-white">Fee History</span>
          </div>
          {childId && (
            <Link
              href={`/parent/fees?child=${childId}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 divide-x divide-stroke dark:divide-strokedark">
          <div className="pr-4 text-center">
            <p className="text-sm font-bold text-black dark:text-white">NLe {totalBilled.toLocaleString()}</p>
            <p className="text-[11px] text-body">Total Billed</p>
          </div>
          <div className="px-4 text-center">
            <p className="text-sm font-bold text-meta-3">NLe {totalPaid.toLocaleString()}</p>
            <p className="text-[11px] text-body">Paid</p>
          </div>
          <div className="pl-4 text-center">
            <p className={`text-sm font-bold ${totalOutstanding > 0 ? "text-meta-1" : "text-meta-3"}`}>
              NLe {totalOutstanding.toLocaleString()}
            </p>
            <p className="text-[11px] text-body">Outstanding</p>
          </div>
        </div>

        {fees.length === 0 ? (
          <p className="py-4 text-center text-xs text-body">No fee records found for this student.</p>
        ) : (
          <div className="divide-y divide-stroke dark:divide-strokedark">
            {[...grouped].map(([label, groupFees]) => (
              <div key={label}>
                {showHeadings && (
                  <p className="pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-body first:pt-0">
                    {label}
                  </p>
                )}
                {groupFees.map((fee) => (
                  <div key={fee._id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-xs text-black dark:text-white">
                        Paid: NLe {(fee.amountPaid ?? 0).toLocaleString()} / NLe {(fee.totalAmount ?? 0).toLocaleString()}
                      </p>
                      {fee.dueDate && (
                        <p className="text-[11px] text-body">
                          Due: {new Date(fee.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                      {fee.balance > 0 && (
                        <p className="text-[11px] font-medium text-meta-1">
                          NLe {(fee.balance ?? 0).toLocaleString()} outstanding
                        </p>
                      )}
                    </div>
                    <Badge variant={STATUS_VARIANT[fee.status] ?? "default"}>
                      {fee.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {fees.length > 0 && totalOutstanding === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-meta-3/30 bg-meta-3/10 px-3 py-2">
            <span className="text-xs font-medium text-meta-3">All fees paid — no outstanding balance.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ["parent-children"],
    queryFn: parentApi.getMyChildren,
  });

  const selectedChild: LinkedStudent | undefined =
    (children as LinkedStudent[]).find((c) => c._id === selectedChildId) ??
    (children as LinkedStudent[])[0];

  const childId = selectedChild?._id;

  const { data: attendance } = useQuery({
    queryKey: ["parent-attendance", childId],
    queryFn: () => parentApi.getChildAttendance(childId!),
    enabled: !!childId,
  });

  const { data: results = [] } = useQuery({
    queryKey: ["parent-results", childId],
    queryFn: () => parentApi.getChildResults(childId!),
    enabled: !!childId,
  });

  const { data: fees = [] } = useQuery({
    queryKey: ["parent-fees", childId],
    queryFn: () => parentApi.getChildFees(childId!),
    enabled: !!childId,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["parent-announcements"],
    queryFn: parentApi.getAnnouncements,
    refetchInterval: 60_000,
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ["parent-attendance-stats", childId],
    queryFn: () => parentApi.getChildAttendanceStats(childId!),
    enabled: !!childId,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: promotionData } = useQuery<ChildPromotionHistory>({
    queryKey: ["parent-promotion-history", childId],
    queryFn: () => parentApi.getChildPromotionHistory(childId!),
    enabled: !!childId,
  });

  // Show banner if most recent promotion was within the last 60 days
  const latestPromotion = promotionData?.history?.[0] ?? null;
  const isRecentPromotion =
    latestPromotion &&
    Date.now() - new Date(latestPromotion.promotedAt).getTime() < 60 * 24 * 60 * 60 * 1000;

  const outstandingFees = (fees as { balance: number; status: string }[]).filter(
    (f) => f.status !== "paid"
  );
  const totalOutstanding = outstandingFees.reduce((s, f) => s + f.balance, 0);

  const className =
    selectedChild?.class && typeof selectedChild.class === "object"
      ? selectedChild.class.name
      : "—";

  if (childrenLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  if ((children as LinkedStudent[]).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-body" />
        <p className="text-sm font-medium text-black dark:text-white">No children linked</p>
        <p className="text-xs text-body">Contact your school administrator to link your children to this account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-black dark:text-white">
          Welcome, {user?.fullName}
        </h1>
        <p className="text-sm text-body">Parent portal — read-only view of your children's data</p>
      </div>

      {/* Child selector */}
      {(children as LinkedStudent[]).length > 1 && (
        <div className="flex flex-wrap gap-2">
          {(children as LinkedStudent[]).map((child) => {
            const childClass =
              child.class && typeof child.class === "object" ? child.class.name : null;
            return (
              <button
                key={child._id}
                onClick={() => setSelectedChildId(child._id)}
                className={[
                  "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                  selectedChild?._id === child._id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-stroke text-body hover:border-primary hover:text-primary dark:border-strokedark",
                ].join(" ")}
              >
                <GraduationCap className="h-4 w-4 shrink-0" />
                <span className="flex flex-col items-start leading-tight">
                  <span>{child.fullName}</span>
                  {childClass && (
                    <span className="text-[11px] font-normal opacity-70">{childClass}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected child info */}
      {selectedChild && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {selectedChild.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-black dark:text-white">{selectedChild.fullName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    <GraduationCap className="h-3 w-3" />
                    {className}
                  </span>
                  {selectedChild.studentProfile?.registrationNumber && (
                    <span className="text-xs text-body">
                      Reg: {selectedChild.studentProfile.registrationNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's absence alert */}
      {attendanceStats?.todayStatus?.status === "absent" && (
        <div className="flex items-start gap-3 rounded-xl border border-meta-1/40 bg-meta-1/10 px-4 py-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-meta-1/20">
            <AlertTriangle className="h-4 w-4 text-meta-1" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-meta-1">Absence Alert — Today</p>
            <p className="text-xs text-body mt-0.5">
              {selectedChild?.fullName ?? "Your child"} was marked absent
              {attendanceStats.todayStatus.className ? ` from ${attendanceStats.todayStatus.className}` : ""}
              {attendanceStats.todayStatus.date
                ? ` on ${new Date(attendanceStats.todayStatus.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`
                : " today"}.
              Please contact the school if this is unexpected.
            </p>
          </div>
          <a
            href={`/parent/attendance?child=${childId}`}
            className="shrink-0 text-xs text-meta-1 underline hover:no-underline"
          >
            View
          </a>
        </div>
      )}

      {/* Promotion banner */}
      {isRecentPromotion && latestPromotion && (
        <div className="flex items-center gap-3 rounded-xl border border-meta-3/40 bg-meta-3/10 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-3/20">
            <Sparkles className="h-4 w-4 text-meta-3" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-meta-3">
              {selectedChild?.fullName.split(" ")[0]} was promoted!
            </p>
            <p className="text-xs text-body flex items-center gap-1 flex-wrap">
              <span>{latestPromotion.fromClass?.name ?? "Previous class"}</span>
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span className="font-medium text-black dark:text-white">{latestPromotion.toClass?.name ?? "New class"}</span>
              <span>·</span>
              <span>{new Date(latestPromotion.promotedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </p>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<CalendarCheck className="h-5 w-5 text-meta-3" />}
          label="Attendance"
          value={attendance ? `${attendance.rate}%` : "—"}
          sub={attendance ? `${attendance.present}/${attendance.total} days` : "Loading…"}
          color="bg-meta-3/10"
        />
        <StatCard
          icon={<FileText className="h-5 w-5 text-primary" />}
          label="Subjects"
          value={String((results as unknown[]).length)}
          sub="Results available"
          color="bg-primary/10"
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5 text-meta-1" />}
          label="Outstanding"
          value={`NLe ${totalOutstanding.toLocaleString()}`}
          sub={outstandingFees.length > 0 ? `${outstandingFees.length} unpaid` : "All clear"}
          color="bg-meta-1/10"
        />
        <StatCard
          icon={<Megaphone className="h-5 w-5 text-meta-5" />}
          label="Announcements"
          value={String((announcements as unknown[]).length)}
          sub="From school"
          color="bg-meta-5/10"
        />
      </div>

      {/* Quick links */}
      {selectedChild && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <QuickLink
            href={`/parent/attendance?child=${selectedChild._id}`}
            icon={<CalendarCheck className="h-5 w-5 text-meta-3" />}
            title="Attendance"
            description="View attendance records and rate"
          />
          <QuickLink
            href={`/parent/results?child=${selectedChild._id}`}
            icon={<FileText className="h-5 w-5 text-primary" />}
            title="Results"
            description="Exam results and subject grades"
          />
          <QuickLink
            href={`/parent/fees?child=${selectedChild._id}`}
            icon={<CreditCard className="h-5 w-5 text-meta-1" />}
            title="Fees"
            description="Fee balance and payment status"
          />
        </div>
      )}

      {/* Fee history */}
      <FeeHistoryCard fees={fees as FeeRecord[]} childId={childId} />

      {/* Academic Calendar */}
      <AcademicCalendarWidget />

      {/* Recent announcements */}
      {(announcements as { _id: string; title: string; content: string; createdAt: string }[]).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-body" />
              <span className="text-sm font-semibold text-black dark:text-white">Recent Announcements</span>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-stroke dark:divide-strokedark">
            {(announcements as { _id: string; title: string; content: string; createdAt: string }[])
              .slice(0, 5)
              .map((a) => (
                <div key={a._id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-black dark:text-white">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-body">{a.content}</p>
                  <p className="mt-1 text-[10px] text-body">
                    {new Date(a.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
          {icon}
        </div>
        <p className="text-lg font-bold text-black dark:text-white">{value}</p>
        <p className="text-xs font-medium text-black dark:text-white">{label}</p>
        <p className="text-[11px] text-body">{sub}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-stroke p-4 transition-colors hover:border-primary hover:bg-primary/5 dark:border-strokedark"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stroke dark:bg-strokedark">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-black dark:text-white">{title}</p>
        <p className="text-xs text-body">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-body" />
    </Link>
  );
}
