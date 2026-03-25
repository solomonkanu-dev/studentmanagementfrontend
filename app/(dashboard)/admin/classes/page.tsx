"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { classApi } from "@/lib/api/class";
import { adminApi } from "@/lib/api/admin";
import CardDataStats from "@/components/ui/CardDataStats";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  School,
  GraduationCap,
  Users,
  ArrowRight,
} from "lucide-react";
import type { Class, AuthUser } from "@/lib/types";

export default function ClassesOverview() {
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classApi.getAll,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const totalClasses = classes.length;
  const totalStudents = students.length;
  const avgStudents =
    totalClasses > 0
      ? Math.round(totalStudents / totalClasses)
      : 0;

  // Classes sorted by student count (largest first)
  const classBySize = [...classes]
    .map((c: Class) => ({
      ...c,
      studentCount: Array.isArray(c.students) ? c.students.length : 0,
    }))
    .sort((a, b) => b.studentCount - a.studentCount);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardDataStats
          title="Total Classes"
          total={String(totalClasses)}
          rate=""
          levelUp
        >
          <School className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Total Students"
          total={String(totalStudents)}
          rate=""
          levelUp
        >
          <GraduationCap className="h-6 w-6 text-meta-3" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Avg Students/Class"
          total={String(avgStudents)}
          rate=""
          levelUp
        >
          <Users className="h-6 w-6 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
        </CardDataStats>
      </div>

      {/* Class breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Class Breakdown
            </h2>
            <Link
              href="/admin/classes/list"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Manage classes
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {classBySize.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <School className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm text-body">No classes created yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stroke dark:divide-strokedark">
              {classBySize.map(
                (c: Class & { studentCount: number }) => {
                  const pct =
                    totalStudents > 0
                      ? Math.round((c.studentCount / totalStudents) * 100)
                      : 0;
                  return (
                    <li key={c._id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                            {c.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-black dark:text-white">
                            {c.name}
                          </span>
                        </div>
                        <Badge variant="default">
                          {c.studentCount} student
                          {c.studentCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-stroke dark:bg-strokedark">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                }
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
