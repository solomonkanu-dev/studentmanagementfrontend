import { createInsightsRoute } from "@/lib/ai/insights";
import { lecturerInsightsConfig } from "@/lib/ai/agents/insights";

export const GET = createInsightsRoute(lecturerInsightsConfig);
