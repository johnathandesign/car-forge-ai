// src/components/garage/colorPalettes.ts
//
// Pure color-swatch data shared between GarageCanvas's own debug panels and
// the Studio sidebar (garage.$vehicleId.tsx). Deliberately has zero
// three.js / @react-three imports: GarageCanvas.tsx (and everything it pulls
// in) must never be statically imported by the route module, because
// useGLTF.preload runs at module-evaluation time and would otherwise fire a
// relative-URL fetch() during server-side rendering. Keeping this data in
// its own side-effect-free module lets the route read the color options
// without pulling the 3D runtime into the SSR bundle.
export type PorscheColorChoice = string | null;
export type PorscheHoodMode = "follow-body" | "separate";

export interface PorscheColorOption {
  label: string;
  value: PorscheColorChoice;
}

export const PORSCHE_WHEEL_COLORS: PorscheColorOption[] = [
  { label: "Original", value: null },
  { label: "Black", value: "#111111" },
  { label: "Graphite", value: "#3A3D42" },
  { label: "Silver", value: "#B7BDC5" },
  { label: "White", value: "#F2F2F2" },
  { label: "Bronze", value: "#8A5A2B" },
  { label: "Gold", value: "#C79A2B" },
  { label: "Red", value: "#C1121F" },
  { label: "Blue", value: "#174EA6" },
];

export const PORSCHE_CALIPER_COLORS: PorscheColorOption[] = [
  { label: "Original", value: null },
  { label: "Red", value: "#D90429" },
  { label: "Yellow", value: "#F5C400" },
  { label: "Orange", value: "#F26A21" },
  { label: "Blue", value: "#1464F4" },
  { label: "Green", value: "#00A651" },
  { label: "Black", value: "#111111" },
  { label: "Silver", value: "#B7BDC5" },
  { label: "White", value: "#F2F2F2" },
];

export const PORSCHE_BODY_COLORS: PorscheColorOption[] = [
  { label: "Original", value: null },
  { label: "Red", value: "#C1121F" },
  { label: "Black", value: "#111111" },
  { label: "White", value: "#F2F2F2" },
  { label: "Silver", value: "#B7BDC5" },
  { label: "Graphite", value: "#3A3D42" },
  { label: "Blue", value: "#174EA6" },
  { label: "Dark Blue", value: "#0B1F3A" },
  { label: "Green", value: "#1F5E3B" },
  { label: "Yellow", value: "#F5C400" },
  { label: "Orange", value: "#F26A21" },
  { label: "Purple", value: "#5B2C83" },
];

export const PORSCHE_HOOD_COLORS: PorscheColorOption[] = [
  { label: "Carbon Fiber", value: null },
  { label: "Red", value: "#C1121F" },
  { label: "Black", value: "#111111" },
  { label: "White", value: "#F2F2F2" },
  { label: "Silver", value: "#B7BDC5" },
  { label: "Graphite", value: "#3A3D42" },
  { label: "Blue", value: "#174EA6" },
  { label: "Dark Blue", value: "#0B1F3A" },
  { label: "Green", value: "#1F5E3B" },
  { label: "Yellow", value: "#F5C400" },
  { label: "Orange", value: "#F26A21" },
  { label: "Purple", value: "#5B2C83" },
];

// Shared hex-color helpers — used by both GarageCanvas's own debug color
// panel (PorscheColorRow, validationMode-only) and the Studio's ColorSwatchRow
// so custom-color entry behaves identically everywhere: same normalization,
// same validity check, same contrast logic. Pure/no side effects, so this
// stays safe to import from the SSR-rendered route too.
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return withHash.toUpperCase();
}

export function getReadableTextColor(background: string | null): string {
  if (!background || !HEX_COLOR_PATTERN.test(background)) {
    return "#FFFFFF";
  }
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 155 ? "#111111" : "#FFFFFF";
}
