// src/validation/bydRim01/bydRim01PartsMap.ts
//
// SPIKE-LOCAL ONLY. This is not the production Registry or Parts Map
// (src/config/partsMap.ts stays BMW-only and untouched). Nothing here is
// imported by CarModel.tsx, GarageCanvas.tsx, or App.tsx.
//
// Every name below was confirmed by direct binary inspection of the exact
// authorized byd_seal_final.glb (SHA-256
// a2e38dee4cb7ad3b0bb199d00ad4093b31afbe4aa90bd5fdd6f9b96634e3091b) — not
// guessed from naming convention. See BYD_RIM_01_MATERIAL_BINDING_AND_DIFF_REPORT.md
// for the extraction method.

export const BYD_RIM_01_REQUIRED_SHA256 =
  "a2e38dee4cb7ad3b0bb199d00ad4093b31afbe4aa90bd5fdd6f9b96634e3091b";

export const BYD_RIM_01_MODEL_PATH = "/models/byd_seal_final.glb";

// The single material this spike is authorized to recolor.
export const CANDIDATE_MATERIAL_NAME = "B_Rim";

// Confirmed by primitive inspection: both nodes are single combined
// primitives that already span all four wheel positions (identity node
// transform, geometry baked in world space by the glTF-Transform export).
// There is exactly one B_Rim material instance shared by both meshes —
// recoloring it changes all four wheels' rim surfaces at once. Independent
// per-wheel color is not possible without re-authoring geometry, which is
// out of scope for this spike.
export const CANDIDATE_NODES = ["blk_B_Rim_0", "inner_rim_B_Rim_0"] as const;

// Explicitly named protected targets from the Task Brief.
export const NAMED_PROTECTED_MATERIALS = [
  "rim_map",
  "rim_Badges",
  "tire",
  "phong27breaks",
] as const;

// Node names backing the explicitly named protected materials, confirmed by
// the same inspection pass.
export const NAMED_PROTECTED_NODES: Record<string, readonly string[]> = {
  rim_map: ["alpha_rim_map_0"],
  rim_Badges: ["badges_rim_Badges_0"],
  tire: ["tyre_tire_0"],
  phong27breaks: ["disk_phong27breaks_0", "Rear_caliper_phong27breaks_0"],
};

// Every other material in the GLB (27 total, minus B_Rim = 26). All are
// "protected by default" per the Task Brief's "all unrelated Nodes, Meshes,
// Primitives, Materials, and Textures" clause, whether or not the brief
// named them individually.
export const OTHER_PROTECTED_MATERIALS = [
  "glass1",
  "map_C_AD",
  "black_Col_Mat",
  "map_C_Plas",
  "HL_Mat",
  "Car_Paint",
  "corner1",
  "chrome1",
  "phong22",
  "HL_Glass",
  "mirror",
  "interior",
  "glass_surr",
  "tail_light",
  "map_C",
  "HL_CHR",
  "red_emis",
  "carp_2",
  "cp_plastic",
  "tail_Light_Ad",
  "under",
] as const;

export const ALL_PROTECTED_MATERIALS = [
  ...NAMED_PROTECTED_MATERIALS,
  ...OTHER_PROTECTED_MATERIALS,
] as const;

// Full 27-material roster, confirmed by direct GLB inspection, used to
// detect any material this spike did not expect (stop condition).
export const EXPECTED_MATERIAL_ROSTER = [
  "rim_map",
  "glass1",
  "rim_Badges",
  "map_C_AD",
  "B_Rim",
  "black_Col_Mat",
  "map_C_Plas",
  "HL_Mat",
  "Car_Paint",
  "corner1",
  "chrome1",
  "phong22",
  "phong27breaks",
  "HL_Glass",
  "mirror",
  "interior",
  "glass_surr",
  "tail_light",
  "map_C",
  "HL_CHR",
  "red_emis",
  "carp_2",
  "cp_plastic",
  "tail_Light_Ad",
  "tire",
  "Tail_light_Plas",
  "under",
] as const;

// Two clearly synthetic, high-contrast hues. Neither resembles a plausible
// production rim finish — the point is unambiguous diagnostic proof of
// isolation in screenshots, not a preview of a shipped color option.
export const DIAGNOSTIC_BRIGHT_COLOR = "#00FF66";
export const DIAGNOSTIC_DARK_COLOR = "#330099";
