import { defineTool } from "@lovable.dev/mcp-js";
import { VEHICLES } from "@/lib/vehicles";

export default defineTool({
  name: "list_vehicles",
  title: "List vehicles",
  description:
    "List all vehicles available in the CarForge AI showroom, including id, name, personality, availability and supported customization categories.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(VEHICLES, null, 2) }],
    structuredContent: { vehicles: VEHICLES },
  }),
});
