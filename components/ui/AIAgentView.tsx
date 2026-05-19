"use client";

import { Brain, Zap, ShieldCheck } from "lucide-react";
import { AIConversation } from "@/components/ui/AIConversation";
import { AI_AGENTS, type AIAgentRole } from "@/components/ui/aiAgents";

/**
 * Full-page AI Agent — the dedicated nav destination.
 *
 * Unlike the floating chat widget (read-only quick chat) and AI Analytics
 * (one-shot reports with charts), this is the action-capable agent: it can
 * perform confirmation-gated tasks. The capabilities panel makes that explicit.
 */
export function AIAgentView({ role }: { role: AIAgentRole }) {
  const meta = AI_AGENTS[role];

  return (
    <div className="space-y-4">
      {/* Heading */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-black dark:text-white">
            AI Agent
          </h1>
          <p className="text-sm text-body">
            Your action-capable assistant — it answers with live data and can
            carry out tasks for you.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* What it can do */}
        <aside className="lg:col-span-1">
          <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-black dark:text-white">
                What it can do
              </h2>
            </div>
            <ul className="space-y-2">
              {meta.capabilities.map((capability) => (
                <li
                  key={capability}
                  className="flex items-start gap-2 text-xs text-body"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  {capability}
                </li>
              ))}
            </ul>
            {meta.confirmsActions && (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-primary/5 px-2.5 py-1.5 text-[11px] text-body">
                <ShieldCheck
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                Every action is shown to you for confirmation before it runs.
              </p>
            )}
          </div>
        </aside>

        {/* Conversation */}
        <div className="h-[calc(100dvh-15rem)] min-h-[460px] overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark lg:col-span-2">
          <AIConversation
            endpoint={meta.endpoint}
            intro={meta.agentIntro}
            suggestedPrompts={meta.agentPrompts}
            placeholder="Ask a question or describe a task…"
            mode="agent"
          />
        </div>
      </div>
    </div>
  );
}
