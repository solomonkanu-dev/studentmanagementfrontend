"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { AuthUser } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";
import { SelectField } from "./shared";

type Particular = { label: string; amount: number };
type FeeStructureOption = { _id: string; category: string; particulars: Particular[] };

interface Props {
  open: boolean;
  onClose: () => void;
  students: AuthUser[];
  onAssigned?: () => void;
}

export function AssignStudentModal({ open, onClose, students, onAssigned }: Props) {
  const [studentId, setStudentId] = useState("");
  const [structures, setStructures] = useState<FeeStructureOption[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load fee structures when student changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!studentId) { setStructures([]); setChecked(new Set()); return; }
    setLoadingStructures(true);
    setError(""); setSuccess("");
    adminApi.getFeeStructuresForStudent(studentId)
      .then((data) => {
        setStructures(data);
        // Pre-check all particulars by default
        const all = new Set<string>();
        data.forEach((s) => s.particulars.forEach((_, i) => all.add(`${s._id}-${i}`)));
        setChecked(all);
      })
      .catch(() => setError("Failed to load fee structures for this student."))
      .finally(() => setLoadingStructures(false));
  }, [studentId]);

  const toggleParticular = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectedParticulars: Particular[] = structures.flatMap((s) =>
    s.particulars
      .filter((_, i) => checked.has(`${s._id}-${i}`))
      .map((p) => ({ label: p.label, amount: p.amount }))
  );

  const mutation = useMutation({
    mutationFn: () => adminApi.assignFeeToStudent({ studentId, selectedParticulars }),
    onSuccess: () => { setSuccess("Fees assigned successfully."); setError(""); onAssigned?.(); },
    onError: (err: unknown) => { setError(errMsg(err, "Failed to assign fees")); setSuccess(""); },
  });

  const handleClose = () => {
    setStudentId(""); setStructures([]); setChecked(new Set());
    setError(""); setSuccess(""); onClose();
  };

  const total = selectedParticulars.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Modal open={open} onClose={handleClose} title="Assign Fees to Student">
      <div className="space-y-4">
        <SelectField
          label="Student *"
          value={studentId}
          onChange={(e) => { setStudentId(e.target.value); setSuccess(""); }}
        >
          <option value="">Select a student</option>
          {students.map((s) => <option key={s._id} value={s._id}>{s.fullName}</option>)}
        </SelectField>

        {loadingStructures && (
          <div className="flex items-center gap-2 text-xs text-body">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            Loading fee particulars…
          </div>
        )}

        {!loadingStructures && studentId && structures.length === 0 && (
          <p className="text-xs text-body">No fee structures found for this student.</p>
        )}

        {structures.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-body">
              Select Fee Particulars
            </p>
            {structures.map((s) => (
              <div key={s._id} className="rounded border border-stroke p-3 dark:border-strokedark space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-body">
                  {s.category === "all" ? "All Students" : s.category === "class" ? "Class" : "Student-specific"}
                </p>
                {s.particulars.map((p, i) => {
                  const key = `${s._id}-${i}`;
                  return (
                    <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded px-1 py-1 hover:bg-whiter dark:hover:bg-meta-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked.has(key)}
                          onChange={() => toggleParticular(key)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm text-black dark:text-white">{p.label}</span>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-black dark:text-white">
                        NLe {p.amount.toLocaleString()}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
            <div className="flex items-center justify-between rounded border border-stroke bg-whiter px-3 py-2 dark:border-strokedark dark:bg-meta-4">
              <span className="text-xs font-semibold text-black dark:text-white">Total</span>
              <span className="text-sm font-bold text-primary">NLe {total.toLocaleString()}</span>
            </div>
          </div>
        )}

        {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
        {success && <p className="rounded-md bg-meta-3/10 px-3 py-2 text-xs text-meta-3">{success}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Close</Button>
          <Button
            onClick={() => { setError(""); setSuccess(""); mutation.mutate(); }}
            isLoading={mutation.isPending}
            disabled={!studentId || selectedParticulars.length === 0 || !!success}
          >
            Assign Fees ({selectedParticulars.length})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
