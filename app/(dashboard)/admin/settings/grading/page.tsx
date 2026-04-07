"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gradingApi } from "@/lib/api/grading";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  GraduationCap, Plus, Trash2, Pencil, Star, StarOff, X,
} from "lucide-react";
import { errMsg } from "@/lib/utils/errMsg";
import type { GradingScale, GradeEntry } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_GRADES: GradeEntry[] = [
  { grade: "A+", minScore: 97, maxScore: 100 },
  { grade: "A",  minScore: 93, maxScore: 96  },
  { grade: "A-", minScore: 90, maxScore: 92  },
  { grade: "B+", minScore: 87, maxScore: 89  },
  { grade: "B",  minScore: 83, maxScore: 86  },
  { grade: "B-", minScore: 80, maxScore: 82  },
  { grade: "C+", minScore: 77, maxScore: 79  },
  { grade: "C",  minScore: 73, maxScore: 76  },
  { grade: "C-", minScore: 70, maxScore: 72  },
  { grade: "D",  minScore: 60, maxScore: 69  },
  { grade: "F",  minScore: 0,  maxScore: 59  },
];

function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "#10B981";
  if (g.startsWith("B")) return "#3C50E0";
  if (g.startsWith("C")) return "#F9C107";
  if (g.startsWith("D")) return "#FF9C55";
  return "#FA5252";
}

// ─── Grade rows editor (shared by create + edit) ──────────────────────────────

function GradeEditor({
  rows,
  onChange,
}: {
  rows: GradeEntry[];
  onChange: (rows: GradeEntry[]) => void;
}) {
  function update(i: number, field: keyof GradeEntry, value: string | number) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r));
    onChange(next);
  }

  function addRow() {
    onChange([...rows, { grade: "", minScore: 0, maxScore: 0 }]);
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-1 hidden grid-cols-[72px_1fr_80px_80px_32px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-body sm:grid">
        <span>Grade</span>
        <span></span>
        <span>Min %</span>
        <span>Max %</span>
        <span></span>
      </div>

      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[72px_1fr_80px_80px_32px] items-center gap-2"
          >
            {/* Grade letter */}
            <input
              type="text"
              value={row.grade}
              maxLength={3}
              placeholder="A+"
              onChange={(e) => update(i, "grade", e.target.value)}
              className="h-8 w-full rounded border border-stroke bg-transparent px-2 text-center text-sm font-bold text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
            />

            {/* Score preview bar */}
            <div className="relative h-3 overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: `${row.maxScore}%`,
                  backgroundColor: gradeColor(row.grade),
                  opacity: 0.3,
                }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: `${row.minScore}%`,
                  backgroundColor: gradeColor(row.grade),
                }}
              />
            </div>

            {/* Min */}
            <input
              type="number"
              value={row.minScore}
              min={0}
              max={100}
              onChange={(e) => update(i, "minScore", Number(e.target.value))}
              className="h-8 w-full rounded border border-stroke bg-transparent px-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
            />

            {/* Max */}
            <input
              type="number"
              value={row.maxScore}
              min={0}
              max={100}
              onChange={(e) => update(i, "maxScore", Number(e.target.value))}
              className="h-8 w-full rounded border border-stroke bg-transparent px-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
            />

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="flex h-7 w-7 items-center justify-center rounded text-body hover:bg-meta-1/10 hover:text-meta-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <Plus className="h-3.5 w-3.5" />
        Add grade row
      </button>
    </div>
  );
}

// ─── Scale preview card ───────────────────────────────────────────────────────

