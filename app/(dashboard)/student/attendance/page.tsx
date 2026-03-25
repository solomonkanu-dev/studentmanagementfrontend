"use client";

import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/api/attendance";
import { subjectApi } from "@/lib/api/subject";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CalendarCheck, UserCheck, UserX, BarChart2 } from "lucide-react";
import type { Subject } from "@/lib/types";

interface SubjectSummary {
  subjectId: string;
  subjectName: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

export default function StudentAttendancePage() {
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["my-attendance-summary"],
    queryFn: attendanceApi.getMySummary,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["student-subjects"],
    queryFn: subjectApi.getForStudent,
  });

  const summaries: SubjectSummary[] = Array.isArray(summaryData)
    ? summaryData
    : summaryData?.subjects ?? [];

  const overall = summaries.length
    ? Math.round(summaries.reduce((acc, s) => acc + s.percentage, 0) / summaries.length)
    : 0;

  const totalPresent = summaries.reduce((acc, s) => acc + s.present, 0);
  const totalAbsent = summaries.reduce((acc, s) => acc + s.absent, 0);

  function getVariant(pct: number): "success" | "warning" | "danger" {
    if (pct >= 75) return "success";
    if (pct >= 60) return "warning";
    return "danger";
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Overall Attendance" value={`${overall}%`} icon={BarChart2} color="blue" />
        <StatCard label="Subjects" value={(subjects as Subject[]).length} icon={CalendarCheck} color="emerald" />
        <StatCard label="Total Present" value={totalPresent} icon={UserCheck} color="emerald" />
        <StatCard label="Total Absent" value={totalAbsent} icon={UserX} color="red" />
      </div>

      {/* Per-subject table */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-black dark:text-white">Attendance by Subject</h2>
        </CardHeader>
        <CardContent className="p-0">
          {summaryLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            </div>
          ) : summaries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <CalendarCheck className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm text-body">No attendance records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <tr>
                    <Th>Subject</Th>
                    <Th>Present</Th>
                    <Th>Absent</Th>
                    <Th>Total</Th>
                    <Th>Attendance %</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {summaries.map((s) => (
                    <tr key={s.subjectId}>
                      <Td>
                        <span className="font-medium text-black dark:text-white">{s.subjectName}</span>
                      </Td>
                      <Td>
                        <span className="text-meta-3">{s.present}</span>
                      </Td>
                      <Td>
                        <span className="text-meta-1">{s.absent}</span>
                      </Td>
                      <Td>{s.total}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-stroke dark:bg-strokedark overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(s.percentage, 100)}%` }}
                            />
                          </div>
                          <Badge variant={getVariant(s.percentage)}>
                            {s.percentage}%
                          </Badge>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
