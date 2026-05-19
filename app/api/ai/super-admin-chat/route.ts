import { createChatRoute } from "@/lib/ai/handler";
import { superAdminChatConfig } from "@/lib/ai/agents/superAdmin";

export const POST = createChatRoute(superAdminChatConfig);
