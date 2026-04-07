"use client";

import { useQuery } from "@tanstack/react-query";
import { subjectApi } from "@/lib/api/subject";
import { submissionApi } from "@/lib/api/assignment";
import { attendanceApi } from "@/lib/api/attendance";
import { StatCard } from "@/components/ui/StatCard";
import AcademicTermBanner from "@/components/ui/AcademicTermBanner";
import AcademicCalendarWidget from "@/components/ui/AcademicCalendarWidget";
import { BookOpen, ClipboardList, CalendarCheck, CheckCircle } from "lucide-react";

export default function StudentDashboard() {
  const { data: subjects = [] } = useQuery({ queryKey: ["student-subjects"], queryFn: subjectApi.getForStudent });
  const { data: submissions = [] } = useQuery({ queryKey: ["my-submissions"], queryFn: submissionApi.getMine });
  const { data: attendanceRecords = [] } = useQuery({ queryKey: ["my-attendance"], queryFn: attendanceApi.getMyAttendance });

  const records = Array.isArray(attendanceRecords) ? attendanceRecords as { status: string }[] : [];
  const presentCount = records.filter((r) => r.status === "present").length;
  const overallAttendance = records.length
    ? Math.round((presentCount / records.length) * 100)
    : null;

  return (
    <div className="space-y-6">
      <AcademicTermBanner />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enrolled Subjects" value={subjects.length} icon={BookOpen} />
        <StatCard label="Submissions" value={submissions.length} icon={ClipboardList} />
        <StatCard label="Attendance" value={overallAttendance !== null ? `${overallAttendance}%` : "—"} icon={CalendarCheck} />
        <StatCard label="Completed" value={submissions.filter((s: { grade?: number }) => s.grade !== undefined).length} icon={CheckCircle} />
      </div>

      <AcademicCalendarWidget />
    </div>
  );
}
