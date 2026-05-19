"use client";

import { AIChatWidget } from "@/components/ui/AIChatWidget";
import { AI_AGENTS } from "@/components/ui/aiAgents";

export function StudentChatWidget() {
  return <AIChatWidget {...AI_AGENTS.student} />;
}
