"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { parentApi } from "@/lib/api/parent";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Users,
  CalendarCheck,
  FileText,
  CreditCard,
  Megaphone,
  GraduationCap,
  ChevronRight,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { LinkedStudent } from "@/lib/types";
import type { ChildPromotionHistory } from "@/lib/api/parent";

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
          {(children as LinkedStudent[]).map((child) => (
            <button
              key={child._id}
              onClick={() => setSelectedChildId(child._id)}
              className={[
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                (selectedChild?._id === child._id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-stroke text-body hover:border-primary hover:text-primary dark:border-strokedark",
              ].join(" ")}
            >
              <GraduationCap className="h-4 w-4" />
              {child.fullName}
            </button>
          ))}
        </div>
      )}

      {/* Selected child info */}
      {selectedChild && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {selectedChild.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-black dark:text-white">{selectedChild.fullName}</p>
                <p className="text-sm text-body">Class: {className}</p>
                {selectedChild.studentProfile?.registrationNumber && (
                  <p className="text-xs text-body">
                    Reg: {selectedChild.studentProfile.registrationNumber}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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
