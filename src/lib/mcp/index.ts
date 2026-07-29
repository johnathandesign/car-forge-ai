import { defineMcp } from "@lovable.dev/mcp-js";
import listVehiclesTool from "./tools/list-vehicles";
import getVehicleTool from "./tools/get-vehicle";

export default defineMcp({
  name: "carforge-ai-mcp",
  title: "CarForge AI",
  version: "0.1.0",
  instructions:
    "Read-only tools for the CarForge AI showroom. Use `list_vehicles` to see the three supported vehicles (BMW M3, BYD Seal, Porsche Manthey 911 GT3 RS) and `get_vehicle` to fetch details and supported customization categories for one vehicle.",
  tools: [listVehiclesTool, getVehicleTool],
});
