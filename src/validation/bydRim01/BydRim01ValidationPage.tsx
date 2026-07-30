// src/validation/bydRim01/BydRim01ValidationPage.tsx
//
// BYD-RIM-01 runtime validation spike. Fully isolated from the production
// BMW viewer: own <Canvas>, own GLB load, own camera rig, own material map
// (./bydRim01PartsMap.ts — never merged into src/config/partsMap.ts).
// Nothing here is imported by App.tsx / GarageCanvas.tsx / CarModel.tsx, and
// this component itself only ever renders when main.tsx sees
// ?spike=byd-rim-01 in the URL.
//
// This is validation tooling, not a product feature. Every control is
// diagnostic-only per TASK_BRIEF_FOR_CLAUDE_CODE.md: rimColor stays
// validation_gated/pending regardless of what this page proves.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  BYD_RIM_01_MODEL_PATH,
  BYD_RIM_01_REQUIRED_SHA256,
  CANDIDATE_MATERIAL_NAME,
  CANDIDATE_NODES,
  DIAGNOSTIC_BRIGHT_COLOR,
  DIAGNOSTIC_DARK_COLOR,
  EXPECTED_MATERIAL_ROSTER,
} from "./bydRim01PartsMap";
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

useGLTF.preload(BYD_RIM_01_MODEL_PATH);

const NORMALIZED_SIZE = 4.5;
const DIAGNOSTIC_METALNESS = 0.55;
const DIAGNOSTIC_ROUGHNESS = 0.35;

type ClusterKey = "x-z-" | "x-z+" | "x+z-" | "x+z+";
type ViewId = "full" | "FL" | "FR" | "RL" | "RR" | "tire" | "brake" | "badge";

interface FocusTarget {
  center: THREE.Vector3;
  radius: number;
}

interface FocusResolver {
  full: FocusTarget;
  FL: FocusTarget;
  FR: FocusTarget;
  RL: FocusTarget;
  RR: FocusTarget;
  tire: FocusTarget;
  brake: FocusTarget;
  badge: FocusTarget;
  wheelVertexCounts: Record<ClusterKey, number>;
}

interface SceneApi {
  camera: THREE.PerspectiveCamera;
  controls: { target: THREE.Vector3; update: () => void } | null;
  gl: THREE.WebGLRenderer;
}

function computeClusters(
  mesh: THREE.Mesh,
): Record<ClusterKey, FocusTarget & { vertexCount: number }> {
  mesh.updateWorldMatrix(true, false);
  const posAttr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  const overallBox = new THREE.Box3().setFromObject(mesh);
  const overallCenter = overallBox.getCenter(new THREE.Vector3());

  const boxes: Record<ClusterKey, THREE.Box3> = {
    "x-z-": new THREE.Box3(),
    "x-z+": new THREE.Box3(),
    "x+z-": new THREE.Box3(),
    "x+z+": new THREE.Box3(),
  };
  const counts: Record<ClusterKey, number> = { "x-z-": 0, "x-z+": 0, "x+z-": 0, "x+z+": 0 };

  const v = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);
    mesh.localToWorld(v);
    const key =
      `${v.x >= overallCenter.x ? "x+" : "x-"}${v.z >= overallCenter.z ? "z+" : "z-"}` as ClusterKey;
    boxes[key].expandByPoint(v);
    counts[key]++;
  }

  const result = {} as Record<ClusterKey, FocusTarget & { vertexCount: number }>;
  (Object.keys(boxes) as ClusterKey[]).forEach((key) => {
    const box = boxes[key];
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    result[key] = {
      center,
      radius: Math.max(size.x, size.y, size.z) / 2 || 0.1,
      vertexCount: counts[key],
    };
  });
  return result;
}

function boundingSphereOf(object: THREE.Object3D): FocusTarget {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return { center, radius: Math.max(size.x, size.y, size.z) / 2 || 0.1 };
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

// Lives inside <Canvas> (useThree requirement); exposes camera/controls/gl
// to the parent page via a plain mutable ref, mirroring the PoseTracker
// pattern already used in GarageCanvas.tsx — but this is an independent
// implementation, not an import from it.
function SceneApiExporter({ apiRef }: { apiRef: React.MutableRefObject<SceneApi | null> }) {
  const { camera, controls, gl } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      apiRef.current = { camera, controls: controls as SceneApi["controls"], gl };
    }
  }, [camera, controls, gl, apiRef]);
  return null;
}

