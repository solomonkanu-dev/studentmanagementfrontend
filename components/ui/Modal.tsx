"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = "" }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={[
          "relative z-10 w-full max-w-md rounded-sm border border-stroke bg-white shadow-default",
          "dark:border-strokedark dark:bg-boxdark",
          "max-h-[90vh] overflow-y-auto",
          className,
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
          <h2 className="text-base font-semibold text-black dark:text-white">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0">
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
