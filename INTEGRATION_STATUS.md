# CarForge AI — Configurator Integration Status

## Summary

The real 3D configurator runtime (`GarageCanvas`, `CarModel`, `PorscheModel`,
`BydSealModel`, GLB models) has been integrated into the Studio/Garage route,
replacing the static placeholder viewer. The Studio sidebar is wired to the
runtime's actual state (body/wheel/seat/caliper color, window tint, Porsche
hood mode) — no second/parallel design state, no mock controls.

## What was missing and reconstructed

Two files referenced by the runtime did not exist anywhere in this repo or
its git history and were reconstructed from the real shipped assets:

- **`src/config/partsMap.ts`** — `CarModel.tsx` imports `PARTS_MAP` /
  `assertFullCoverage` from here; the file was absent. Rebuilt by extracting
  the actual material list directly from `public/models/bmw_m3_final.glb`
  (22 materials, 84 meshes — matching the count `CarModel.tsx`'s own header
  comment expects) and mapping each material to the role implied by
  `CarModel.tsx`'s existing switch statement and its own inline comments
  (e.g. `glass_toit` → roof, `r_glass` → rear light). Materials with no
  clear, already-documented role are mapped to inert no-op roles
  (`ignore`/`trim`) so they're left at their original GLB-authored
  appearance rather than guessed at.
- **`src/components/garage/colorPalettes.ts`** — new, small, side-effect-free
  module holding the color-swatch data (`PORSCHE_BODY_COLORS`,
  `PORSCHE_WHEEL_COLORS`, `PORSCHE_CALIPER_COLORS`, `PORSCHE_HOOD_COLORS`)
  that previously lived only inline inside `GarageCanvas.tsx`. Extracted so
  the Studio route can reuse the exact same palettes (single source of
  truth) without statically importing `GarageCanvas.tsx` itself (see SSR
  note below).

Everything else under `src/components/garage/`, `src/validation/bydRim01/`,
`src/utils/windowTint.ts`, `src/types/carModelDesign.ts`, and
`public/models/**` is the real runtime/assets, used as-is except for the
adaptation described next.

## GarageCanvas adaptation (small, additive, backward-compatible)

`GarageCanvas` previously only exposed its per-vehicle customization state
through its own internal debug UI, gated behind an internal
`validationMode` flag — there was no way for an external caller (the
Studio route) to read or drive that state. `GarageCanvas` was wrapped in
`forwardRef` and given:

- Optional **controlled props** for vehicle selection and every
  Studio-exposed color/tint field (BMW: body/wheel/seat/caliper/tint; BYD:
  body/rim/tint; Porsche: wheel/caliper/body/hood mode/hood
  color/tint), each falling back to the exact original internal
  `useState` behavior when the prop is omitted — so nothing about the
  existing validation-mode debug path changed.
- An **imperative handle** (`showExteriorView`, `showInteriorView`,
  `focusWheels`) so the Studio's Exterior/Interior tabs and Rim Color
  category trigger the runtime's own existing camera actions, per the
  brief's "only change camera on an existing runtime-defined action" rule.
- The internal debug toolbar (vehicle switcher, Log/Copy Camera Pose,
  Calibration Free Camera) is now gated behind `validationMode` — previously
  the free-camera/pose-logging debug tools rendered unconditionally. The
  Studio route always passes `validationMode={false}`, so end users only
  ever see the safe, bounded camera presets, never the unrestricted debug
  camera.

Porsche's 11 interior-material fields (dashboard/seat/door trim variants)
were intentionally **not** exposed to the Studio sidebar — the brief's
Porsche section only requires "existing exterior customization," and those
fields aren't part of the common-controls list either. They remain fully
functional internally at their default (`null` = original) and are simply
unreached by the UI, per "prefer disabling unsupported controls over
inventing behavior."

## SSR (this is a TanStack Start app, not a plain Vite SPA)

`GarageCanvas.tsx` (and its dependency chain: `three`, `@react-three/fiber`,
`@react-three/drei`, `CarModel`/`PorscheModel`/`BydSealModel`) is never
statically imported by the route. `useGLTF.preload(...)` runs at
module-evaluation time and issues a relative-URL `fetch()`, which throws
under Node's SSR `fetch` (no base URL). The route instead:

- Imports the `GarageCanvasHandle` type and the color palette data only
  (both erased/side-effect-free at the type or module level).
- Loads the component itself via `lazy(() => import(".../GarageCanvas"))`.
- Wraps rendering in `<ClientOnly fallback={...}><Suspense fallback={...}>`
  so the module is fetched and evaluated only in the browser, after
  hydration.

Confirmed in the production build output: the ~1 MB `GarageCanvas` chunk
appears only under `.output/public/assets/` (client), never under the SSR
(`_ssr/`) or Nitro server output.

## Route → runtime vehicle mapping

