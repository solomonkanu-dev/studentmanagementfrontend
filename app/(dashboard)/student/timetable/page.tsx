"use client";

import { useQuery } from "@tanstack/react-query";
import { timetableApi } from "@/lib/api/timetable";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { CalendarRange, Clock } from "lucide-react";
import type { WeekDay, TimetableEntry } from "@/lib/types";

const DAYS: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function getSubjectName(s: TimetableEntry["subject"]) {
  return typeof s === "object" ? s.name : s;
}
function getLecturerName(l: TimetableEntry["lecturer"]) {
  return typeof l === "object" ? l.fullName : l;
}

export default function StudentTimetablePage() {
  const { user } = useAuth();
  const classId = typeof user?.class === "object"
    ? (user.class as { _id: string })._id
    : user?.class;

  const { data: timetable, isLoading } = useQuery({
    queryKey: ["timetable-class", classId],
    queryFn: () => timetableApi.getByClass(classId!),
    enabled: !!classId,
  });

  if (!classId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarRange className="mb-4 h-14 w-14 text-stroke dark:text-strokedark" />
        <p className="text-sm text-body">You are not enrolled in a class yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-black dark:text-white">My Timetable</h1>
        <p className="text-sm text-body">Your weekly class schedule</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-black dark:text-white">Weekly Schedule</h2>
          <p className="text-xs text-body">Monday to Friday</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-sm text-body">Loading timetable…</p>
          ) : !timetable?.entries?.length ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CalendarRange className="mb-3 h-10 w-10 text-stroke dark:text-strokedark" />
              <p className="text-sm text-body">No timetable published for your class yet.</p>
              <p className="text-xs text-body">Check back later or contact your admin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {DAYS.map((day) => {
                const dayEntries = timetable.entries
                  .filter((e) => e.day === day)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <div key={day} className="overflow-hidden rounded border border-stroke dark:border-strokedark">
                    <div className="border-b border-stroke bg-meta-2 px-3 py-2 dark:border-strokedark dark:bg-meta-4">
                      <p className="text-xs font-semibold text-black dark:text-white">{day}</p>
                      <p className="text-[10px] text-body">{dayEntries.length} slot{dayEntries.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="divide-y divide-stroke dark:divide-strokedark">
                      {dayEntries.length === 0 ? (
                        <p className="px-3 py-4 text-xs text-body">No classes</p>
                      ) : (
                        dayEntries.map((entry, i) => (
                          <div key={i} className="px-3 py-2.5">
                            <div className="flex items-start gap-2">
                              <Clock className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-black dark:text-white">
                                  {getSubjectName(entry.subject)}
                                </p>
                                <p className="text-[10px] text-primary">
                                  {entry.startTime} – {entry.endTime}
                                </p>
                                <p className="truncate text-[10px] text-body">
                                  {getLecturerName(entry.lecturer)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
