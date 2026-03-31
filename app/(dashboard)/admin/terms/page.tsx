"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { adminApi, type AcademicTerm } from "@/lib/api/admin";
import { CalendarDays, Plus, Star, Pencil, Trash2, Check, BookOpen } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TermFormValues = {
  name: string;
  type: "term" | "semester";
  academicYear: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function errMsg(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

function toDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : "";
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface TermModalProps {
  editing: AcademicTerm | null;
  onClose: () => void;
  onCreated: () => void;
}

function TermModal({ editing, onClose, onCreated }: TermModalProps) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TermFormValues>({
    defaultValues: editing
      ? {
          name: editing.name,
          type: editing.type,
          academicYear: editing.academicYear,
          startDate: toDateInput(editing.startDate),
          endDate: toDateInput(editing.endDate),
          isCurrent: editing.isCurrent,
        }
      : {
          name: "",
          type: "term",
          academicYear: "",
          startDate: "",
          endDate: "",
          isCurrent: false,
        },
  });

  const createMutation = useMutation({
    mutationFn: (values: TermFormValues) => adminApi.createTerm(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms"] });
      onCreated();
    },
    onError: (err) => setApiError(errMsg(err, "Failed to create term")),
  });

  const updateMutation = useMutation({
    mutationFn: (values: TermFormValues) => adminApi.updateTerm(editing!._id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms"] });
      onCreated();
    },
    onError: (err) => setApiError(errMsg(err, "Failed to update term")),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: TermFormValues) => {
    setApiError("");
    if (editing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h3 className="mb-5 text-base font-semibold text-black dark:text-white">
          {editing ? "Edit Term" : "Add Academic Term"}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black dark:text-white">
              Term Name <span className="text-meta-1">*</span>
            </label>
            <input
              {...register("name", { required: "Name is required" })}
              placeholder="e.g. First Term"
              className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
            />
            {errors.name && <p className="text-xs text-meta-1">{errors.name.message}</p>}
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black dark:text-white">Type</label>
            <select
              {...register("type")}
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            >
              <option value="term">Term</option>
              <option value="semester">Semester</option>
            </select>
          </div>

          {/* Academic Year */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black dark:text-white">
              Academic Year <span className="text-meta-1">*</span>
            </label>
            <input
              {...register("academicYear", { required: "Academic year is required" })}
              placeholder="e.g. 2024/2025"
              className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
            />
            {errors.academicYear && <p className="text-xs text-meta-1">{errors.academicYear.message}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-black dark:text-white">
                Start Date <span className="text-meta-1">*</span>
              </label>
              <input
                type="date"
                {...register("startDate", { required: "Start date is required" })}
                className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
              />
              {errors.startDate && <p className="text-xs text-meta-1">{errors.startDate.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-black dark:text-white">
                End Date <span className="text-meta-1">*</span>
              </label>
              <input
                type="date"
                {...register("endDate", { required: "End date is required" })}
                className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
              />
              {errors.endDate && <p className="text-xs text-meta-1">{errors.endDate.message}</p>}
            </div>
          </div>

          {/* isCurrent */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-black dark:text-white">
            <input type="checkbox" {...register("isCurrent")} className="h-4 w-4 rounded border-stroke" />
            Set as current term
          </label>

          {apiError && <p className="text-xs text-meta-1">{apiError}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded border border-stroke py-2 text-sm font-medium text-black transition-colors hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {isPending ? "Saving..." : editing ? "Save Changes" : "Create Term"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Term Card ────────────────────────────────────────────────────────────────

interface TermCardProps {
  term: AcademicTerm;
  onEdit: (term: AcademicTerm) => void;
  onDelete: (term: AcademicTerm) => void;
  onSetCurrent: (term: AcademicTerm) => void;
  isSettingCurrent: boolean;
}

function TermCard({ term, onEdit, onDelete, onSetCurrent, isSettingCurrent }: TermCardProps) {
  return (
    <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-black dark:text-white">{term.name}</span>
              <span
                className={[
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  term.type === "semester"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                ].join(" ")}
              >
                {term.type}
              </span>
              {term.isCurrent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-meta-3/10 px-2 py-0.5 text-xs font-medium text-meta-3">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Current
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-body">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {formatDate(term.startDate)} &mdash; {formatDate(term.endDate)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onSetCurrent(term)}
            disabled={term.isCurrent || isSettingCurrent}
            title="Set as current"
            className="rounded p-1.5 text-body transition-colors hover:bg-stroke hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-meta-4 dark:hover:text-white"
          >
            <Star className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onEdit(term)}
            title="Edit"
            className="rounded p-1.5 text-body transition-colors hover:bg-stroke hover:text-black dark:hover:bg-meta-4 dark:hover:text-white"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onDelete(term)}
            title="Delete"
            className="rounded p-1.5 text-body transition-colors hover:bg-meta-1/10 hover:text-meta-1"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TermsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [settingCurrentId, setSettingCurrentId] = useState<string | null>(null);

  const { data: terms = [], isLoading, error } = useQuery({
    queryKey: ["terms"],
    queryFn: adminApi.getTerms,
  });

  const deleteMutation = useMutation({
    mutationFn: (termId: string) => adminApi.deleteTerm(termId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["terms"] }),
  });

  const setCurrentMutation = useMutation({
    mutationFn: (termId: string) => adminApi.setCurrentTerm(termId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["terms"] });
      setSettingCurrentId(null);
    },
    onError: () => setSettingCurrentId(null),
  });

  const handleDelete = (term: AcademicTerm) => {
    if (!window.confirm(`Delete "${term.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(term._id);
  };

  const handleSetCurrent = (term: AcademicTerm) => {
    setSettingCurrentId(term._id);
    setCurrentMutation.mutate(term._id);
  };

  const handleEdit = (term: AcademicTerm) => {
    setEditingTerm(term);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingTerm(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingTerm(null);
  };

  // Group terms by academicYear, most recent year first
  const grouped = terms.reduce<Record<string, AcademicTerm[]>>((acc, term) => {
    if (!acc[term.academicYear]) acc[term.academicYear] = [];
    acc[term.academicYear].push(term);
    return acc;
  }, {});
  const sortedYears = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">Academic Terms</h1>
          <p className="mt-0.5 text-sm text-body">Manage terms and semesters for your institution</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Term
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-sm border border-meta-1/20 bg-meta-1/10 px-4 py-3 text-sm text-meta-1">
          Failed to load terms. Please refresh and try again.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && terms.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-sm border border-stroke bg-white py-16 dark:border-strokedark dark:bg-boxdark">
          <CalendarDays className="mb-3 h-10 w-10 text-body" aria-hidden="true" />
          <p className="text-sm font-medium text-black dark:text-white">No terms yet</p>
          <p className="mt-1 text-xs text-body">Click "Add Term" to create your first academic term.</p>
        </div>
      )}

      {/* Grouped list */}
      {!isLoading && sortedYears.map((year) => (
        <div key={year} className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-body">
            {year}
          </h2>
          <div className="flex flex-col gap-3">
            {grouped[year].map((term) => (
              <TermCard
                key={term._id}
                term={term}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSetCurrent={handleSetCurrent}
                isSettingCurrent={settingCurrentId === term._id}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Modal */}
      {modalOpen && (
        <TermModal
          editing={editingTerm}
          onClose={handleModalClose}
          onCreated={handleModalClose}
        />
      )}
    </div>
  );
}
