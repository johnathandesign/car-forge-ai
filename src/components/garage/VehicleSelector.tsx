// src/components/garage/VehicleSelector.tsx
//
// Validation-only control. Rendered by GarageCanvas exclusively when
// validationMode is true — never visible in normal product mode.

import type { CSSProperties } from "react";

export type ValidationVehicleId = "bmw" | "byd" | "porsche";

export function VehicleSelector({
  vehicle,
  onChange,
}: {
  vehicle: ValidationVehicleId;
  onChange: (vehicle: ValidationVehicleId) => void;
}) {
  return (
    <div style={styles.wrapper}>
      <span style={styles.label}>VALIDATION MODE — vehicle:</span>

      <button
        type="button"
        style={vehicle === "bmw" ? styles.buttonActive : styles.button}
        onClick={() => onChange("bmw")}
      >
        BMW M3
      </button>

      <button
        type="button"
        style={vehicle === "byd" ? styles.buttonActive : styles.button}
        onClick={() => onChange("byd")}
      >
        BYD Seal
      </button>

      <button
        type="button"
        style={vehicle === "porsche" ? styles.buttonActive : styles.button}
        onClick={() => onChange("porsche")}
      >
        Porsche Manthey 911 GT3 RS
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "6px",
    padding: "4px 8px",
    border: "1px solid #c98a00",
    background: "#3a2a00",
    borderRadius: "4px",
  },
  label: {
    fontSize: "11px",
    color: "#e0b34d",
  },
  button: {
    padding: "4px 8px",
    fontSize: "12px",
    cursor: "pointer",
  },
  buttonActive: {
    padding: "4px 8px",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: "bold",
    outline: "2px solid #e0b34d",
  },
};

export default VehicleSelector;
