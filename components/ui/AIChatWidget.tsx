"use client";

import { useState } from "react";
import { MessageCircle, X, Bot, ChevronDown } from "lucide-react";
import { AIConversation } from "@/components/ui/AIConversation";

/** Accent colour sets — full class strings so Tailwind's purge keeps them. */
const ACCENT = {
  primary: {
    fab: "bg-primary hover:bg-opacity-90",
    iconBg: "bg-primary/10",
    iconText: "text-primary",
  },
  "meta-5": {
    fab: "bg-meta-5 hover:bg-opacity-90",
    iconBg: "bg-meta-5/10",
    iconText: "text-meta-5",
  },
} as const;

export interface AIChatWidgetProps {
  endpoint: string;
  title: string;
  subtitle: string;
  intro: string;
  suggestedPrompts: string[];
  placeholder: string;
  /** Used in aria-labels, e.g. "admin assistant". */
  ariaName: string;
  accent: keyof typeof ACCENT;
}

/**
 * Floating AI assistant launcher + panel. The conversation itself lives in
 * AIConversation, shared with the dedicated AI Assistant page.
 */
export function AIChatWidget({
  endpoint,
  title,
  subtitle,
  intro,
  suggestedPrompts,
  placeholder,
  ariaName,
  accent,
}: AIChatWidgetProps) {
  const accentCls = ACCENT[accent];
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating launcher button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? `Close ${ariaName}` : `Open ${ariaName}`}
        className={[
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          open ? "bg-meta-1 hover:bg-opacity-90" : accentCls.fab,
        ].join(" ")}
      >
        {open ? (
          <ChevronDown className="h-6 w-6 text-white" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" aria-hidden="true" />
        )}
      </button>

      {/* Chat panel */}
      <div
        className={[
          "fixed bottom-24 right-6 z-50 flex w-[440px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-stroke bg-white shadow-2xl transition-all duration-200 dark:border-strokedark dark:bg-boxdark",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        ].join(" ")}
        style={{ height: "600px" }}
        role="dialog"
        aria-label={`AI ${ariaName}`}
        aria-modal="false"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${accentCls.iconBg}`}
            >
              <Bot
                className={`h-4 w-4 ${accentCls.iconText}`}
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-black dark:text-white">
                {title}
              </p>
              <p className="text-[10px] text-meta-3">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="flex h-9 w-9 items-center justify-center rounded-md text-body transition-colors hover:text-black dark:hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Conversation */}
        <AIConversation
          endpoint={endpoint}
          intro={intro}
          suggestedPrompts={suggestedPrompts}
          placeholder={placeholder}
          active={open}
        />
      </div>
    </>
  );
}
