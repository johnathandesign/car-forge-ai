// src/validation/bydRim01/useBydRim01Validation.ts
//
// Validation-harness-only state and actions for BYD-RIM-01: target
// resolution, Undo/Redo/failure-injection history, camera evidence,
// cleanup, and evidence export. No production business logic — this hook
// is never imported by CarModel.tsx, partsMap.ts, or any product-mode code
// path, and it does not by itself expose any UI.

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  BYD_RIM_01_MODEL_PATH,
  BYD_RIM_01_REQUIRED_SHA256,
  CANDIDATE_MATERIAL_NAME,
  CANDIDATE_NODES,
} from "./bydRim01PartsMap";
import type { BydSealModelReadyInfo, FocusTarget } from "./BydSealModel";
import {
  createInitialHistory,
  currentEntry,
  reduceBydRimHistory,
  type BydRimHistoryState,
} from "./history";
import {
  dataUrlFromCanvas,
  dataUrlToBlob,
  diffSnapshots,
  downloadCsv,
  downloadDataUrl,
  downloadJson,
  pickEvidenceDirectory,
  saveIntoDirectory,
  snapshotMaterial,
  snapshotsEqual,
  verifyGlbChecksum,
  type BydRim01EvidenceBundle,
  type CameraPoseRecord,
  type ChecksumResult,
  type HistoryLogRow,
  type MaterialDiffRow,
  type MaterialSnapshot,
  type ProtectedCheckRow,
  type ScreenshotLogRow,
} from "./evidence";

const DIAGNOSTIC_METALNESS = 0.55;
const DIAGNOSTIC_ROUGHNESS = 0.35;

export type ViewId = "full" | "FL" | "FR" | "RL" | "RR" | "tire" | "brake" | "badge";

export interface SceneApi {
  camera: THREE.PerspectiveCamera;
  controls: { target: THREE.Vector3; update: () => void } | null;
  gl: THREE.WebGLRenderer;
}

// Mounts inside <Canvas> (useThree requires it) only while validationMode
// and vehicle==="byd" are both true. Populates the caller-owned sceneApiRef
// so actions invoked from outside the Canvas (the selector's side panel)
// can still reach the live camera/controls/renderer.
export function BydSceneApiBridge({ apiRef }: { apiRef: MutableRefObject<SceneApi | null> }) {
  const { camera, controls, gl } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      apiRef.current = { camera, controls: controls as SceneApi["controls"], gl };
    }
    return () => {
      apiRef.current = null;
    };
  }, [camera, controls, gl, apiRef]);
  return null;
}

function focusCamera(api: SceneApi, target: FocusTarget, distanceMultiplier: number) {
  const distance = Math.max(target.radius * distanceMultiplier, 0.08);
  const offset = new THREE.Vector3(0.85, 0.5, 0.95).normalize().multiplyScalar(distance);
  api.camera.position.copy(target.center).add(offset);
  api.camera.fov = 40;
  api.camera.updateProjectionMatrix();
  api.camera.lookAt(target.center);
  if (api.controls) {
    api.controls.target.copy(target.center);
    api.controls.update();
  }
}

