"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { calendarApi } from "@/lib/api/academicCalendar";
import { errMsg } from "@/lib/utils/errMsg";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CalendarDays, Plus, Edit2, Trash2 } from "lucide-react";
import type { CalendarEvent, CalendarEventType } from "@/lib/types";

const EVENT_TYPES: CalendarEventType[] = ["holiday", "exam", "event", "term-start", "term-end", "other"];

const eventSchema = z.object({
  title: z.string().min(2, "Title required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  type: z.enum(["holiday", "exam", "event", "term-start", "term-end", "other"]),
});
type EventForm = z.infer<typeof eventSchema>;

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

export default function AdminAcademicCalendarPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<CalendarEventType | "all">("all");
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);
  const [modalError, setModalError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: calendarApi.getAll,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { type: "event" },
  });

  const createMutation = useMutation({
    mutationFn: calendarApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setShowModal(false);
      setModalError("");
      reset();
    },
    onError: (err) => setModalError(errMsg(err, "Failed to create event")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<EventForm> }) =>
      calendarApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setShowModal(false);
      setEditingEvent(null);
      setModalError("");
      reset();
    },
    onError: (err) => setModalError(errMsg(err, "Failed to update event")),
  });

  const deleteMutation = useMutation({
    mutationFn: calendarApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setShowDeleteId(null);
      setDeleteError("");
    },
    onError: (err) => setDeleteError(errMsg(err, "Failed to delete event")),
  });

  const openAddModal = () => {
    setEditingEvent(null);
    reset({ type: "event" });
    setShowModal(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setValue("title", event.title);
    setValue("description", event.description ?? "");
    setValue("startDate", event.startDate.split("T")[0]);
    setValue("endDate", event.endDate.split("T")[0]);
    setValue("type", event.type);
    setShowModal(true);
  };

  const onSubmit = (values: EventForm) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent._id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const filtered = filterType === "all"
    ? (events as CalendarEvent[])
    : (events as CalendarEvent[]).filter((e) => e.type === filterType);

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">Academic Calendar</h1>
          <p className="text-sm text-body">Manage school events, exams, and holidays</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="mr-1 h-4 w-4" /> Add Event
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(["all", ...EVENT_TYPES] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filterType === t
                ? "bg-primary text-white"
                : "bg-stroke text-body hover:bg-primary/10 hover:text-primary dark:bg-strokedark dark:text-bodydark",
            ].join(" ")}
          >
            {t === "all" ? "All Events" : eventTypeLabel(t)}
          </button>
        ))}
      </div>

      {/* Events list */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-black dark:text-white">
            {filterType === "all" ? "All Events" : eventTypeLabel(filterType)}
          </h2>
          <p className="text-xs text-body">{sorted.length} event{sorted.length !== 1 ? "s" : ""}</p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="px-5 py-6 text-sm text-body">Loading…</p>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CalendarDays className="mb-3 h-10 w-10 text-stroke dark:text-strokedark" />
              <p className="text-sm text-body">No events yet.</p>
              <p className="text-xs text-body">Click &quot;Add Event&quot; to create the first one.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stroke dark:divide-strokedark">
              {sorted.map((event) => (
                <li key={event._id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="flex items-start gap-3">
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
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => openEditModal(event)}
                      className="rounded p-1.5 text-body transition-colors hover:text-primary"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setShowDeleteId(event._id)}
                      className="rounded p-1.5 text-body transition-colors hover:text-meta-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingEvent(null); reset(); }}
        title={editingEvent ? "Edit Event" : "Add Calendar Event"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-black dark:text-white">Title</label>
            <Input placeholder="e.g. Mid-Term Exams" {...register("title")} />
            {errors.title && <p className="mt-1 text-xs text-meta-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black dark:text-white">Type</label>
            <select
              {...register("type")}
              className="w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{eventTypeLabel(t)}</option>
              ))}
            </select>
            {errors.type && <p className="mt-1 text-xs text-meta-1">{errors.type.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-black dark:text-white">Start Date</label>
              <Input type="date" {...register("startDate")} />
              {errors.startDate && <p className="mt-1 text-xs text-meta-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black dark:text-white">End Date</label>
              <Input type="date" {...register("endDate")} />
              {errors.endDate && <p className="mt-1 text-xs text-meta-1">{errors.endDate.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black dark:text-white">Description (optional)</label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Brief description of the event…"
              className="w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
            />
          </div>

          {modalError && (
            <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{modalError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => { setShowModal(false); setEditingEvent(null); setModalError(""); reset(); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating ? "Saving…" : editingEvent ? "Update Event" : "Add Event"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      {showDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-80 rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-1 text-base font-semibold text-black dark:text-white">Delete Event?</h3>
            <p className="mb-5 text-sm text-body">This action cannot be undone.</p>
            {deleteError && (
              <p className="mb-3 rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => { setShowDeleteId(null); setDeleteError(""); }}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => deleteMutation.mutate(showDeleteId!)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
