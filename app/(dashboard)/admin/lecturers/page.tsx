"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import CardDataStats from "@/components/ui/CardDataStats";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Users,
  UserCheck,
  UserX,
  ArrowRight,
} from "lucide-react";
import type { AuthUser } from "@/lib/types";

export default function LecturersOverview() {
  const { data: lecturers = [] } = useQuery({
    queryKey: ["admin-lecturers"],
    queryFn: adminApi.getLecturers,
  });

  const total = lecturers.length;
  const active = lecturers.filter((l: AuthUser) => l.isActive).length;
  const inactive = total - active;

  // Group by department
  const deptMap = new Map<string, number>();
  lecturers.forEach((l: AuthUser) => {
    const dept = l.lecturerProfile?.department ?? "Unassigned";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  });
  const departments = Array.from(deptMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Recent lecturers
  const recent = [...lecturers]
    .sort(
      (a: AuthUser, b: AuthUser) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardDataStats
          title="Total Teachers"
          total={String(total)}
          rate=""
          levelUp
        >
          <Users className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Active"
          total={String(active)}
          rate=""
          levelUp
        >
          <UserCheck className="h-6 w-6 text-meta-3" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Inactive"
          total={String(inactive)}
          rate=""
          levelUp={false}
        >
          <UserX className="h-6 w-6 text-meta-1" aria-hidden="true" />
        </CardDataStats>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By department */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              By Department
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            {departments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Users className="h-8 w-8 text-body" aria-hidden="true" />
                <p className="text-sm text-body">No Teacher yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {departments.map((dept) => (
                  <li
                    key={dept.name}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <span className="text-sm font-medium text-black dark:text-white">
                      {dept.name}
                    </span>
                    <Badge variant="default">
                      {dept.count} teacher{dept.count !== 1 ? "s" : ""}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent lecturers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Recent Teachers
              </h2>
              <Link
                href="/admin/lecturers/list"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Users className="h-8 w-8 text-body" aria-hidden="true" />
                <p className="text-sm text-body">No teachers yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {recent.map((l: AuthUser) => (
                  <li
                    key={l._id}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                        {l.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black dark:text-white">
                          {l.fullName}
                        </p>
                        <p className="text-xs text-body">
                          {l.lecturerProfile?.department ?? "No department"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={l.isActive ? "success" : "danger"}>
                      {l.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
