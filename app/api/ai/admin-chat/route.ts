import { createChatRoute } from "@/lib/ai/handler";
import { adminChatConfig } from "@/lib/ai/agents/admin";

export const POST = createChatRoute(adminChatConfig);
