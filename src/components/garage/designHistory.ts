// src/components/garage/designHistory.ts
//
// Canonical, serializable per-vehicle design snapshots and a narrow
// past/present/future history reducer for the Studio's Undo/Redo. Each
// snapshot holds only user-editable design values that actually affect the
// real 3D model — no camera, tab/accordion, loading/download, modal, or
// temporary-input state, and no Three.js/DOM references. Pure and
// side-effect-free, so this stays safe to import from the SSR-rendered
// route.
import type { PorscheColorChoice, PorscheHoodMode } from "./colorPalettes";

export interface BmwDesignSnapshot {
  bodyColor: PorscheColorChoice;
  wheelColor: PorscheColorChoice;
  seatColor: PorscheColorChoice;
  caliperColor: PorscheColorChoice;
  windowTint: number;
}

export const DEFAULT_BMW_SNAPSHOT: BmwDesignSnapshot = {
  bodyColor: null,
  wheelColor: null,
  seatColor: null,
  caliperColor: null,
  windowTint: 0,
};

export interface BydDesignSnapshot {
  bodyColor: PorscheColorChoice;
  rimColor: PorscheColorChoice;
  windowTint: number;
}

export const DEFAULT_BYD_SNAPSHOT: BydDesignSnapshot = {
  bodyColor: null,
  rimColor: null,
  windowTint: 0,
};

// Porsche Carpet is intentionally absent (removed from the Studio in a
// prior fix) and must not be reintroduced here.
export interface PorscheDesignSnapshot {
  wheelColor: PorscheColorChoice;
  caliperColor: PorscheColorChoice;
  bodyColor: PorscheColorChoice;
  hoodMode: PorscheHoodMode;
  hoodColor: PorscheColorChoice;
  windowTint: number;
  dashboardColor: PorscheColorChoice;
  dashboardAlcantaraColor: PorscheColorChoice;
  seatAlcantaraColor: PorscheColorChoice;
  seatLeatherColor: PorscheColorChoice;
  seatCarbonColor: PorscheColorChoice;
  doorLeatherColor: PorscheColorChoice;
  doorUpperAlcantaraColor: PorscheColorChoice;
  doorLowerAlcantaraColor: PorscheColorChoice;
  doorCarbonTrimColor: PorscheColorChoice;
  doorMetalTrimColor: PorscheColorChoice;
}

export const DEFAULT_PORSCHE_SNAPSHOT: PorscheDesignSnapshot = {
  wheelColor: null,
  caliperColor: null,
  bodyColor: null,
  hoodMode: "separate",
  hoodColor: null,
  windowTint: 0,
  dashboardColor: null,
  dashboardAlcantaraColor: null,
  seatAlcantaraColor: null,
  seatLeatherColor: null,
  seatCarbonColor: null,
  doorLeatherColor: null,
  doorUpperAlcantaraColor: null,
  doorLowerAlcantaraColor: null,
  doorCarbonTrimColor: null,
  doorMetalTrimColor: null,
};

export interface DesignHistory<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createDesignHistory<T>(initial: T): DesignHistory<T> {
  return { past: [], present: initial, future: [] };
}

export type DesignHistoryAction<T> =
  | { type: "set"; snapshot: T }
  | { type: "undo" }
  | { type: "redo" };

function shallowEqual<T extends object>(a: T, b: T): boolean {
  const aKeys = Object.keys(a) as (keyof T)[];
  const bKeys = Object.keys(b) as (keyof T)[];
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

// One reducer, reused for every vehicle's history — "set" pushes the
// current present onto past and clears future (a fresh branch point);
// "undo"/"redo" navigate without ever discarding either stack. A "set"
// whose snapshot is identical to the current present is a no-op (guards
// against, e.g., re-clicking an already-active swatch spamming history).
export function designHistoryReducer<T extends object>(
  state: DesignHistory<T>,
  action: DesignHistoryAction<T>,
): DesignHistory<T> {
  switch (action.type) {
    case "set": {
      if (shallowEqual(action.snapshot, state.present)) {
        return state;
      }
      return {
        past: [...state.past, state.present],
        present: action.snapshot,
        future: [],
      };
    }
    case "undo": {
      if (state.past.length === 0) {
        return state;
      }
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) {
        return state;
      }
      const [next, ...rest] = state.future;
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest,
      };
    }
    default:
      return state;
  }
}
