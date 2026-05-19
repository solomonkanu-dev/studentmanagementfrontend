"use client";

import { AIChatWidget } from "@/components/ui/AIChatWidget";
import { AI_AGENTS } from "@/components/ui/aiAgents";

export function AdminChatWidget() {
  return <AIChatWidget {...AI_AGENTS.admin} />;
}
