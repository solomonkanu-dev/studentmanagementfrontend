"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { calendarApi } from "@/lib/api/academicCalendar";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type { CalendarEvent, CalendarEventType } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function eventDotColor(type: CalendarEventType) {
  switch (type) {
    case "holiday":    return "bg-meta-1";
    case "exam":       return "bg-warning";
    case "term-start": return "bg-meta-3";
    case "term-end":   return "bg-meta-3";
    case "event":      return "bg-primary";
    default:           return "bg-body";
  }
}

function eventVariant(type: CalendarEventType): "danger" | "warning" | "success" | "info" | "default" {
  switch (type) {
    case "holiday":    return "danger";
    case "exam":       return "warning";
    case "term-start": return "success";
    case "term-end":   return "success";
    case "event":      return "info";
    default:           return "default";
  }
}

const TYPE_LABEL: Record<CalendarEventType, string> = {
  holiday:    "Holiday",
  exam:       "Exam",
  event:      "Event",
  "term-start": "Term Start",
  "term-end":   "Term End",
  other:      "Other",
};

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Returns the day-of-week index where Monday=0 … Sunday=6
function mondayFirst(date: Date) {
  return (date.getDay() + 6) % 7;
}

// All calendar dates (in YYYY-MM-DD) that a given event covers
function eventDates(event: CalendarEvent): Set<string> {
  const set = new Set<string>();
  const start = new Date(event.startDate);
  const end   = new Date(event.endDate);
  const cur   = new Date(start);
  while (cur <= end) {
    set.add(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return set;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AcademicCalendarWidget() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: calendarApi.getAll,
    staleTime: 5 * 60_000,
  });

  // Build a map: "YYYY-MM-DD" → CalendarEvent[]
  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events as CalendarEvent[]) {
      for (const d of eventDates(ev)) {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(ev);
      }
    }
    return map;
  }, [events]);

  // Events in the current visible month, excluding those whose end date has already passed
  const monthEvents = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const seen = new Set<string>();
    const out: CalendarEvent[] = [];
    for (const ev of events as CalendarEvent[]) {
      if (seen.has(ev._id)) continue;
      if (ev.endDate < todayStr) continue; // skip past events
      const start = ev.startDate.slice(0, 7);
      const end   = ev.endDate.slice(0, 7);
      if (start <= prefix && end >= prefix) {
        out.push(ev);
        seen.add(ev._id);
      }
    }
    return out.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [events, year, month, todayStr]);

  // Build the grid
  const firstDay    = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = mondayFirst(firstDay); // blank cells before day 1

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Academic Calendar</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="flex h-6 w-6 items-center justify-center rounded text-body transition-colors hover:bg-stroke hover:text-black dark:hover:bg-meta-4 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[110px] text-center text-xs font-semibold text-black dark:text-white">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="flex h-6 w-6 items-center justify-center rounded text-body transition-colors hover:bg-stroke hover:text-black dark:hover:bg-meta-4 dark:hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Day labels */}
        <div className="mb-1 grid grid-cols-7 text-center">
          {DAYS.map((d) => (
            <span key={d} className="text-[10px] font-semibold uppercase text-body">{d}</span>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;

            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventMap.get(dateStr) ?? [];
            const isToday   = dateStr === todayStr;

            // Unique event types for dots (max 3)
            const dotTypes = [...new Set(dayEvents.map(e => e.type))].slice(0, 3);

            return (
              <div
                key={i}
                className="group relative flex flex-col items-center py-0.5"
              >
                <span
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isToday
                      ? "bg-primary text-white"
                      : dayEvents.length > 0
                      ? "font-semibold text-black dark:text-white"
                      : "text-body",
                  ].join(" ")}
                >
                  {day}
                </span>

                {/* Event dots */}
                {dotTypes.length > 0 && (
                  <div className="mt-0.5 flex gap-0.5">
                    {dotTypes.map((type) => (
                      <span
                        key={type}
                        className={`h-1 w-1 rounded-full ${eventDotColor(type)}`}
                      />
                    ))}
                  </div>
                )}

                {/* Tooltip on hover */}
                {dayEvents.length > 0 && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-max max-w-[180px] -translate-x-1/2 rounded border border-stroke bg-white px-2 py-1.5 shadow-lg group-hover:block dark:border-strokedark dark:bg-boxdark">
                    {dayEvents.map((ev) => (
                      <p key={ev._id} className="text-[10px] font-medium text-black dark:text-white">
                        {ev.title}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-stroke pt-3 dark:border-strokedark">
          {[
            { type: "holiday" as CalendarEventType, label: "Holiday" },
            { type: "exam" as CalendarEventType, label: "Exam" },
            { type: "event" as CalendarEventType, label: "Event" },
            { type: "term-start" as CalendarEventType, label: "Term" },
          ].map(({ type, label }) => (
            <span key={type} className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${eventDotColor(type)}`} />
              <span className="text-[10px] text-body">{label}</span>
            </span>
          ))}
        </div>

        {/* This month's events list */}
        {monthEvents.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-stroke pt-3 dark:border-strokedark">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-body">
              {MONTHS[month]} events
            </p>
            {monthEvents.map((ev) => (
              <div key={ev._id} className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${eventDotColor(ev.type)}`} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-black dark:text-white">{ev.title}</p>
                    <p className="text-[10px] text-body">
                      {formatShortDate(ev.startDate)}
                      {ev.startDate !== ev.endDate && ` – ${formatShortDate(ev.endDate)}`}
                    </p>
                  </div>
                </div>
                <Badge variant={eventVariant(ev.type)} className="shrink-0 text-[9px]">
                  {TYPE_LABEL[ev.type]}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {monthEvents.length === 0 && (
          <p className="mt-3 border-t border-stroke pt-3 text-xs text-body dark:border-strokedark">
            No events this month.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
