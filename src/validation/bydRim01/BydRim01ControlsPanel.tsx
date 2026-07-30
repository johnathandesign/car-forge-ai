// src/validation/bydRim01/BydRim01ControlsPanel.tsx
//
// Purely presentational. Receives the already-built useBydRim01Validation()
// hook's return value as a single prop and renders controls for it — no
// validation-harness logic of its own, no production business logic.
// Floats as a fixed-position overlay so it never resizes or pushes the
// <Canvas> in GarageCanvas.tsx; that file's mount/gating logic is untouched.
//
// Rendered by GarageCanvas.tsx only when validationMode is true, the
// selected vehicle is "byd", and the live checksum has matched.

import { useState } from "react";
import type { CSSProperties } from "react";
import type { useBydRim01Validation } from "./useBydRim01Validation";
import { DIAGNOSTIC_BRIGHT_COLOR, DIAGNOSTIC_DARK_COLOR } from "./bydRim01PartsMap";

type Validation = ReturnType<typeof useBydRim01Validation>;

// Explicitly a validation-only set, not a production/approved catalog — no
// approved preset palette exists anywhere in the project (checked
// car-design/options.ts and the rest of src/). Six clearly distinguishable,
// neutral-to-mid-contrast colors, no alpha.
const VALIDATION_PALETTE: { label: string; hex: string }[] = [
  { label: "Neutral Gray", hex: "#808080" },
  { label: "Cool Steel", hex: "#4A6FA5" },
  { label: "Warm Clay", hex: "#B5651D" },
  { label: "Deep Teal", hex: "#1B4D4D" },
  { label: "Signal Amber", hex: "#D98E04" },
  { label: "Charcoal", hex: "#2B2B2B" },
];

interface HexNormalizeResult {
  value: string;
  valid: boolean;
  error?: string;
}

// Accepts ABC / #ABC / AABBCC / #AABBCC. Normalizes to uppercase #RRGGBB.
// No alpha is ever accepted — 4- and 8-digit inputs are rejected below along
// with anything that isn't a bare hex-digit string of length 3 or 6.
function normalizeHexInput(raw: string): HexNormalizeResult {
  const trimmed = raw.trim();
  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

  if (withoutHash.length === 0) {
    return { value: "", valid: false, error: "Enter a HEX value." };
  }
  if (!/^[0-9a-fA-F]+$/.test(withoutHash)) {
    return { value: "", valid: false, error: "Only hex digits 0-9 and A-F are allowed." };
  }
  if (withoutHash.length === 3) {
    const expanded = withoutHash
      .split("")
      .map((c) => c + c)
      .join("");
    return { value: `#${expanded.toUpperCase()}`, valid: true };
  }
  if (withoutHash.length === 6) {
    return { value: `#${withoutHash.toUpperCase()}`, valid: true };
  }
  return {
    value: "",
    valid: false,
    error: "HEX must be 3 or 6 digits (e.g. ABC or AABBCC) — no alpha channel.",
  };
}

function currentAppliedColorHex(validation: Validation): string {
  const entry = validation.history.entries[validation.history.pointer];
  if (entry.kind === "original") {
    return (validation.modelInfo?.originalSnapshot.colorHex ?? "#000000").toUpperCase();
  }
  return (entry.colorHex ?? "#000000").toUpperCase();
}

