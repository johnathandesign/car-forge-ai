import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getVehicle, EXTERIOR_CATEGORIES, INTERIOR_CATEGORIES } from "@/lib/vehicles";

export default defineTool({
  name: "get_vehicle",
  title: "Get vehicle details",
  description:
    "Get full details for a single CarForge AI vehicle by id (bmw-m3, byd-seal, or porsche-manthey), including which exterior and interior customization categories it supports.",
  inputSchema: {
    id: z.string().describe("Vehicle id: bmw-m3, byd-seal, or porsche-manthey."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const vehicle = getVehicle(id);
    if (!vehicle) {
      return {
        content: [{ type: "text", text: `No vehicle found with id "${id}".` }],
        isError: true,
      };
    }
    const supported = new Set(vehicle.supportedCategories);
    const exterior = EXTERIOR_CATEGORIES.filter((c) => supported.has(c.id));
    const interior = INTERIOR_CATEGORIES.filter((c) => supported.has(c.id));
    const payload = { vehicle, exterior, interior };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
