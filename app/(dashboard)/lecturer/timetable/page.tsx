"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { timetableApi } from "@/lib/api/timetable";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { CalendarRange, Clock } from "lucide-react";
import type { Class, WeekDay, TimetableEntry } from "@/lib/types";
import { useClassLabel } from "@/hooks/useClassLabel";

// Reuse lecturer's own classes endpoint
import { classApi } from "@/lib/api/class";

const DAYS: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function getSubjectName(s: TimetableEntry["subject"]) {
  return typeof s === "object" ? s.name : s;
}
function getLecturerName(l: TimetableEntry["lecturer"]) {
  return typeof l === "object" ? l.fullName : l;
}

export default function LecturerTimetablePage() {
  const [selectedClassId, setSelectedClassId] = useState("");
  const { label: classLabel } = useClassLabel();

  const { data: classes = [] } = useQuery({
    queryKey: ["lecturer-classes"],
    queryFn: classApi.getForLecturer,
  });

  const { data: timetable, isLoading } = useQuery({
    queryKey: ["timetable-class", selectedClassId],
    queryFn: () => timetableApi.getByClass(selectedClassId),
    enabled: !!selectedClassId,
  });

  const selectedClass = (classes as Class[]).find((c) => c._id === selectedClassId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-black dark:text-white">Timetable</h1>
        <p className="text-sm text-body">View weekly schedule for your classes</p>
      </div>

      {/* Class selector */}
      <Card>
        <CardContent>
          <label className="mb-1 block text-sm font-medium text-black dark:text-white">
            Select {classLabel}
          </label>
          <select
            className="w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white sm:w-80"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">-- Choose a {classLabel} --</option>
            {(classes as Class[]).map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {!selectedClassId && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarRange className="mb-4 h-14 w-14 text-stroke dark:text-strokedark" />
          <p className="text-sm font-medium text-black dark:text-white">No {classLabel} selected</p>
          <p className="text-xs text-body">Choose a {classLabel} to view its timetable</p>
        </div>
      )}

      {selectedClassId && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Weekly Timetable — {selectedClass?.name}
            </h2>
            <p className="text-xs text-body">Monday to Friday schedule</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-6 text-sm text-body">Loading timetable…</p>
            ) : !timetable || !timetable.entries || timetable.entries.length === 0 ? (
              <p className="py-6 text-sm text-body">No timetable published for this class yet.</p>
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
      )}
    </div>
  );
}
