"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/superAdmin";
import CardDataStats from "@/components/ui/CardDataStats";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Building2,
  Users,
  GraduationCap,
  ShieldCheck,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { PendingAdmin } from "@/lib/types";

export default function SuperAdminDashboard() {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["super-stats"],
    queryFn: superAdminApi.getStats,
  });

  const { data: admins = [] } = useQuery({
    queryKey: ["pending-admins"],
    queryFn: superAdminApi.getPendingAdmins,
  });

  const approveMutation = useMutation({
    mutationFn: superAdminApi.approveAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-admins"] });
      queryClient.invalidateQueries({ queryKey: ["super-stats"] });
    },
  });

  const pendingAdmins = admins.filter((a: PendingAdmin) => !a.approved);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardDataStats
          title="Institutes"
          total={String(stats?.institutes?.total ?? "—")}
          rate=""
          levelUp
        >
          <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Admins"
          total={String(stats?.admins?.total ?? "—")}
          rate=""
          levelUp
        >
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Lecturers"
          total={String(stats?.lecturers?.total ?? "—")}
          rate=""
          levelUp
        >
          <Users className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Students"
          total={String(stats?.students?.total ?? "—")}
          rate=""
          levelUp
        >
          <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
      </div>

      {/* Pending requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Pending Admin Requests
              </h2>
              {pendingAdmins.length > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-meta-1 px-1.5 text-[10px] font-bold text-white">
                  {pendingAdmins.length}
                </span>
              )}
            </div>
            <Link
              href="/super-admin/admins"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {pendingAdmins.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ShieldCheck className="h-8 w-8 text-meta-3" aria-hidden="true" />
              <p className="text-sm text-body">All admin requests are approved.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stroke dark:divide-strokedark">
              {pendingAdmins.slice(0, 5).map((admin: PendingAdmin) => (
                <li
                  key={admin._id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                      {admin.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {admin.fullName}
                      </p>
                      <p className="text-xs text-body">{admin.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="warning">
                      <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                      Pending
                    </Badge>
                    <Button
                      size="sm"
                      isLoading={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(admin._id)}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Approve
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
