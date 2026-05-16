"use client";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useModalKeydown } from "./shared";

interface Props {
  title: string;
  body?: string;
  itemLabel: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({ title, body, itemLabel, isPending, onCancel, onConfirm }: Props) {
  const titleId = "confirm-delete-title";
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  useModalKeydown(onCancel);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={trapRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark"
      >
        <h3 id={titleId} className="mb-2 text-sm font-semibold text-black dark:text-white">{title}</h3>
        <p className="mb-1 text-xs font-medium text-black dark:text-white">{itemLabel}</p>
        {body && <p className="mb-5 text-xs text-body">{body}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-stroke py-2 text-sm text-black hover:bg-stroke dark:border-strokedark dark:text-white dark:hover:bg-meta-4">Cancel</button>
          <button onClick={onConfirm} disabled={isPending} className="flex-1 rounded-lg bg-meta-1 py-2 text-sm font-medium text-white hover:bg-meta-1/90 disabled:opacity-60">
            {isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
