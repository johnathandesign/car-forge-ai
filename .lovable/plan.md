# Home page refinement to match approved reference

The current home page already carries the correct assets, header, vehicle preview, closing CTA and footer per spec. Compared to the reference image, three composition problems remain — all inside `src/components/landing-page.tsx` (plus a tiny header trim). No routes, features, i18n keys or business logic change.

## What's off vs. the reference

1. **Capability strip is a separate full-width band.** In the reference, the four items sit *inside* the Hero, tucked under the CTAs in the left content column — no border band, no dark surface, no dividers. Current code renders them as a bordered section below the Hero.
2. **Mobile stacks the vehicle image *before* the content.** Current `order-1 md:order-2` on the image puts the artwork first on mobile. Spec is explicit: content → CTAs → vehicle image last.
3. **Hero container reads slightly "boxed".** Small polish: tighten vertical rhythm, remove the residual gap that reads as an empty black band under the vehicle.

## Changes

### `src/components/landing-page.tsx`
- **Integrate the capability strip into the Hero:**
  - Delete the standalone `<section>` wrapper with `border-y … bg-[oklch(0.11_…)]` and its dividers.
  - Render a compact 4-item row directly below the CTAs, inside the left content column (max width ~620px on desktop). On mobile it collapses to a 2×2 grid, then stacks 1-per-row under ~380px.
  - Style per spec: simple line icons, tiny label + one-line supporting text, no cards, no shadows, no glass. Optional subtle vertical hairline (`border-s border-white/8`) between items on ≥sm.
  - Keep the four approved items unchanged (viz / ext / intr / hist) using existing `t.features.*`.
- **Fix mobile order:** content column becomes `order-1` and image `order-2` at every breakpoint. Remove the `order-2 md:order-1` swap.
- **Tighten Hero composition:**
  - Reduce `min-h` to `min-h-[600px] lg:min-h-[680px]` and set `py-12 lg:py-16` so the section no longer leaves a black band under the artwork.
  - Cap image with `max-h-[520px] lg:max-h-[560px]` and keep `object-contain` so the full vehicle + full wordmark are preserved.
  - Keep red illumination and floor reflection but drop overall opacity a touch (~0.45) so no component reads as "red-glow everywhere".

### `src/components/app-header.tsx`
- Micro polish only: keep 76px height, keep the three approved links (Home / Showroom / Garage), tighten `ms-4` nav offset to `ms-6`, ensure the active-route pill uses `bg-white/5` with a 1px bottom red accent for the active item. No new links, no removed links.

## Out of scope (per spec)

- No new sections, no Studio / Features / Gallery / About / Contact items.
- No changes to Vehicle Preview cards, Closing CTA, Footer, i18n, accessibility, routes, MCP, or vehicle data.
- Approved artwork stays the same asset with `object-contain`; nothing is redrawn, mirrored, cropped, or replaced.

## Acceptance checks

- Hero renders as one integrated composition on ≥md: content + capability strip on the left, vehicle art on the right, no visible band under the artwork.
- Mobile (<1024px): logo/hamburger header → eyebrow → headline → supporting → primary CTA → secondary CTA → capability strip → vehicle artwork (uncropped, wordmark intact) → vehicle preview cards (1 per row) → closing CTA → footer. No horizontal scroll.
- Capability strip shows exactly the four approved items; no AI Fit Score, no metrics.
- Hebrew (RTL) mirrors layout and CTA order; vehicle artwork and logo are not mirrored.
- Accessibility menu, language toggle, keyboard focus, and reduced-motion behavior unchanged.