function BydSealModel({
  onReady,
}: {
  onReady: (info: {
    clonedScene: THREE.Group;
    rimMaterial: THREE.MeshStandardMaterial;
    originalSnapshot: MaterialSnapshot;
    protectedMaterials: Map<string, THREE.MeshStandardMaterial>;
    protectedBeforeSnapshots: Map<string, MaterialSnapshot>;
    focusResolver: FocusResolver;
    warnings: string[];
  }) => void;
}) {
  const { scene, materials } = useGLTF(BYD_RIM_01_MODEL_PATH);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const setupRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    if (setupRef.current === clonedScene) return;
    setupRef.current = clonedScene;

    const warnings: string[] = [];

    // Center + normalize, same convention as the production CarModel.tsx,
    // so validation framing behaves consistently with the rest of the app.
    const rawBox = new THREE.Box3().setFromObject(clonedScene);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);
    const scale = maxDim > 0 ? NORMALIZED_SIZE / maxDim : 1;
    clonedScene.scale.setScalar(scale);
    const scaledBox = new THREE.Box3().setFromObject(clonedScene);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    clonedScene.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);
    clonedScene.updateMatrixWorld(true);

    const original = materials[CANDIDATE_MATERIAL_NAME] as THREE.MeshStandardMaterial | undefined;
    if (!original) {
      warnings.push(
        `STOP CONDITION: material "${CANDIDATE_MATERIAL_NAME}" not found in loaded GLB.`,
      );
      onReady({
        clonedScene,
        rimMaterial: new THREE.MeshStandardMaterial(),
        originalSnapshot: {
          name: CANDIDATE_MATERIAL_NAME,
          colorHex: "#000000",
          metalness: 0,
          roughness: 1,
          opacity: 1,
          transparent: false,
        },
        protectedMaterials: new Map(),
        protectedBeforeSnapshots: new Map(),
        focusResolver: {
          full: boundingSphereOf(clonedScene),
          FL: boundingSphereOf(clonedScene),
          FR: boundingSphereOf(clonedScene),
          RL: boundingSphereOf(clonedScene),
          RR: boundingSphereOf(clonedScene),
          tire: boundingSphereOf(clonedScene),
          brake: boundingSphereOf(clonedScene),
          badge: boundingSphereOf(clonedScene),
          wheelVertexCounts: { "x-z-": 0, "x-z+": 0, "x+z-": 0, "x+z+": 0 },
        },
        warnings,
      });
      return;
    }

    const rimMaterial = original.clone();
    rimMaterial.name = original.name;
    const originalSnapshot = snapshotMaterial(original);

    let assignedCandidateNodes = 0;
    let blkRimMesh: THREE.Mesh | null = null;
    let tireMesh: THREE.Mesh | null = null;
    let brakeMesh: THREE.Mesh | null = null;
    let badgeMesh: THREE.Mesh | null = null;
    const protectedMaterials = new Map<string, THREE.MeshStandardMaterial>();

    clonedScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material as THREE.MeshStandardMaterial;

      if ((CANDIDATE_NODES as readonly string[]).includes(obj.name)) {
        obj.material = rimMaterial;
        assignedCandidateNodes++;
        if (obj.name === "blk_B_Rim_0") blkRimMesh = obj;
        return;
      }

      if (mat?.name) {
        if (!protectedMaterials.has(mat.name)) {
          protectedMaterials.set(mat.name, mat);
        }
      }

      if (obj.name === "tyre_tire_0") tireMesh = obj;
      if (obj.name === "disk_phong27breaks_0") brakeMesh = obj;
      if (obj.name === "badges_rim_Badges_0") badgeMesh = obj;
    });

    if (assignedCandidateNodes !== CANDIDATE_NODES.length) {
      warnings.push(
        `STOP CONDITION: expected ${CANDIDATE_NODES.length} candidate nodes (${CANDIDATE_NODES.join(", ")}), found ${assignedCandidateNodes}.`,
      );
    }

    const foundMaterialNames = new Set<string>([
      CANDIDATE_MATERIAL_NAME,
      ...protectedMaterials.keys(),
    ]);
    const missingFromRoster = EXPECTED_MATERIAL_ROSTER.filter((n) => !foundMaterialNames.has(n));
    const unexpectedMaterials = Array.from(foundMaterialNames).filter(
      (n) => !(EXPECTED_MATERIAL_ROSTER as readonly string[]).includes(n),
    );
    if (missingFromRoster.length > 0) {
      warnings.push(
        `Materials expected but not found at runtime: ${missingFromRoster.join(", ")}.`,
      );
    }
    if (unexpectedMaterials.length > 0) {
      warnings.push(
        `STOP CONDITION: unexpected material(s) not in the confirmed roster: ${unexpectedMaterials.join(", ")}.`,
      );
    }

    const protectedBeforeSnapshots = new Map<string, MaterialSnapshot>();
    protectedMaterials.forEach((mat, name) =>
      protectedBeforeSnapshots.set(name, snapshotMaterial(mat)),
    );

    const wheelClusters = blkRimMesh
      ? computeClusters(blkRimMesh)
      : ({
          "x-z-": { center: new THREE.Vector3(), radius: 0.3, vertexCount: 0 },
          "x-z+": { center: new THREE.Vector3(), radius: 0.3, vertexCount: 0 },
          "x+z-": { center: new THREE.Vector3(), radius: 0.3, vertexCount: 0 },
          "x+z+": { center: new THREE.Vector3(), radius: 0.3, vertexCount: 0 },
        } as Record<ClusterKey, FocusTarget & { vertexCount: number }>);

    if (!blkRimMesh) {
      warnings.push(
        'Could not locate "blk_B_Rim_0" for wheel-cluster derivation; camera framing will be approximate.',
      );
    }

    // Orientation is confirmed visually, not assumed from names — the
    // wizard's "Full Vehicle" step is the first capture, and the operator
    // confirms which cluster is actually the front before trusting FL/FR/
    // RL/RR labels in the report. Default mapping assumes front faces +Z.
    const focusResolver: FocusResolver = {
      full: boundingSphereOf(clonedScene),
      FL: wheelClusters["x+z+"],
      FR: wheelClusters["x-z+"],
      RL: wheelClusters["x+z-"],
      RR: wheelClusters["x-z-"],
      tire: tireMesh ? boundingSphereOf(tireMesh) : boundingSphereOf(clonedScene),
      brake: brakeMesh ? boundingSphereOf(brakeMesh) : boundingSphereOf(clonedScene),
      badge: badgeMesh ? boundingSphereOf(badgeMesh) : boundingSphereOf(clonedScene),
      wheelVertexCounts: {
        "x-z-": wheelClusters["x-z-"].vertexCount,
        "x-z+": wheelClusters["x-z+"].vertexCount,
        "x+z-": wheelClusters["x+z-"].vertexCount,
        "x+z+": wheelClusters["x+z+"].vertexCount,
      },
    };

    onReady({
      clonedScene,
      rimMaterial,
      originalSnapshot,
      protectedMaterials,
      protectedBeforeSnapshots,
      focusResolver,
      warnings,
    });
  }, [clonedScene, materials, onReady]);

  return <primitive object={clonedScene} />;
}

