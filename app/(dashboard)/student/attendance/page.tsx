"use client";

import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/api/attendance";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CalendarCheck, UserCheck, UserX, BarChart2 } from "lucide-react";

interface AttendanceRecord {
  _id: string;
  class: { _id?: string; name: string } | null;
  subject: { _id: string; name: string; code?: string } | null;
  date: string;
  status: "present" | "absent" | null;
}

interface ClassSummary {
  className: string;
  totalClasses: number;
  present: number;
  absent: number;
  percentage: number;
}

function getVariant(pct: number): "success" | "warning" | "danger" {
  if (pct >= 75) return "success";
  if (pct >= 60) return "warning";
  return "danger";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StudentAttendancePage() {
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["my-attendance"],
    queryFn: attendanceApi.getMyAttendance,
  });

  const records: AttendanceRecord[] = Array.isArray(rawData) ? rawData : [];

  // Aggregate by class client-side
  const classMap = new Map<string, ClassSummary>();
  for (const r of records) {
    const name = r.class?.name ?? "Unknown";
    const existing = classMap.get(name) ?? {
      className: name,
      totalClasses: 0,
      present: 0,
      absent: 0,
      percentage: 0,
    };
    existing.totalClasses += 1;
    if (r.status === "present") existing.present += 1;
    else if (r.status === "absent") existing.absent += 1;
    existing.percentage =
      existing.totalClasses > 0
        ? Math.round((existing.present / existing.totalClasses) * 100)
        : 0;
    classMap.set(name, existing);
  }
  const summaries = Array.from(classMap.values());

  const overall = summaries.length
    ? Math.round(
        summaries.reduce((acc, s) => acc + s.percentage, 0) / summaries.length
      )
    : 0;
  const totalPresent = summaries.reduce((acc, s) => acc + s.present, 0);
  const totalAbsent = summaries.reduce((acc, s) => acc + s.absent, 0);
  const totalClasses = summaries.reduce((acc, s) => acc + s.totalClasses, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Overall Attendance" value={isLoading ? "—" : `${overall}%`} icon={BarChart2} color="blue" />
        <StatCard label="Total Classes" value={isLoading ? "—" : totalClasses} icon={CalendarCheck} color="emerald" />
        <StatCard label="Total Present" value={isLoading ? "—" : totalPresent} icon={UserCheck} color="emerald" />
        <StatCard label="Total Absent" value={isLoading ? "—" : totalAbsent} icon={UserX} color="red" />
      </div>

      {/* Per-class summary table */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-black dark:text-white">Attendance by Class</h2>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
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
                    <Th>Class</Th>
                    <Th>Present</Th>
                    <Th>Absent</Th>
                    <Th>Total</Th>
                    <Th>Attendance %</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {summaries.map((s) => (
                    <tr key={s.className}>
                      <Td>
                        <span className="font-medium text-black dark:text-white">{s.className}</span>
                      </Td>
                      <Td><span className="text-meta-3">{s.present}</span></Td>
                      <Td><span className="text-meta-1">{s.absent}</span></Td>
                      <Td>{s.totalClasses}</Td>
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

      {/* Per-record history */}
      {records.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">Attendance History</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Class</Th>
                    <Th>Subject</Th>
                    <Th>Status</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {records.map((r) => (
                    <tr key={r._id}>
                      <Td className="text-body">{formatDate(r.date)}</Td>
                      <Td>
                        <span className="font-medium text-black dark:text-white">
                          {r.class?.name ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-body">{r.subject?.name ?? "—"}</span>
                      </Td>
                      <Td>
                        <Badge variant={r.status === "present" ? "success" : r.status === "absent" ? "danger" : "default"}>
                          {r.status ?? "—"}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
