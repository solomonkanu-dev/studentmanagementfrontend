"use client";

import { useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { AuthUser } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  students: AuthUser[];
  onAssigned?: () => void;
}

export function AssignAllStudentsModal({ open, onClose, students, onAssigned }: Props) {
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [result, setResult] = useState<{ assigned: number; skipped: number; failed: number } | null>(null);

  const handleAssign = async () => {
    setError(""); setResult(null);
    if (students.length === 0) { setError("No students found."); return; }
    setProgress({ processed: 0, total: students.length });
    let assigned = 0; let skipped = 0; let failed = 0;
    for (const student of students) {
      try {
        await adminApi.assignFeeToStudent({ studentId: student._id });
        assigned++;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409) skipped++; // already assigned
        else failed++;               // no structure, no class, etc.
      }
      setProgress({ processed: assigned + skipped + failed, total: students.length });
    }
    setProgress(null);
    setResult({ assigned, skipped, failed });
    if (assigned > 0) onAssigned?.();
  };

  const handleClose = () => { setError(""); setProgress(null); setResult(null); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Assign Fees to All Students">
      <div className="space-y-4">
        <p className="text-sm text-body">
          Generates fees for all{" "}
          <span className="font-semibold text-black dark:text-white">{students.length}</span>{" "}
          students based on their class fee structure.
        </p>
        {progress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-body">
              <span>Processing…</span>
              <span>{progress.processed} / {progress.total}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        {result && (
          <div className="rounded-md bg-meta-3/10 px-3 py-2 text-xs text-meta-3 space-y-0.5">
            <p>Done — {result.assigned} student{result.assigned !== 1 ? "s" : ""} newly assigned.</p>
            {result.skipped > 0 && (
              <p className="text-body">{result.skipped} already had fees assigned (skipped).</p>
            )}
            {result.failed > 0 && (
              <p className="text-meta-1">{result.failed} failed — these students may have no class or no applicable fee structure.</p>
            )}
          </div>
        )}
        {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button isLoading={!!progress} onClick={handleAssign}>
              Assign to All ({students.length})
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
