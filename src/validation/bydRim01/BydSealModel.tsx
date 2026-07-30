// src/validation/bydRim01/BydSealModel.tsx
//
// Validation-only BYD Seal loader. Sibling to the production CarModel.tsx,
// never imported by it and never imports it. Does not reuse BMW's Parts Map
// role assumptions — BYD's material roster is structurally different (see
// bydRim01PartsMap.ts, confirmed by direct GLB inspection).
//
// Wheel positions are derived at runtime from actual geometry (vertex
// clustering), not hardcoded, because BYD's proportions differ from BMW's
// and a BMW-tuned camera preset would mis-frame BYD's wheels.

import { useEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  BYD_RIM_01_MODEL_PATH,
  CANDIDATE_MATERIAL_NAME,
  CANDIDATE_NODES,
  EXPECTED_MATERIAL_ROSTER,
} from "./bydRim01PartsMap";
import { snapshotMaterial, type MaterialSnapshot } from "./evidence";
import { applyWindowTintToMaterial, getWindowTintStrength } from "../../utils/windowTint";

// Confirmed by direct GLB inspection (public/models/byd_seal_final.glb, glTF
// JSON dumped and cross-checked) plus runtime click-inspection: these are the
// only "glass1"/"carp_2" nodes that are genuine passenger windows / roof
// glass. "glass1" is also shared by several light-lens meshes confirmed via
// click-inspection to sit outside every window/roof region ever hit
// (ind_light_glass1_0 = indicator lens, outer_gls*_glass1_0 = headlight
// outer lenses, outer_gls_red1_glass1_0 = taillight lens, glass_glass1_0 =
// unidentified — none of these are touched here).
const BYD_WINDOW_GLASS_NODES = new Set(["b_gls_glass1_0", "f_gls_glass1_0"]);
const BYD_WINDOW_GLASS_MATERIAL_NAME = "glass1";

// BYD Seal's fixed roof is genuine glass (confirmed visually), separate
// from the window material above.
const BYD_ROOF_GLASS_NODE = "roof_gls_carp_2_0";
const BYD_ROOF_GLASS_MATERIAL_NAME = "carp_2";

useGLTF.preload(BYD_RIM_01_MODEL_PATH);

const NORMALIZED_SIZE = 4.5;

export type ClusterKey = "x-z-" | "x-z+" | "x+z-" | "x+z+";

export interface FocusTarget {
  center: THREE.Vector3;
  radius: number;
}

export interface FocusResolver {
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

export interface BydSealModelReadyInfo {
  clonedScene: THREE.Group;
  rimMaterial: THREE.MeshStandardMaterial;
  originalSnapshot: MaterialSnapshot;
  protectedMaterials: Map<string, THREE.MeshStandardMaterial>;
  protectedBeforeSnapshots: Map<string, MaterialSnapshot>;
  focusResolver: FocusResolver;
  warnings: string[];
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

export function boundingSphereOf(object: THREE.Object3D): FocusTarget {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return { center, radius: Math.max(size.x, size.y, size.z) / 2 || 0.1 };
}

export function BydSealModel({
  bodyColor,
  rimColor,
  windowTint,
  onReady,
}: {
  bodyColor: string | null;
  rimColor: string | null;
  windowTint: number;
  onReady: (info: BydSealModelReadyInfo) => void;
}) {
  const { scene, materials } = useGLTF(BYD_RIM_01_MODEL_PATH);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const setupRef = useRef<THREE.Object3D | null>(null);
  const rimMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const originalRimColorRef = useRef<THREE.Color | null>(null);
  const originalRimMapRef = useRef<THREE.Texture | null>(null);
  const bodyMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const originalBodyColorRef = useRef<THREE.Color | null>(null);
  const originalBodyMapRef = useRef<THREE.Texture | null>(null);
  const glassMaterialRef = useRef<THREE.Material | null>(null);
  const glassBaselineRef = useRef<{
    color: THREE.Color;
    opacity: number;
    transmission?: number;
  } | null>(null);
  const roofGlassMaterialRef = useRef<THREE.Material | null>(null);
  const roofGlassBaselineRef = useRef<{
    color: THREE.Color;
    opacity: number;
    transmission?: number;
  } | null>(null);

  useEffect(() => {
    if (setupRef.current === clonedScene) return;
    setupRef.current = clonedScene;

    const warnings: string[] = [];

    // Same centering/normalization convention as the production CarModel.tsx
    // (largest dimension = 4.5), so validation framing behaves consistently
    // with the rest of the app — but this is independent code, not a shared
    // call into CarModel.tsx.
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
    rimMaterialRef.current = rimMaterial;
    originalRimColorRef.current = original.color.clone();
    originalRimMapRef.current = original.map;

    let bodyMaterial: THREE.MeshStandardMaterial | null = null;

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      const material = object.material;

      if (material instanceof THREE.MeshStandardMaterial && material.name === "Car_Paint") {
        if (!bodyMaterial) {
          bodyMaterial = material.clone();
          bodyMaterial.name = material.name;

          bodyMaterialRef.current = bodyMaterial;
          originalBodyColorRef.current = material.color.clone();
          originalBodyMapRef.current = material.map;
        }

        object.material = bodyMaterial;
      }
    });

    let glassMaterial: THREE.Material | null = null;
    let roofGlassMaterial: THREE.Material | null = null;

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      const material = object.material;
      if (Array.isArray(material) || !material) return;

      if (
        BYD_WINDOW_GLASS_NODES.has(object.name) &&
        material.name === BYD_WINDOW_GLASS_MATERIAL_NAME
      ) {
        if (!glassMaterial) {
          const created = material.clone();
          created.name = material.name;
          glassMaterial = created;
          glassMaterialRef.current = created;

          const source = material as THREE.MeshPhysicalMaterial;
          glassBaselineRef.current = {
            color: source.color.clone(),
            opacity: source.opacity,
            transmission: source.transmission,
          };
        }

        object.material = glassMaterial;
        return;
      }

      if (object.name === BYD_ROOF_GLASS_NODE && material.name === BYD_ROOF_GLASS_MATERIAL_NAME) {
        if (!roofGlassMaterial) {
          const created = material.clone();
          created.name = material.name;
          roofGlassMaterial = created;
          roofGlassMaterialRef.current = created;

          const source = material as THREE.MeshPhysicalMaterial;
          roofGlassBaselineRef.current = {
            color: source.color.clone(),
            opacity: source.opacity,
            transmission: source.transmission,
          };
        }

        object.material = roofGlassMaterial;
      }
    });

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

