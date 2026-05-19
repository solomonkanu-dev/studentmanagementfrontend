import { createChatRoute } from "@/lib/ai/handler";
import { lecturerChatConfig } from "@/lib/ai/agents/lecturer";

export const POST = createChatRoute(lecturerChatConfig);