type LoadState = "checking_checksum" | "blocked_checksum" | "loading_model" | "ready" | "error";

const CAPTURE_VIEWS: { id: ViewId; label: string }[] = [
  { id: "full", label: "Full Vehicle" },
  { id: "FL", label: "Front-Left Wheel" },
  { id: "FR", label: "Front-Right Wheel" },
  { id: "RL", label: "Rear-Left Wheel" },
  { id: "RR", label: "Rear-Right Wheel" },
];

const PROTECTED_VIEWS: { id: ViewId; label: string }[] = [
  { id: "tire", label: "Protected — Tire Close-up" },
  { id: "brake", label: "Protected — Brake Close-up" },
  { id: "badge", label: "Protected — Badge Close-up" },
];

const ALL_VIEWS = [...CAPTURE_VIEWS, ...PROTECTED_VIEWS];

export function BydRim01ValidationPage() {
  const [loadState, setLoadState] = useState<LoadState>("checking_checksum");
  const [checksumBefore, setChecksumBefore] = useState<ChecksumResult | null>(null);
  const [checksumAfter, setChecksumAfter] = useState<ChecksumResult | null>(null);
  const [history, setHistory] = useState<BydRimHistoryState>(createInitialHistory());
  const [activeView, setActiveView] = useState<ViewId>("full");
  const [cleanupDone, setCleanupDone] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState<string>("");
  const [modelInfo, setModelInfo] = useState<{
    clonedScene: THREE.Group;
    rimMaterial: THREE.MeshStandardMaterial;
    originalSnapshot: MaterialSnapshot;
    protectedMaterials: Map<string, THREE.MeshStandardMaterial>;
    protectedBeforeSnapshots: Map<string, MaterialSnapshot>;
    focusResolver: FocusResolver;
  } | null>(null);

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

  // --- Checksum verification before any mutation is possible -------------
  useEffect(() => {
    let cancelled = false;
    verifyGlbChecksum(BYD_RIM_01_MODEL_PATH, BYD_RIM_01_REQUIRED_SHA256, "before_load").then(
      (result) => {
        if (cancelled) return;
        setChecksumBefore(result);
        if (!result.matches) {
          setLoadState("blocked_checksum");
          warningsRef.current.push(
            `BLOCKED_ASSET_CHECKSUM_MISMATCH: expected ${result.requiredSha256}, got ${result.actualSha256}.`,
          );
        } else {
          setLoadState("loading_model");
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const handleModelReady = useCallback(
    (info: Parameters<Parameters<typeof BydSealModel>[0]["onReady"]>[0]) => {
      warningsRef.current.push(...info.warnings);
      setModelInfo({
        clonedScene: info.clonedScene,
        rimMaterial: info.rimMaterial,
        originalSnapshot: info.originalSnapshot,
        protectedMaterials: info.protectedMaterials,
        protectedBeforeSnapshots: info.protectedBeforeSnapshots,
        focusResolver: info.focusResolver,
      });
      lastAppliedSnapshotRef.current = info.originalSnapshot;
      setLoadState("ready");
    },
    [],
  );

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

  const handlePickDirectory = useCallback(async () => {
    const dir = await pickEvidenceDirectory();
    directoryHandleRef.current = dir;
    setLastActionMessage(
      dir
        ? "Evidence folder selected — screenshots and exports will save directly there."
        : "No folder selected (or unsupported browser) — files will use normal browser downloads instead.",
    );
  }, []);

  const handleRunCleanup = useCallback(async () => {
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

  const handleExportEvidence = useCallback(async () => {
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

  if (loadState === "blocked_checksum") {
    return (
      <div style={styles.blockedScreen}>
        <h1>BLOCKED_ASSET_CHECKSUM_MISMATCH</h1>
        <p>The loaded GLB's SHA-256 does not match the required authorized checksum.</p>
        <p>Required: {BYD_RIM_01_REQUIRED_SHA256}</p>
        <p>Actual: {checksumBefore?.actualSha256}</p>
        <p>No material was touched. Stopping per the Task Brief's stop condition.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <h2 style={styles.h2}>BYD-RIM-01 Validation Spike</h2>
        <p style={styles.small}>
          Candidate: <code>{CANDIDATE_MATERIAL_NAME}</code> via {CANDIDATE_NODES.join(", ")}
          <br />
          Checksum before:{" "}
          {checksumBefore ? (checksumBefore.matches ? "MATCH" : "MISMATCH") : "checking..."}
        </p>

        <section style={styles.section}>
          <h3 style={styles.h3}>1. Views</h3>
          {ALL_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              style={styles.button}
              onClick={() => goToView(v.id)}
              disabled={loadState !== "ready"}
            >
              {v.label}
            </button>
          ))}
        </section>

        <section style={styles.section}>
          <h3 style={styles.h3}>2. Diagnostic Controls</h3>
          <button
            type="button"
            style={styles.button}
            disabled={loadState !== "ready"}
            onClick={() =>
              dispatchHistory(
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
            Apply Bright Diagnostic Color
          </button>
          <button
            type="button"
            style={styles.button}
            disabled={loadState !== "ready"}
            onClick={() =>
              dispatchHistory(
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
            Apply Dark Diagnostic Color
          </button>
          <button
            type="button"
            style={styles.button}
            disabled={loadState !== "ready"}
            onClick={() => dispatchHistory({ type: "undo" }, "Undo")}
          >
            Undo
          </button>
          <button
            type="button"
            style={styles.button}
            disabled={loadState !== "ready"}
            onClick={() => dispatchHistory({ type: "redo" }, "Redo")}
          >
            Redo
          </button>
          <button
            type="button"
            style={styles.button}
            disabled={loadState !== "ready"}
            onClick={() => dispatchHistory({ type: "returnToOriginal" }, "Return to Original")}
          >
            Return to Original
          </button>
        </section>

        <section style={styles.section}>
          <h3 style={styles.h3}>3. Failure Injection</h3>
          <button
            type="button"
            style={styles.button}
            disabled={loadState !== "ready"}
            onClick={() => dispatchHistory({ type: "injectFailure" }, "Inject Failed Operation")}
          >
            Inject Failed Operation
          </button>
          <button
            type="button"
            style={styles.button}
            disabled={loadState !== "ready"}
            onClick={() =>
              dispatchHistory({ type: "restoreAfterFailure" }, "Restore After Failure")
            }
          >
            Restore After Failure
          </button>
        </section>

        <section style={styles.section}>
          <h3 style={styles.h3}>4. Evidence</h3>
          <button type="button" style={styles.button} onClick={handlePickDirectory}>
            Choose Evidence Folder (optional)
          </button>
          <button
            type="button"
            style={styles.button}
            disabled={loadState !== "ready"}
            onClick={() => captureScreenshot(currentEntry(history).kind)}
          >
            Capture Screenshot
          </button>
          <button
            type="button"
            style={styles.button}
            disabled={loadState !== "ready"}
            onClick={handleRunCleanup}
          >
            Run Cleanup
          </button>
          <button
            type="button"
            style={styles.button}
            disabled={!cleanupDone}
            onClick={handleExportEvidence}
          >
            Export Evidence Package
          </button>
        </section>

        <p style={styles.small}>
          History: {history.entries.map((e) => e.label).join(" → ")} (pointer {history.pointer})
          {history.failureInjected ? " — FAILURE INJECTED, restore before continuing" : ""}
        </p>
        <p style={styles.small}>{lastActionMessage}</p>
      </div>

      <div style={styles.canvasArea}>
        <Canvas
          shadows
          gl={{ preserveDrawingBuffer: true }}
          camera={{ position: [5, 4, 6], fov: 40, near: 0.05, far: 1000 }}
          dpr={[1, 2]}
        >
          <color attach="background" args={["#0A0A0C"]} />
          <hemisphereLight intensity={0.5} groundColor="#0a0a0c" />
          <directionalLight position={[5, 6, 5]} intensity={1.2} />
          <gridHelper args={[12, 24]} />
          <BydSealModel onReady={handleModelReady} />
          <SceneApiExporter apiRef={sceneApiRef} />
        </Canvas>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "flex", height: "100vh", fontFamily: "sans-serif", background: "#111" },
  sidebar: {
    width: 320,
    overflowY: "auto",
    padding: "12px",
    color: "#eee",
    background: "#1a1a1d",
    boxSizing: "border-box",
  },
  canvasArea: { flex: 1 },
  section: { marginBottom: "16px", display: "flex", flexDirection: "column", gap: "4px" },
  button: { padding: "6px 8px", fontSize: "12px", cursor: "pointer", textAlign: "left" },
  h2: { fontSize: "16px", marginBottom: "4px" },
  h3: { fontSize: "13px", marginBottom: "4px", color: "#aaa" },
  small: { fontSize: "11px", color: "#999", wordBreak: "break-all" },
  blockedScreen: {
    padding: "40px",
    color: "#fff",
    background: "#3a0000",
    fontFamily: "sans-serif",
    height: "100vh",
  },
};

export default BydRim01ValidationPage;
