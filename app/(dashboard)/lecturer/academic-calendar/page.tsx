"use client";

import { useQuery } from "@tanstack/react-query";
import { calendarApi } from "@/lib/api/academicCalendar";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CalendarDays } from "lucide-react";
import type { CalendarEvent, CalendarEventType } from "@/lib/types";

function eventVariant(type: CalendarEventType): "danger" | "warning" | "success" | "info" | "default" {
  switch (type) {
    case "holiday": return "danger";
    case "exam": return "warning";
    case "term-start": return "success";
    case "term-end": return "success";
    case "event": return "info";
    default: return "default";
  }
}

function eventTypeLabel(type: CalendarEventType) {
  const map: Record<CalendarEventType, string> = {
    holiday: "Holiday",
    exam: "Exam",
    event: "Event",
    "term-start": "Term Start",
    "term-end": "Term End",
    other: "Other",
  };
  return map[type];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LecturerCalendarPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: calendarApi.getAll,
  });

  const sorted = [...(events as CalendarEvent[])].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const upcoming = sorted.filter((e) => new Date(e.endDate) >= new Date());
  const past = sorted.filter((e) => new Date(e.endDate) < new Date());

  function EventList({ list, label }: { list: CalendarEvent[]; label: string }) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-black dark:text-white">{label}</h2>
          <p className="text-xs text-body">{list.length} event{list.length !== 1 ? "s" : ""}</p>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="px-5 py-6 text-sm text-body">No events.</p>
          ) : (
            <ul className="divide-y divide-stroke dark:divide-strokedark">
              {list.map((event) => (
                <li key={event._id} className="flex items-start gap-3 px-5 py-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-black dark:text-white">{event.title}</p>
                      <Badge variant={eventVariant(event.type)}>{eventTypeLabel(event.type)}</Badge>
                    </div>
                    {event.description && (
                      <p className="mt-0.5 text-xs text-body">{event.description}</p>
                    )}
                    <p className="mt-1 text-xs text-body">
                      {formatDate(event.startDate)}
                      {event.startDate !== event.endDate && ` — ${formatDate(event.endDate)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-black dark:text-white">Academic Calendar</h1>
        <p className="text-sm text-body">School events, exams, and holidays</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-body">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <CalendarDays className="mb-4 h-14 w-14 text-stroke dark:text-strokedark" />
          <p className="text-sm text-body">No calendar events published yet.</p>
        </div>
      ) : (
        <>
          <EventList list={upcoming} label="Upcoming Events" />
          {past.length > 0 && <EventList list={past} label="Past Events" />}
        </>
      )}
    </div>
  );
}
