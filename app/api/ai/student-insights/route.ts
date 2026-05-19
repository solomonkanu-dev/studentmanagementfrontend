import { createInsightsRoute } from "@/lib/ai/insights";
import { studentInsightsConfig } from "@/lib/ai/agents/insights";

export const GET = createInsightsRoute(studentInsightsConfig);