      if (mat?.name && !protectedMaterials.has(mat.name)) {
        protectedMaterials.set(mat.name, mat);
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

    // Orientation (front is +Z) is a default assumption confirmed visually
    // by the operator on the Full Vehicle screenshot, not asserted as fact.
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

  useEffect(() => {
    const bodyMaterial = bodyMaterialRef.current;
    const originalColor = originalBodyColorRef.current;

    if (!bodyMaterial || !originalColor) {
      return;
    }

    if (bodyColor === null) {
      bodyMaterial.color.copy(originalColor);
      bodyMaterial.map = originalBodyMapRef.current;
    } else {
      bodyMaterial.color.set(bodyColor);
      bodyMaterial.map = null;
    }

    bodyMaterial.needsUpdate = true;
  }, [bodyColor]);

  useEffect(() => {
    const rimMaterial = rimMaterialRef.current;
    const originalColor = originalRimColorRef.current;

    if (!rimMaterial || !originalColor) {
      return;
    }

    if (rimColor === null) {
      rimMaterial.color.copy(originalColor);
      rimMaterial.map = originalRimMapRef.current;
    } else {
      rimMaterial.color.set(rimColor);
      rimMaterial.map = null;
    }

    rimMaterial.needsUpdate = true;
  }, [rimColor]);

  useEffect(() => {
    const tintStrength = getWindowTintStrength(windowTint);

    const glassMaterial = glassMaterialRef.current;
    const glassBaseline = glassBaselineRef.current;
    if (glassMaterial && glassBaseline) {
      applyWindowTintToMaterial(glassMaterial, glassBaseline, tintStrength);
    }

    const roofGlassMaterial = roofGlassMaterialRef.current;
    const roofGlassBaseline = roofGlassBaselineRef.current;
    if (roofGlassMaterial && roofGlassBaseline) {
      applyWindowTintToMaterial(roofGlassMaterial, roofGlassBaseline, tintStrength);
    }
  }, [windowTint]);

  // Dispose the one resource this component creates (the cloned rim
  // material) on unmount — i.e. when the selector switches away from BYD.
  // clonedScene's geometries/materials otherwise still belong to the
  // shared @react-three/drei GLTF cache and are not ours to dispose.
  useEffect(() => {
    return () => {
      setupRef.current = null;
      rimMaterialRef.current?.dispose();
      rimMaterialRef.current = null;
      originalRimColorRef.current = null;
      originalRimMapRef.current = null;
      bodyMaterialRef.current?.dispose();
      bodyMaterialRef.current = null;
      originalBodyColorRef.current = null;
      originalBodyMapRef.current = null;
      glassMaterialRef.current?.dispose();
      glassMaterialRef.current = null;
      glassBaselineRef.current = null;
      roofGlassMaterialRef.current?.dispose();
      roofGlassMaterialRef.current = null;
      roofGlassBaselineRef.current = null;
    };
  }, []);

  const inspectClickedMesh = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();

    const object = event.object;

    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    const materialNames = (
      Array.isArray(object.material) ? object.material : [object.material]
    ).map((material) => material?.name || "(unnamed material)");

    console.group(`[BYD clicked mesh] ${object.name || "(unnamed mesh)"}`);

    console.log("name:", object.name);

    console.log("parent:", object.parent?.name || "(unnamed parent)");

    console.log("materials:", materialNames);

    console.groupEnd();
  };

  return <primitive object={clonedScene} onClick={inspectClickedMesh} />;
}

export default BydSealModel;
