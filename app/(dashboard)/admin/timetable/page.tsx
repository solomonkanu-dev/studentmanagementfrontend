"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { timetableApi } from "@/lib/api/timetable";
import { errMsg } from "@/lib/utils/errMsg";
import { adminApi } from "@/lib/api/admin";
import { subjectApi } from "@/lib/api/subject";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { CalendarRange, Plus, Edit2, Trash2, Save, X, Clock } from "lucide-react";
import type { Class, Subject, AuthUser, WeekDay, TimetableEntry } from "@/lib/types";
import { useClassLabel } from "@/hooks/useClassLabel";

const DAYS: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const slotSchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
  startTime: z.string().min(1, "Required"),
  endTime: z.string().min(1, "Required"),
  subjectId: z.string().min(1, "Select a subject"),
  lecturerId: z.string().min(1, "Select a teacher"),
});
type SlotForm = z.infer<typeof slotSchema>;

function getSubjectName(s: TimetableEntry["subject"]) {
  return typeof s === "object" ? s.name : s;
}
function getLecturerName(l: TimetableEntry["lecturer"]) {
  return typeof l === "object" ? l.fullName : l;
}

export default function AdminTimetablePage() {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [localEntries, setLocalEntries] = useState<TimetableEntry[]>([]);
  const [saveError, setSaveError] = useState("");
  const queryClient = useQueryClient();
  const { label: classLabel } = useClassLabel();

  const { data: classes = [] } = useQuery({ queryKey: ["admin-classes"], queryFn: adminApi.getClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["admin-subjects"], queryFn: subjectApi.getAll });
  const { data: lecturers = [] } = useQuery({ queryKey: ["admin-lecturers"], queryFn: adminApi.getLecturers });

  const { data: timetable, isLoading } = useQuery({
    queryKey: ["timetable-class", selectedClassId],
    queryFn: () => timetableApi.getByClass(selectedClassId),
    enabled: !!selectedClassId,
  });

  const selectedClass = (classes as Class[]).find((c) => c._id === selectedClassId);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SlotForm>({
    resolver: zodResolver(slotSchema),
    defaultValues: { day: "Monday" },
  });
  const watchDay = watch("day");

  const classSubjects = (subjects as Subject[]).filter((s) => {
    const id = typeof s.class === "object" ? (s.class as { _id: string })._id : s.class;
    return id === selectedClassId;
  });
  const subjectOptions = classSubjects.length > 0 ? classSubjects : (subjects as Subject[]);

  const createMutation = useMutation({
    mutationFn: (entries: Omit<TimetableEntry, "_id">[]) =>
      timetableApi.create({ classId: selectedClassId, entries }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable-class", selectedClassId] });
      setEditMode(false);
      setLocalEntries([]);
      setSaveError("");
    },
    onError: (err) => setSaveError(errMsg(err, "Failed to save timetable")),
  });

  const updateMutation = useMutation({
    mutationFn: (entries: TimetableEntry[]) =>
      timetableApi.update(timetable!._id, { entries }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable-class", selectedClassId] });
      setEditMode(false);
      setLocalEntries([]);
      setSaveError("");
    },
    onError: (err) => setSaveError(errMsg(err, "Failed to save timetable")),
  });

  const handleStartEdit = () => {
    setLocalEntries(timetable?.entries ? [...timetable.entries] : []);
    setEditMode(true);
  };

  const openAddModal = (day: WeekDay) => {
    setEditingEntry(null);
    setValue("day", day);
    setValue("startTime", "");
    setValue("endTime", "");
    setValue("subjectId", "");
    setValue("lecturerId", "");
    setShowModal(true);
  };

  const openEditModal = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setValue("day", entry.day);
    setValue("startTime", entry.startTime);
    setValue("endTime", entry.endTime);
    setValue("subjectId", typeof entry.subject === "object" ? entry.subject._id : entry.subject);
    setValue("lecturerId", typeof entry.lecturer === "object" ? entry.lecturer._id : entry.lecturer);
    setShowModal(true);
  };

  const handleDeleteSlot = (entry: TimetableEntry) => {
    setLocalEntries((prev) => prev.filter((e) => e !== entry));
  };

  const onSlotSubmit = (values: SlotForm) => {
    const subject = subjectOptions.find((s) => s._id === values.subjectId);
    const lecturer = (lecturers as AuthUser[]).find((l) => l._id === values.lecturerId);
    if (!subject || !lecturer) return;

    const newEntry: TimetableEntry = {
      day: values.day,
      startTime: values.startTime,
      endTime: values.endTime,
      subject: { _id: subject._id, name: subject.name },
      lecturer: { _id: lecturer._id, fullName: lecturer.fullName },
    };

    if (editingEntry) {
      setLocalEntries((prev) => prev.map((e) => (e === editingEntry ? newEntry : e)));
    } else {
      setLocalEntries((prev) => [...prev, newEntry]);
    }
    setShowModal(false);
    reset({ day: "Monday" });
  };

  const handleSave = () => {
    if (timetable) {
      updateMutation.mutate(localEntries);
    } else {
      createMutation.mutate(localEntries);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setLocalEntries([]);
  };

  const displayEntries = editMode ? localEntries : (timetable?.entries ?? []);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-black dark:text-white">Timetable Management</h1>
        <p className="text-sm text-body">Create and manage weekly class schedules</p>
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
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setEditMode(false);
              setLocalEntries([]);
            }}
          >
            <option value="">-- Choose a {classLabel} --</option>
            {(classes as Class[]).map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Empty state */}
      {!selectedClassId && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarRange className="mb-4 h-14 w-14 text-stroke dark:text-strokedark" />
          <p className="text-sm font-medium text-black dark:text-white">No {classLabel} selected</p>
          <p className="text-xs text-body">Choose a {classLabel} above to view or edit its timetable</p>
        </div>
      )}

      {/* Timetable */}
      {selectedClassId && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-black dark:text-white">
                  Weekly Timetable — {selectedClass?.name}
                </h2>
                <p className="text-xs text-body">Monday to Friday schedule</p>
              </div>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="mr-1 h-3.5 w-3.5" /> Cancel
                    </Button>
                    <Button size="sm" onClick={() => { setSaveError(""); handleSave(); }} disabled={isSaving}>
                      <Save className="mr-1 h-3.5 w-3.5" />
                      {isSaving ? "Saving…" : "Save Timetable"}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={handleStartEdit}>
                    <Edit2 className="mr-1 h-3.5 w-3.5" />
                    {timetable ? "Edit Timetable" : "Create Timetable"}
                  </Button>
                )}
              </div>
            </div>
            {saveError && (
              <p className="mt-2 rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{saveError}</p>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-6 text-sm text-body">Loading timetable…</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {DAYS.map((day) => {
                  const dayEntries = displayEntries
                    .filter((e) => e.day === day)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  return (
                    <div
                      key={day}
                      className="overflow-hidden rounded border border-stroke dark:border-strokedark"
                    >
                      {/* Day header */}
                      <div className="border-b border-stroke bg-meta-2 px-3 py-2 dark:border-strokedark dark:bg-meta-4">
                        <p className="text-xs font-semibold text-black dark:text-white">{day}</p>
                        <p className="text-[10px] text-body">{dayEntries.length} slot{dayEntries.length !== 1 ? "s" : ""}</p>
                      </div>

                      {/* Slots */}
                      <div className="divide-y divide-stroke dark:divide-strokedark">
                        {dayEntries.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-body">No classes</p>
                        ) : (
                          dayEntries.map((entry, i) => (
                            <div key={i} className="group relative px-3 py-2.5">
                              <div className="flex items-start gap-2">
                                <Clock className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                                <div className="min-w-0 flex-1">
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
                              {editMode && (
                                <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                                  <button
                                    onClick={() => openEditModal(entry)}
                                    className="rounded p-0.5 text-body transition-colors hover:text-primary"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSlot(entry)}
                                    className="rounded p-0.5 text-body transition-colors hover:text-meta-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}

                        {editMode && (
                          <button
                            onClick={() => openAddModal(day)}
                            className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-body transition-colors hover:text-primary"
                          >
                            <Plus className="h-3 w-3" />
                            Add slot
                          </button>
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

      {/* Add / Edit Slot Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset({ day: "Monday" }); }}
        title={editingEntry ? "Edit Slot" : `Add Slot — ${watchDay}`}
      >
        <form onSubmit={handleSubmit(onSlotSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-black dark:text-white">Day</label>
            <select
              {...register("day")}
              className="w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
            >
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.day && <p className="mt-1 text-xs text-meta-1">{errors.day.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-black dark:text-white">Start Time</label>
              <Input type="time" {...register("startTime")} />
              {errors.startTime && <p className="mt-1 text-xs text-meta-1">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black dark:text-white">End Time</label>
              <Input type="time" {...register("endTime")} />
              {errors.endTime && <p className="mt-1 text-xs text-meta-1">{errors.endTime.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black dark:text-white">Subject</label>
            <select
              {...register("subjectId")}
              className="w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
            >
              <option value="">-- Select Subject --</option>
              {subjectOptions.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
            {errors.subjectId && <p className="mt-1 text-xs text-meta-1">{errors.subjectId.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black dark:text-white">Teacher</label>
            <select
              {...register("lecturerId")}
              className="w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
            >
              <option value="">-- Select Teacher --</option>
              {(lecturers as AuthUser[]).map((l) => (
                <option key={l._id} value={l._id}>{l.fullName}</option>
              ))}
            </select>
            {errors.lecturerId && <p className="mt-1 text-xs text-meta-1">{errors.lecturerId.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => { setShowModal(false); reset({ day: "Monday" }); }}
            >
              Cancel
            </Button>
            <Button type="submit">{editingEntry ? "Update Slot" : "Add Slot"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