function ScaleCard({
  scale,
  onEdit,
  onDelete,
  onSetDefault,
  isSettingDefault,
}: {
  scale: GradingScale;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  isSettingDefault: boolean;
}) {
  return (
    <div
      className={[
        "rounded-sm border bg-white shadow-default transition-all dark:bg-boxdark",
        scale.isDefault
          ? "border-primary ring-1 ring-primary/20"
          : "border-stroke dark:border-strokedark",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-stroke px-5 py-3.5 dark:border-strokedark">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-black dark:text-white">{scale.name}</h3>
          {scale.isDefault && <Badge variant="success">Default</Badge>}
        </div>
        <div className="flex items-center gap-1">
          {!scale.isDefault && (
            <button
              onClick={onSetDefault}
              disabled={isSettingDefault}
              title="Set as default"
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-body hover:bg-meta-2 hover:text-primary transition-colors dark:hover:bg-meta-4"
            >
              <Star className="h-3.5 w-3.5" />
              Set default
            </button>
          )}
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-body hover:bg-meta-2 hover:text-primary transition-colors dark:hover:bg-meta-4"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {!scale.isDefault && (
            <button
              onClick={onDelete}
              className="rounded p-1.5 text-body hover:bg-meta-1/10 hover:text-meta-1 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grade chips */}
      <div className="flex flex-wrap gap-1.5 px-5 py-4">
        {scale.grades.map((g) => (
          <div
            key={g.grade}
            className="flex items-center gap-1.5 rounded border border-stroke px-2.5 py-1 dark:border-strokedark"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold text-white"
              style={{ backgroundColor: gradeColor(g.grade) }}
            >
              {g.grade}
            </span>
            <span className="text-xs text-body">{g.minScore}–{g.maxScore}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarksGradingPage() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["grading-scales"] });

  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<GradingScale | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GradingScale | null>(null);

  // Form state
  const [scaleName, setScaleName] = useState("");
  const [grades, setGrades] = useState<GradeEntry[]>(DEFAULT_GRADES);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const { data: scales = [], isLoading } = useQuery({
    queryKey: ["grading-scales"],
    queryFn: gradingApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: gradingApi.create,
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: unknown) => setFormError(errMsg(e, "Failed to create grading scale")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof gradingApi.update>[1] }) =>
      gradingApi.update(id, payload),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: unknown) => setFormError(errMsg(e, "Failed to update grading scale")),
  });

  const defaultMutation = useMutation({
    mutationFn: gradingApi.setDefault,
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: gradingApi.remove,
    onSuccess: () => { invalidate(); setDeleteTarget(null); setDeleteError(""); },
    onError: (e: unknown) => setDeleteError(errMsg(e, "Failed to delete scale")),
  });

  function openCreate() {
    setEditTarget(null);
    setScaleName("");
    setGrades(DEFAULT_GRADES);
    setFormError("");
    setMode("create");
  }

  function openEdit(scale: GradingScale) {
    setEditTarget(scale);
    setScaleName(scale.name);
    setGrades(scale.grades.length ? scale.grades : DEFAULT_GRADES);
    setFormError("");
    setMode("edit");
  }

  function closeModal() {
    setMode(null);
    setEditTarget(null);
    setFormError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!scaleName.trim()) { setFormError("Scale name is required"); return; }
    if (grades.length === 0) { setFormError("Add at least one grade row"); return; }
    const invalid = grades.find((g) => !g.grade.trim());
    if (invalid) { setFormError("All grade rows must have a grade letter"); return; }

    const payload = { name: scaleName.trim(), grades };
    if (mode === "create") {
      createMutation.mutate(payload);
    } else if (editTarget) {
      updateMutation.mutate({ id: editTarget._id, payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const list = scales as GradingScale[];

  return (
    <div className="space-y-5">
      <div className="rounded-sm border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary dark:border-primary/30 dark:bg-primary/10">
        Define how numeric scores map to letter grades. The <strong>default</strong> scale is used
        automatically when computing student results.
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-body">
          {list.length} scale{list.length !== 1 ? "s" : ""}
          {list.find((s) => s.isDefault) && " · 1 default"}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          New Scale
        </Button>
      </div>

      {/* Scale list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-black dark:text-white">No grading scales yet</p>
            <p className="mt-0.5 text-xs text-body">Create a scale to map scores to grade letters.</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Create First Scale
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {list.map((scale) => (
            <ScaleCard
              key={scale._id}
              scale={scale}
              onEdit={() => openEdit(scale)}
              onDelete={() => { setDeleteTarget(scale); setDeleteError(""); }}
              onSetDefault={() => defaultMutation.mutate(scale._id)}
              isSettingDefault={defaultMutation.isPending && defaultMutation.variables === scale._id}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={mode !== null}
        onClose={closeModal}
        title={mode === "create" ? "New Grading Scale" : "Edit Grading Scale"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scale name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black dark:text-white">Scale Name *</label>
            <input
              type="text"
              value={scaleName}
              onChange={(e) => setScaleName(e.target.value)}
              placeholder="e.g. Standard GPA, Semester Scale"
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
            />
          </div>

          {/* Grade rows */}
          <div className="rounded border border-stroke p-3 dark:border-strokedark">
            <GradeEditor rows={grades} onChange={setGrades} />
          </div>

          {formError && (
            <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" isLoading={isPending}>
              {mode === "create" ? "Create Scale" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => { setDeleteTarget(null); setDeleteError(""); }}
        title="Delete Grading Scale"
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            Delete <span className="font-semibold text-black dark:text-white">{deleteTarget?.name}</span>?
            This cannot be undone.
          </p>
          {deleteTarget?.isDefault && (
            <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">
              The default scale cannot be deleted. Set another scale as default first.
            </p>
          )}
          {deleteError && (
            <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{deleteError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setDeleteTarget(null); setDeleteError(""); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              disabled={deleteTarget?.isDefault}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
