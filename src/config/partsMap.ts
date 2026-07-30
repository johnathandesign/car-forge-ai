// src/config/partsMap.ts
//
// BMW-only production Parts Map: maps each raw glTF material name from
// public/models/bmw_m3_final.glb to the semantic role CarModel.tsx uses to
// decide how (or whether) to recolor it. Confirmed by direct inspection of
// the shipped GLB's material roster (22 materials, 84 meshes — the exact
// numbers CarModel.tsx's own header comment expects).
//
// Roles with a dedicated case in CarModel.tsx's material-effect switch:
// body, glass, roof, rearLight, rims, seats. Everything else is inert on
// purpose — CarModel.tsx has no switch case for them, so they're left at
// the GLB's authored appearance. The live bodyColor/wheelColor/seatColor/
// caliperColor props take priority over this map entirely for the specific
// meshes confirmed in BMW_BODY_PARTS / BMW_WHEEL_PARTS / BMW_SEAT_PARTS /
// BMW_CALIPER_PARTS; this map only governs the fallback per-material-name
// path for meshes not in those confirmed sets (e.g. the "alum" rocker/sill
// trim and front bumper surround that share a material name with the rims
// but aren't part of any wheel).
export type MaterialRole =
  | "body"
  | "glass"
  | "roof"
  | "rearLight"
  | "rims"
  | "seats"
  | "tires"
  | "trim"
  | "brake"
  | "chrome_trim"
  | "logo_plate"
  | "interior"
  | "ignore";

export const PARTS_MAP: Record<string, MaterialRole> = {
  // Confirmed live-override materials (see BMW_BODY_PARTS / BMW_WHEEL_PARTS /
  // BMW_SEAT_PARTS / BMW_CALIPER_PARTS in CarModel.tsx). The role below only
  // applies to the meshes sharing this material name that are NOT already
  // covered by one of those confirmed per-mesh sets.
  body: "body",
  // "alum" also backs Object_13 (rocker/sill trim) and Object_19 (front
  // bumper/grille surround), both explicitly excluded from wheel color —
  // "trim" keeps them at their original finish instead of following rims.
  alum: "trim",
  // "sieges" also backs Object_64, explicitly excluded from seat color
  // (unconfirmed small hardware/frame bit, not cushion surface) — "ignore"
  // keeps it at its original finish instead of following seat color.
  sieges: "ignore",
  // "etriers" is used by exactly one mesh (the caliper), already covered by
  // BMW_CALIPER_PARTS — this entry only matters if that ever changes.
  etriers: "brake",

  // Distinct glass-family materials, each already given its own switch case.
  glass: "glass",
  glass_toit: "roof",
  r_glass: "rearLight",

  // Everything else: no switch case touches these, left at authored look.
  black: "trim",
  black_dessous: "trim",
  chrome_ok: "chrome_trim",
  gris: "trim",
  interior1: "interior",
  interior2: "interior",
  interior3: "interior",
  logo: "logo_plate",
  material: "ignore",
  miroir: "trim",
  plate: "ignore",
  tire: "tires",
  wire_060110190: "ignore",
  wire_087225143: "ignore",
  wire_135110008: "ignore",
};

// Dev-time safety net: warns (never throws) if the loaded GLB contains a
// material this map doesn't know about, so an unmapped material fails loud
// in the console instead of silently rendering with whatever THREE default
// happens to apply.
export function assertFullCoverage(materialNames: string[]): void {
  const missing = materialNames.filter((name) => !(name in PARTS_MAP));
  if (missing.length > 0) {
    console.warn(
      `[partsMap] Missing coverage for materials: ${missing.join(", ")}. ` +
        "These will be treated as 'ignore' and left at their default appearance.",
    );
  }
}