export function BydRim01ControlsPanel({ validation }: { validation: Validation }) {
  const modelReady = Boolean(validation.modelInfo);
  const [collapsed, setCollapsed] = useState(false);
  const [camerasCollapsed, setCamerasCollapsed] = useState(false);
  const [diagnosticsCollapsed, setDiagnosticsCollapsed] = useState(true);

  const appliedHex = currentAppliedColorHex(validation);
  const [pendingHexText, setPendingHexText] = useState(appliedHex);
  const normalized = normalizeHexInput(pendingHexText);

  function applyPendingColor() {
    const result = normalizeHexInput(pendingHexText);
    if (!result.valid) return;
    validation.dispatchHistory(
      {
        type: "apply",
        kind: "custom",
        colorHex: result.value,
        label: `Custom Color ${result.value}`,
      },
      "Apply Color",
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.headerRow}>
        <span style={styles.heading}>BYD-RIM-01 Validation</span>
        <button type="button" style={styles.smallButton} onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? "▸ Expand" : "▾ Collapse"}
        </button>
      </div>

      {!collapsed && (
        <>
          <section style={styles.section}>
            <div style={styles.sectionHeaderRow}>
              <span style={styles.sectionHeading}>Camera Views</span>
              <button
                type="button"
                style={styles.smallButton}
                onClick={() => setCamerasCollapsed((c) => !c)}
              >
                {camerasCollapsed ? "▸" : "▾"}
              </button>
            </div>
            {!camerasCollapsed && (
              <div style={styles.row}>
                <button
                  type="button"
                  disabled={!modelReady}
                  onClick={() => validation.goToView("full")}
                >
                  Full Vehicle
                </button>
                <button
                  type="button"
                  disabled={!modelReady}
                  onClick={() => validation.goToView("FL")}
                >
                  Front-Left Wheel
                </button>
                <button
                  type="button"
                  disabled={!modelReady}
                  onClick={() => validation.goToView("FR")}
                >
                  Front-Right Wheel
                </button>
                <button
                  type="button"
                  disabled={!modelReady}
                  onClick={() => validation.goToView("RL")}
                >
                  Rear-Left Wheel
                </button>
                <button
                  type="button"
                  disabled={!modelReady}
                  onClick={() => validation.goToView("RR")}
                >
                  Rear-Right Wheel
                </button>
              </div>
            )}
          </section>

          <section style={styles.section}>
            <span style={styles.sectionHeading}>Rim Color</span>

            <div style={styles.previewRow}>
              <span style={styles.previewLabel}>Current:</span>
              <span style={{ ...styles.swatch, backgroundColor: appliedHex }} />
              <span style={styles.previewHex}>{appliedHex}</span>
            </div>
            <div style={styles.previewRow}>
              <span style={styles.previewLabel}>Pending:</span>
              <span
                style={{
                  ...styles.swatch,
                  backgroundColor: normalized.valid ? normalized.value : "transparent",
                  border: normalized.valid ? "1px solid #666" : "1px dashed #a33",
                }}
              />
              <span style={styles.previewHex}>
                {normalized.valid ? normalized.value : "invalid"}
              </span>
            </div>

            <span style={styles.subLabel}>Validation Palette (not a production catalog)</span>
            <div style={styles.row}>
              {VALIDATION_PALETTE.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  title={`${swatch.label} (${swatch.hex})`}
                  aria-label={`${swatch.label} ${swatch.hex}`}
                  style={{ ...styles.paletteSwatchButton, backgroundColor: swatch.hex }}
                  onClick={() => setPendingHexText(swatch.hex)}
                />
              ))}
            </div>

            <div style={styles.row}>
              <input
                type="color"
                value={normalized.valid ? normalized.value.toLowerCase() : appliedHex.toLowerCase()}
                onChange={(e) => setPendingHexText(e.target.value)}
                style={styles.colorInput}
                aria-label="Native color picker"
              />
              <input
                type="text"
                value={pendingHexText}
                onChange={(e) => setPendingHexText(e.target.value)}
                placeholder="#AABBCC or ABC"
                style={styles.hexInput}
                aria-label="HEX input"
              />
            </div>
            {!normalized.valid && <span style={styles.errorText}>{normalized.error}</span>}

            <div style={styles.row}>
              <button
                type="button"
                disabled={!modelReady || !normalized.valid}
                onClick={applyPendingColor}
              >
                Apply Color
              </button>
              <button
                type="button"
                disabled={!modelReady}
                onClick={() =>
                  validation.dispatchHistory({ type: "returnToOriginal" }, "Return to Original")
                }
              >
                Return to Original
              </button>
              <button
                type="button"
                disabled={!modelReady}
                onClick={() => validation.dispatchHistory({ type: "undo" }, "Undo")}
              >
                Undo
              </button>
              <button
                type="button"
                disabled={!modelReady}
                onClick={() => validation.dispatchHistory({ type: "redo" }, "Redo")}
              >
                Redo
              </button>
            </div>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeaderRow}>
              <span style={styles.sectionHeading}>Diagnostic Tests</span>
              <button
                type="button"
                style={styles.smallButton}
                onClick={() => setDiagnosticsCollapsed((c) => !c)}
              >
                {diagnosticsCollapsed ? "▸ Expand" : "▾ Collapse"}
              </button>
            </div>
            {!diagnosticsCollapsed && (
              <>
                <div style={styles.row}>
                  <button
                    type="button"
                    disabled={!modelReady}
                    onClick={() =>
                      validation.dispatchHistory(
                        {
                          type: "apply",
                          kind: "bright",
                          colorHex: DIAGNOSTIC_BRIGHT_COLOR,
                          label: "Bright Diagnostic Color",
                        },
                        "Apply Bright Diagnostic Color",
                      )
                    }
                  >
                    Apply Bright Diagnostic
                  </button>
                  <button
                    type="button"
                    disabled={!modelReady}
                    onClick={() =>
                      validation.dispatchHistory(
                        {
                          type: "apply",
                          kind: "dark",
                          colorHex: DIAGNOSTIC_DARK_COLOR,
                          label: "Dark Diagnostic Color",
                        },
                        "Apply Dark Diagnostic Color",
                      )
                    }
                  >
                    Apply Dark Diagnostic
                  </button>
                </div>
                <div style={styles.row}>
                  <button
                    type="button"
                    disabled={!modelReady}
                    onClick={() =>
                      validation.dispatchHistory(
                        { type: "injectFailure" },
                        "Inject Authorized Failure",
                      )
                    }
                  >
                    Inject Authorized Failure
                  </button>
                  <button
                    type="button"
                    disabled={!modelReady}
                    onClick={() =>
                      validation.dispatchHistory(
                        { type: "restoreAfterFailure" },
                        "Restore After Failure",
                      )
                    }
                  >
                    Restore After Failure
                  </button>
                  <button
                    type="button"
                    disabled={!modelReady}
                    onClick={() => validation.runCleanup()}
                  >
                    Run Cleanup
                  </button>
                </div>
                <div style={styles.row}>
                  <button type="button" onClick={() => validation.pickDirectory()}>
                    Choose Evidence Folder
                  </button>
                  <button
                    type="button"
                    disabled={!modelReady}
                    onClick={() => validation.captureScreenshot("baseline")}
                  >
                    Capture Baseline
                  </button>
                  <button
                    type="button"
                    disabled={!modelReady}
                    onClick={() =>
                      validation.captureScreenshot(
                        validation.history.entries[validation.history.pointer].kind,
                      )
                    }
                  >
                    Capture Screenshot
                  </button>
                  <button
                    type="button"
                    disabled={!validation.cleanupDone}
                    onClick={() => validation.exportEvidence()}
                  >
                    Export Evidence Package
                  </button>
                </div>
              </>
            )}
          </section>

          <div style={styles.status}>
            History: {validation.history.entries.map((e) => e.label).join(" → ")} (pointer{" "}
            {validation.history.pointer})
            {validation.history.failureInjected
              ? " — FAILURE INJECTED, restore before continuing"
              : ""}
            <br />
            {validation.lastActionMessage}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    position: "fixed",
    top: 64,
    right: 12,
    width: "min(340px, calc(100vw - 24px))",
    maxHeight: "calc(100vh - 80px)",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "10px",
    border: "1px solid #c98a00",
    background: "rgba(26, 20, 0, 0.96)",
    color: "#eee",
    fontSize: "12px",
    borderRadius: "6px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    zIndex: 20,
  },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  heading: { fontWeight: "bold", color: "#e0b34d" },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    borderTop: "1px solid #4a3a00",
    paddingTop: "6px",
  },
  sectionHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sectionHeading: { fontWeight: "bold", color: "#ddd" },
  subLabel: { fontSize: "10px", color: "#a08040", fontStyle: "italic" },
  row: { display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" },
  previewRow: { display: "flex", gap: "6px", alignItems: "center" },
  previewLabel: { fontSize: "11px", color: "#aaa", width: "52px" },
  previewHex: { fontSize: "11px", fontFamily: "monospace" },
  swatch: {
    width: "18px",
    height: "18px",
    borderRadius: "3px",
    border: "1px solid #666",
    display: "inline-block",
  },
  paletteSwatchButton: {
    width: "28px",
    height: "28px",
    borderRadius: "4px",
    border: "1px solid #666",
    cursor: "pointer",
  },
  colorInput: {
    width: "36px",
    height: "28px",
    padding: 0,
    border: "1px solid #666",
    background: "none",
  },
  hexInput: { flex: 1, minWidth: "100px", padding: "4px 6px", fontFamily: "monospace" },
  errorText: { fontSize: "11px", color: "#e07070" },
  smallButton: { padding: "2px 6px", fontSize: "11px", cursor: "pointer" },
  status: {
    fontSize: "11px",
    color: "#aaa",
    wordBreak: "break-word",
    borderTop: "1px solid #4a3a00",
    paddingTop: "6px",
  },
};

export default BydRim01ControlsPanel;