`VEHICLE_RUNTIME_MAP` in `garage.$vehicleId.tsx` maps `bmw-m3 → bmw`,
`byd-seal → byd`, `porsche-manthey → porsche`. Selecting a vehicle in
Showroom/Studio navigates the route; `GarageCanvas`'s `vehicle` prop is
driven directly from that mapped value. Unknown vehicle IDs render the
pre-existing "invalid vehicle" page (verified: `/garage/nonexistent-vehicle`
returns the localized error state, not a crash).

## Studio sidebar categories (per-vehicle, real controls only)

`vehicles.ts` `supportedCategories` were corrected to only list categories
with genuine backing in the runtime:

- **BMW M3**: body-color, rim-color (recolors all 4 wheels together, not
  tires/discs/calipers/suspension/body), caliper-color, window-tint, seats
  (shared front+rear).
- **BYD Seal**: body-color, rim-color, window-tint (also drives the
  panoramic-roof glass tint). No separate interior controls.
- **Porsche Manthey 911 GT3 RS**: body-color, rim-color, caliper-color,
  hood-color (Follow Body / Separate), window-tint.

`rim-style`, `spoilers`, `bumpers`, `trim`, and the remaining interior
categories have no backing anywhere in the runtime for any of the three
vehicles and are never marked supported — they render locked/disabled via
the existing "unsupported" badge treatment, never as dead-clickable
controls.

## Reset / Restore / Review

- **Reset Design** and **Return to Original** both call the same
  `restoreCurrentVehicle()`, which nulls/zeroes every field for the active
  vehicle — the real restore behavior, not a UI-only reset.
- **Undo / Redo / Compare with Original** are rendered `disabled` with a
  clarifying title. No reliable history system exists in production scope
  (the only history implementation found, `src/validation/bydRim01/history.ts`,
  is explicitly validation-harness-only per its own header comment) — per
  the brief, these are disabled rather than backed by a fabricated history.
- **Change Summary** (Review dialog) now lists real non-default field
  values for the active vehicle instead of a hardcoded placeholder, and
  still shows the original "no changes yet" state when nothing has been
  changed.

## Motorsport Mesh

Confirmed removed/absent from every active code path: no imports, no
references to `Motorsport Mesh`, `wheelDesign`, or `custom_wheels` anywhere
under `src/`. The physical files
(`public/models/custom_wheels/bmw_motorsport_mesh.glb`,
`parametric-model.stl`) are left on disk per "may remain physically present
only when deleting them creates risk, but must not be imported, loaded,
rendered, or exposed" — verified via `grep` before this integration was
finalized.

## Verification performed

- `bun install` — three@0.185.1, @react-three/fiber@9.6.1,
  @react-three/drei@10.7.7 (peer-compatible with React 19.2, confirmed via
  npm registry peerDependencies before installing), @types/three as dev dep.
- `bun run build` — client, SSR, and Nitro server builds all succeed.
- `tsc --noEmit` — zero new type errors. One pre-existing, unrelated error
  in `src/components/app-footer.tsx` (a stale route-literal type on an
  untouched file) was confirmed present on the original `lovable-import`
  HEAD commit before any of this work, via `git stash`.
- `eslint` on every file touched/added by this integration — zero errors,
  zero warnings.
- Local dev server + `curl`: `/`, `/showroom`,
  `/garage/bmw-m3`, `/garage/byd-seal`, `/garage/porsche-manthey`, and an
  invalid vehicle ID all return HTTP 200; each Garage route's SSR HTML
  contains the correct vehicle name and, pre-hydration, the loading
  fallback (not a raw `<canvas>` — confirming `GarageCanvas` truly does not
  render during SSR); all three GLB model URLs and existing static images
  return 200.
- GLB integrity spot-checks: extracted each model's glTF JSON directly and
  confirmed every mesh/material name `CarModel.tsx` / `PorscheModel.tsx` /
  `BydSealModel.tsx` hardcodes actually exists in the shipped file; verified
  the BYD GLB's SHA-256 matches the hash `useBydRim01Validation.ts` checks
  against.

**Not verified**: actual in-browser WebGL rendering, camera-orbit feel, and
click-to-recolor interaction. Browser automation was unavailable this
session (declined/disabled) — everything above was confirmed via build
output, SSR HTML, HTTP status, and direct GLB binary inspection, not a
rendered page. This should be spot-checked in a real browser before
considering the visual/interaction layer fully confirmed.

## Also fixed along the way (necessary for this integration, not scope creep)

- A pre-existing Rules-of-Hooks violation in `garage.$vehicleId.tsx` (hooks
  declared after an early `return` for the invalid-vehicle case) was fixed
  by moving all hooks above the early return — required for the new hooks
  added by this integration to be safe across vehicle-id transitions.
- A Windows path-separator bug in `@lovable.dev/mcp-js`'s Vite plugin
  (`node_modules`, not part of this repo) was patched locally only to make
  `vite build` runnable for verification on this machine; it is not a
  repo change and will not persist. It reproduces identically on the
  unmodified `lovable-import` HEAD, is Windows-specific (compares a
  forward-slash path against a backslash path), and would not be expected
  to occur on Vercel's Linux build environment.
