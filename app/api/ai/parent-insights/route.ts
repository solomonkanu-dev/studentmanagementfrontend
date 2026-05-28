import { createInsightsRoute } from "@/lib/ai/insights";
import { parentInsightsConfig } from "@/lib/ai/agents/insights";

export const GET = createInsightsRoute(parentInsightsConfig);
