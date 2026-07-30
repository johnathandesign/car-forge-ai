// src/utils/windowTint.ts
//
// Shared window-tint math reused by CarModel (BMW), BydSealModel (BYD), and
// PorscheModel so the 0-100 "Window Tint" slider means the same thing
// everywhere: 0 reproduces that vehicle's own baseline glass exactly, 100 is
// the darkest tint that still reads as real glass rather than solid paint
// (opacity and transmission are capped short of fully opaque/blocked).

import * as THREE from "three";

export function getWindowTintStrength(windowTint: number): number {
  return Math.max(0, Math.min(100, windowTint)) / 100;
}

// Tint color glass darkens toward as the slider increases.
export const WINDOW_TINT_DARK_COLOR = new THREE.Color("#05070a");

// Opacity rises and transmission falls toward these, never past them, so
// the glass never becomes solid paint even at tintStrength = 1.
export const WINDOW_TINT_MAX_OPACITY = 0.85;
export const WINDOW_TINT_MIN_TRANSMISSION = 0.08;

export interface WindowTintBaseline {
  color: THREE.Color;
  opacity: number;
  transmission?: number;
}

// Mutates `material` in place, starting every lerp from `baseline` (that
// vehicle's own tintStrength = 0 appearance) so 0 is always exactly the
// original/baseline glass, never a guessed recreation of it.
export function applyWindowTintToMaterial(
  material: THREE.Material & {
    color?: THREE.Color;
    opacity?: number;
    transmission?: number;
  },
  baseline: WindowTintBaseline,
  tintStrength: number,
): void {
  if (material.color) {
    material.color.copy(baseline.color).lerp(WINDOW_TINT_DARK_COLOR, tintStrength);
  }

  material.opacity = THREE.MathUtils.lerp(baseline.opacity, WINDOW_TINT_MAX_OPACITY, tintStrength);

  if (typeof material.transmission === "number" && typeof baseline.transmission === "number") {
    material.transmission = THREE.MathUtils.lerp(
      baseline.transmission,
      WINDOW_TINT_MIN_TRANSMISSION,
      tintStrength,
    );
  }

  material.needsUpdate = true;
}
