import { createChatRoute } from "@/lib/ai/handler";
import { studentChatConfig } from "@/lib/ai/agents/student";

export const POST = createChatRoute(studentChatConfig);
