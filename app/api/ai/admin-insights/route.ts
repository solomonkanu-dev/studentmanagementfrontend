import { createInsightsRoute } from "@/lib/ai/insights";
import { adminInsightsConfig } from "@/lib/ai/agents/insights";

export const GET = createInsightsRoute(adminInsightsConfig);
