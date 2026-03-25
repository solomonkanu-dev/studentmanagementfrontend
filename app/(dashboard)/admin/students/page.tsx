"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { classApi } from "@/lib/api/class";
import CardDataStats from "@/components/ui/CardDataStats";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  GraduationCap,
  UserCheck,
  Clock,
  ArrowRight,
  School,
} from "lucide-react";
import type { AuthUser, Class } from "@/lib/types";

export default function StudentsOverview() {
  const { data: students = [] } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classApi.getAll,
  });

  const total = students.length;
  const active = students.filter((s: AuthUser) => s.approved).length;
  const pending = total - active;

  // Students per class breakdown
  const classBreakdown = classes.map((c: Class) => ({
    name: c.name,
    count: Array.isArray(c.students) ? c.students.length : 0,
  }));

  // Recent additions (last 5)
  const recent = [...students]
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
          title="Total Students"
          total={String(total)}
          rate=""
          levelUp
        >
          <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
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
          title="Pending Approval"
          total={String(pending)}
          rate=""
          levelUp={false}
        >
          <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
        </CardDataStats>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Students per class */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Students per Class
              </h2>
              <School className="h-4 w-4 text-body" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {classBreakdown.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <School className="h-8 w-8 text-body" aria-hidden="true" />
                <p className="text-sm text-body">No classes yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {classBreakdown.map(
                  (item: { name: string; count: number }) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between px-5 py-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                          {item.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-black dark:text-white">
                          {item.name}
                        </span>
                      </div>
                      <Badge variant="default">
                        {item.count} student{item.count !== 1 ? "s" : ""}
                      </Badge>
                    </li>
                  )
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent students */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Recent Students
              </h2>
              <Link
                href="/admin/students/list"
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
                <GraduationCap
                  className="h-8 w-8 text-body"
                  aria-hidden="true"
                />
                <p className="text-sm text-body">No students yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-strokedark">
                {recent.map((s: AuthUser) => (
                  <li key={s._id}>
                    <Link
                      href={`/admin/students/${s._id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                          {s.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-black dark:text-white">
                            {s.fullName}
                          </p>
                          <p className="text-xs text-body">{s.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={s.approved ? "success" : "warning"}>
                          {s.approved ? "Active" : "Pending"}
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-body" aria-hidden="true" />
                      </div>
                    </Link>
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