export function useBydRim01Validation() {
  const [checksumBefore, setChecksumBefore] = useState<ChecksumResult | null>(null);
  const [checksumAfter, setChecksumAfter] = useState<ChecksumResult | null>(null);
  const [checksumBlocked, setChecksumBlocked] = useState(false);
  const [history, setHistory] = useState<BydRimHistoryState>(createInitialHistory());
  const [activeView, setActiveView] = useState<ViewId>("full");
  const [cleanupDone, setCleanupDone] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState("");
  const [modelInfo, setModelInfo] = useState<BydSealModelReadyInfo | null>(null);

  const sceneApiRef = useRef<SceneApi | null>(null);
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const sequenceRef = useRef(0);
  const historyLogRef = useRef<HistoryLogRow[]>([]);
  const protectedCheckLogRef = useRef<ProtectedCheckRow[]>([]);
  const cameraPosesRef = useRef<CameraPoseRecord[]>([]);
  const screenshotsRef = useRef<ScreenshotLogRow[]>([]);
  const cleanupLogRef = useRef<string[]>([]);
  const warningsRef = useRef<string[]>([]);
  const materialDiffsRef = useRef<MaterialDiffRow[]>([]);
  const lastAppliedSnapshotRef = useRef<MaterialSnapshot | null>(null);

  const nextSequence = useCallback(() => {
    sequenceRef.current += 1;
    return sequenceRef.current;
  }, []);

  const verifyChecksumBeforeLoad = useCallback(async () => {
    const result = await verifyGlbChecksum(
      BYD_RIM_01_MODEL_PATH,
      BYD_RIM_01_REQUIRED_SHA256,
      "before_load",
    );
    setChecksumBefore(result);
    if (!result.matches) {
      setChecksumBlocked(true);
      warningsRef.current.push(
        `BLOCKED_ASSET_CHECKSUM_MISMATCH: expected ${result.requiredSha256}, got ${result.actualSha256}.`,
      );
    }
    return result;
  }, []);

  const registerModelInfo = useCallback((info: BydSealModelReadyInfo) => {
    warningsRef.current.push(...info.warnings);
    setModelInfo(info);
    lastAppliedSnapshotRef.current = info.originalSnapshot;
  }, []);

  // Clears every piece of BYD-RIM-01 validation state. Called by the
  // selector whenever vehicles are switched (away from BYD, or back into
  // BYD fresh) so no stale history/evidence/bindings survive a switch.
  const resetValidationState = useCallback(() => {
    setHistory(createInitialHistory());
    setActiveView("full");
    setCleanupDone(false);
    setLastActionMessage("");
    setModelInfo(null);
    setChecksumBefore(null);
    setChecksumAfter(null);
    setChecksumBlocked(false);
    sceneApiRef.current = null;
    directoryHandleRef.current = null;
    sequenceRef.current = 0;
    historyLogRef.current = [];
    protectedCheckLogRef.current = [];
    cameraPosesRef.current = [];
    screenshotsRef.current = [];
    cleanupLogRef.current = [];
    warningsRef.current = [];
    materialDiffsRef.current = [];
    lastAppliedSnapshotRef.current = null;
  }, []);

  const applyEntryToMaterial = useCallback(
    (entry: BydRimHistoryState["entries"][number]) => {
      if (!modelInfo) return;
      const mat = modelInfo.rimMaterial;
      if (entry.kind === "original") {
        const orig = modelInfo.originalSnapshot;
        mat.color.set(orig.colorHex);
        mat.metalness = orig.metalness;
        mat.roughness = orig.roughness;
        mat.opacity = orig.opacity;
        mat.transparent = orig.transparent;
      } else {
        mat.color.set(entry.colorHex!);
        mat.metalness = DIAGNOSTIC_METALNESS;
        mat.roughness = DIAGNOSTIC_ROUGHNESS;
        mat.opacity = 1;
        mat.transparent = false;
      }
      mat.needsUpdate = true;
      lastAppliedSnapshotRef.current = snapshotMaterial(mat);
    },
    [modelInfo],
  );

  const checkProtectedMaterials = useCallback(
    (stepLabel: string) => {
      if (!modelInfo) return;
      modelInfo.protectedMaterials.forEach((mat, name) => {
        const before = modelInfo.protectedBeforeSnapshots.get(name)!;
        const now = snapshotMaterial(mat);
        const unchanged = snapshotsEqual(before, now);
        protectedCheckLogRef.current.push({ materialName: name, stepLabel, unchanged });
        if (!unchanged) {
          warningsRef.current.push(
            `STOP CONDITION: protected material "${name}" changed at step "${stepLabel}".`,
          );
        }
      });
    },
    [modelInfo],
  );

  const recordDiffAgainstOriginal = useCallback(
    (stepLabel: string) => {
      if (!modelInfo || !lastAppliedSnapshotRef.current) return;
      const rows = diffSnapshots(modelInfo.originalSnapshot, lastAppliedSnapshotRef.current).map(
        (r) => ({
          ...r,
          materialName: `${r.materialName} (${stepLabel})`,
        }),
      );
      materialDiffsRef.current.push(...rows);
    },
    [modelInfo],
  );

  const dispatchHistory = useCallback(
    (action: Parameters<typeof reduceBydRimHistory>[1], label: string) => {
      const result = reduceBydRimHistory(history, action);
      const entry = currentEntry(result.next);
      historyLogRef.current.push({
        sequence: nextSequence(),
        action: label,
        rejected: result.rejected,
        reason: result.reason,
        resultingKind: entry.kind,
        resultingColorHex: entry.colorHex,
      });
      setHistory(result.next);
      if (!result.rejected) {
        if (action.type !== "injectFailure") {
          applyEntryToMaterial(entry);
        }
        recordDiffAgainstOriginal(label);
        checkProtectedMaterials(label);
      }
      setLastActionMessage(result.rejected ? `Rejected: ${result.reason}` : `Applied: ${label}`);
    },
    [
      history,
      nextSequence,
      applyEntryToMaterial,
      recordDiffAgainstOriginal,
      checkProtectedMaterials,
    ],
  );

  const goToView = useCallback(
    (view: ViewId) => {
      setActiveView(view);
      if (!sceneApiRef.current || !modelInfo) return;
      const target = modelInfo.focusResolver[view];
      const multiplier = view === "full" ? 2.6 : 3.6;
      focusCamera(sceneApiRef.current, target, multiplier);
      const seq = nextSequence();
      cameraPosesRef.current.push({
        label: view,
        position: [
          sceneApiRef.current.camera.position.x,
          sceneApiRef.current.camera.position.y,
          sceneApiRef.current.camera.position.z,
        ],
        target: [target.center.x, target.center.y, target.center.z],
        fov: sceneApiRef.current.camera.fov,
        sequence: seq,
      });
    },
    [modelInfo, nextSequence],
  );

  const captureScreenshot = useCallback(
    async (stateLabel: string) => {
      if (!sceneApiRef.current) return;
      const dataUrl = dataUrlFromCanvas(sceneApiRef.current.gl.domElement);
      const filename = `BYD_RIM01_${activeView}_${stateLabel}_${String(nextSequence()).padStart(3, "0")}.png`;
      if (directoryHandleRef.current) {
        await saveIntoDirectory(directoryHandleRef.current, filename, dataUrlToBlob(dataUrl));
      } else {
        downloadDataUrl(filename, dataUrl);
      }
      screenshotsRef.current.push({
        sequence: sequenceRef.current,
        filename,
        view: activeView,
        stateLabel,
      });
      setLastActionMessage(`Captured screenshot: ${filename}`);
    },
    [activeView, nextSequence],
  );

  const pickDirectory = useCallback(async () => {
    const dir = await pickEvidenceDirectory();
    directoryHandleRef.current = dir;
    setLastActionMessage(
      dir
        ? "Evidence folder selected — screenshots and exports will save directly there."
        : "No folder selected (or unsupported browser) — files will use normal browser downloads instead.",
    );
  }, []);

  const runCleanup = useCallback(async () => {
    if (modelInfo) {
      modelInfo.rimMaterial.dispose();
      cleanupLogRef.current.push(
        `Disposed cloned "${CANDIDATE_MATERIAL_NAME}" material (the one resource this spike created).`,
      );
      cleanupLogRef.current.push(
        "Base GLTF scene/materials/textures remain owned by the @react-three/drei GLTF cache and are not disposed here by design.",
      );
    }
    const after = await verifyGlbChecksum(
      BYD_RIM_01_MODEL_PATH,
      BYD_RIM_01_REQUIRED_SHA256,
      "after_cleanup",
    );
    setChecksumAfter(after);
    cleanupLogRef.current.push(
      after.matches
        ? `Post-cleanup checksum re-verified: matches (${after.actualSha256}).`
        : `POST-CLEANUP CHECKSUM MISMATCH: expected ${after.requiredSha256}, got ${after.actualSha256}.`,
    );
    if (!after.matches) {
      warningsRef.current.push("STOP CONDITION: source GLB changed during the session.");
    }
    setCleanupDone(true);
    setLastActionMessage("Cleanup complete.");
  }, [modelInfo]);

  const exportEvidence = useCallback(async () => {
    if (!modelInfo) return;
    const lastEntry = currentEntry(history);
    const restorationResult: BydRim01EvidenceBundle["restoration_result"] =
      lastEntry.kind === "original" && lastAppliedSnapshotRef.current
        ? snapshotsEqual(lastAppliedSnapshotRef.current, modelInfo.originalSnapshot)
          ? "passed"
          : "failed"
        : "not_yet_tested";

    const anyProtectedChanged = protectedCheckLogRef.current.some((r) => !r.unchanged);
    const runtimeResult: BydRim01EvidenceBundle["runtime_result"] = anyProtectedChanged
      ? "failed"
      : screenshotsRef.current.length > 0
        ? "passed"
        : "inconclusive";

    const bundle: BydRim01EvidenceBundle = {
      spike_id: "BYD-RIM-01",
      vehicle_id: "byd-seal",
      asset_sha256: checksumBefore?.actualSha256 ?? "",
      capability_id: "rimColor",
      candidate_nodes: [...CANDIDATE_NODES],
      candidate_materials: [CANDIDATE_MATERIAL_NAME],
      parts_map_version: "spike-local-not-registry",
      registry_version: "not_modified",
      environment: "local_technical_validation",
      before_evidence: [modelInfo.originalSnapshot],
      after_evidence: lastAppliedSnapshotRef.current ? [lastAppliedSnapshotRef.current] : [],
      material_diffs: materialDiffsRef.current,
      restoration_result: restorationResult,
      runtime_result: runtimeResult,
      warnings: warningsRef.current,
      checksum_before: checksumBefore,
      checksum_after: checksumAfter,
      protected_material_checks: protectedCheckLogRef.current,
      history_log: historyLogRef.current,
      camera_poses: cameraPosesRef.current,
      screenshots: screenshotsRef.current,
      cleanup_log: cleanupLogRef.current,
      generated_at_label: "operator-run",
    };

    const jsonName = "byd_rim_01_runtime_evidence.json";
    const csvName = "BYD_RIM_01_MATERIAL_DIFFS.csv";
    if (directoryHandleRef.current) {
      await saveIntoDirectory(
        directoryHandleRef.current,
        jsonName,
        JSON.stringify(bundle, null, 2),
      );
      await saveIntoDirectory(
        directoryHandleRef.current,
        csvName,
        materialDiffsRef.current
          .map((r) => `${r.materialName},${r.property},${r.before},${r.after},${r.changed}`)
          .join("\n"),
      );
    } else {
      downloadJson(jsonName, bundle);
      downloadCsv(csvName, materialDiffsRef.current);
    }
    setLastActionMessage("Evidence package exported.");
  }, [modelInfo, history, checksumBefore, checksumAfter]);

  return {
    sceneApiRef,
    checksumBefore,
    checksumAfter,
    checksumBlocked,
    history,
    activeView,
    cleanupDone,
    lastActionMessage,
    modelInfo,
    verifyChecksumBeforeLoad,
    registerModelInfo,
    resetValidationState,
    dispatchHistory,
    goToView,
    captureScreenshot,
    pickDirectory,
    runCleanup,
    exportEvidence,
  };
}
