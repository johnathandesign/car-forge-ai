// src/validation/bydRim01/evidence.ts
//
// Spike-local evidence capture: checksum verification, material snapshots/
// diffs, camera-pose recording, screenshot + JSON/CSV export. Nothing here
// touches the production Registry/Parts Map or is imported by BMW code.

import * as THREE from "three";

export interface MaterialSnapshot {
  name: string;
  colorHex: string;
  metalness: number;
  roughness: number;
  opacity: number;
  transparent: boolean;
}

export function snapshotMaterial(material: THREE.MeshStandardMaterial): MaterialSnapshot {
  return {
    name: material.name,
    colorHex: `#${material.color.getHexString()}`,
    metalness: material.metalness,
    roughness: material.roughness,
    opacity: material.opacity,
    transparent: material.transparent,
  };
}

export function snapshotsEqual(a: MaterialSnapshot, b: MaterialSnapshot): boolean {
  return (
    a.name === b.name &&
    a.colorHex.toLowerCase() === b.colorHex.toLowerCase() &&
    a.metalness === b.metalness &&
    a.roughness === b.roughness &&
    a.opacity === b.opacity &&
    a.transparent === b.transparent
  );
}

export interface MaterialDiffRow {
  materialName: string;
  property: string;
  before: string | number | boolean;
  after: string | number | boolean;
  changed: boolean;
}

export function diffSnapshots(
  before: MaterialSnapshot,
  after: MaterialSnapshot,
): MaterialDiffRow[] {
  const props: (keyof MaterialSnapshot)[] = [
    "colorHex",
    "metalness",
    "roughness",
    "opacity",
    "transparent",
  ];
  return props.map((prop) => ({
    materialName: before.name,
    property: prop,
    before: before[prop],
    after: after[prop],
    changed: before[prop] !== after[prop],
  }));
}

export interface CameraPoseRecord {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  sequence: number;
}

// --- Checksum verification -------------------------------------------

export async function sha256OfArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface ChecksumResult {
  url: string;
  actualSha256: string;
  requiredSha256: string;
  matches: boolean;
  byteLength: number;
  checkedAt: string;
}

export async function verifyGlbChecksum(
  url: string,
  requiredSha256: string,
  timestampLabel: string,
): Promise<ChecksumResult> {
  const response = await fetch(url, { cache: "no-store" });
  const buffer = await response.arrayBuffer();
  const actualSha256 = await sha256OfArrayBuffer(buffer);
  return {
    url,
    actualSha256,
    requiredSha256: requiredSha256.toLowerCase(),
    matches: actualSha256.toLowerCase() === requiredSha256.toLowerCase(),
    byteLength: buffer.byteLength,
    checkedAt: timestampLabel,
  };
}

// --- Evidence log ------------------------------------------------------

export interface HistoryLogRow {
  sequence: number;
  action: string;
  rejected: boolean;
  reason?: string;
  resultingKind: string;
  resultingColorHex: string | null;
}

export interface ScreenshotLogRow {
  sequence: number;
  filename: string;
  view: string;
  stateLabel: string;
}

export interface ProtectedCheckRow {
  materialName: string;
  stepLabel: string;
  unchanged: boolean;
}

export interface BydRim01EvidenceBundle {
  spike_id: "BYD-RIM-01";
  vehicle_id: "byd-seal";
  asset_sha256: string;
  capability_id: "rimColor";
  candidate_nodes: string[];
  candidate_materials: string[];
  parts_map_version: "spike-local-not-registry";
  registry_version: "not_modified";
  environment: "local_technical_validation";
  before_evidence: MaterialSnapshot[];
  after_evidence: MaterialSnapshot[];
  material_diffs: MaterialDiffRow[];
  restoration_result: "passed" | "failed" | "not_yet_tested";
  runtime_result: "passed" | "failed" | "inconclusive";
  warnings: string[];
  // Extended fields beyond the minimum required schema.
  checksum_before: ChecksumResult | null;
  checksum_after: ChecksumResult | null;
  protected_material_checks: ProtectedCheckRow[];
  history_log: HistoryLogRow[];
  camera_poses: CameraPoseRecord[];
  screenshots: ScreenshotLogRow[];
  cleanup_log: string[];
  generated_at_label: string;
}

// --- Download / save helpers --------------------------------------------

export function downloadTextFile(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown) {
  downloadTextFile(filename, JSON.stringify(data, null, 2), "application/json");
}

export function toCsv(rows: MaterialDiffRow[]): string {
  const header = "materialName,property,before,after,changed";
  const lines = rows.map(
    (r) => `${r.materialName},${r.property},${String(r.before)},${String(r.after)},${r.changed}`,
  );
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, rows: MaterialDiffRow[]) {
  downloadTextFile(filename, toCsv(rows), "text/csv");
}

export function dataUrlFromCanvas(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Optional directory-handle based saving (Chromium only). Returns null if
// unsupported or the user cancels the picker.
export async function pickEvidenceDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const picker = (
    window as unknown as { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }
  ).showDirectoryPicker;
  if (!picker) return null;
  try {
    return await picker();
  } catch {
    return null;
  }
}

export async function saveIntoDirectory(
  dir: FileSystemDirectoryHandle,
  filename: string,
  data: Blob | string,
) {
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = /data:(.*);base64/.exec(meta);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
