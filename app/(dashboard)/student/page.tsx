"use client";

import { useQuery } from "@tanstack/react-query";
import { subjectApi } from "@/lib/api/subject";
import { submissionApi } from "@/lib/api/assignment";
import { StatCard } from "@/components/ui/StatCard";
import { BookOpen, ClipboardList, CalendarCheck, CheckCircle } from "lucide-react";

export default function StudentDashboard() {
  const { data: subjects = [] } = useQuery({ queryKey: ["student-subjects"], queryFn: subjectApi.getForStudent });
  const { data: submissions = [] } = useQuery({ queryKey: ["my-submissions"], queryFn: submissionApi.getMine });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enrolled Subjects" value={subjects.length} icon={BookOpen} color="blue" />
        <StatCard label="Submissions" value={submissions.length} icon={ClipboardList} color="emerald" />
        <StatCard label="Attendance" value="—" icon={CalendarCheck} color="amber" />
        <StatCard label="Completed" value={submissions.filter((s: { grade?: number }) => s.grade !== undefined).length} icon={CheckCircle} color="slate" />
      </div>
    </div>
  );
}
