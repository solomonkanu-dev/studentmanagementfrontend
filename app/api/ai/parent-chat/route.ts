import { createChatRoute } from "@/lib/ai/handler";
import { parentChatConfig } from "@/lib/ai/agents/parent";

export const POST = createChatRoute(parentChatConfig);
