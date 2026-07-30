// src/components/garage/CarModel.tsx
// טוען את bmw_m3_final.glb ומיישם עליו את DesignState דרך partsMap.
// מבוסס על המבנה האמיתי שאומת ב-inspector (84 meshes, 22 materials).
//
// CarModel owns only: loading, normalizing, centering, and rendering the
// model. Camera/controls/scene setup belong to GarageCanvas.tsx.

import { useRef, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { PARTS_MAP, assertFullCoverage } from "../../config/partsMap";
import type { DesignState } from "../../types/carModelDesign";
import { applyWindowTintToMaterial, getWindowTintStrength } from "../../utils/windowTint";

const MODEL_PATH = "/models/bmw_m3_final.glb";

useGLTF.preload(MODEL_PATH);

// The car's largest dimension after normalization, in scene units.
const NORMALIZED_SIZE = 4.5;

// === טבלאות תרגום: enum → ערך חומר בפועל ===
const BODY_COLORS: Record<DesignState["exterior"]["bodyColor"], string> = {
  matte_black: "#1c1c1e",
  nardo_gray: "#6e7075",
  pearl_white: "#e9e8e4",
  racing_red: "#b91d2e",
  metallic_blue: "#2458d6",
};

const BODY_FINISH: Record<
  DesignState["exterior"]["bodyColor"],
  { metalness: number; roughness: number }
> = {
  matte_black: { metalness: 0.2, roughness: 0.82 },
  nardo_gray: { metalness: 0.6, roughness: 0.35 },
  pearl_white: { metalness: 0.5, roughness: 0.25 },
  racing_red: { metalness: 0.7, roughness: 0.18 },
  metallic_blue: { metalness: 0.75, roughness: 0.2 },
};

// Confirmed by direct GLB inspection (public/models/bmw_m3_final.glb, glTF
// JSON dumped and cross-checked directly): the "glass" material (BLEND,
// alpha 0.05) is used by exactly these 3 meshes and no others — the
// panoramic roof and rear light lens are separate materials (glass_toit,
// r_glass) already excluded from this role. Window Tint only ever touches
// these 3; mirrors, headlights, and taillights are untouched.
const BMW_GLASS_PARTS = new Set(["Object_52:glass", "Object_53:glass", "Object_54:glass"]);

// tintStrength = 0 baseline: the existing stylized glass look (dark,
// slightly see-through), not the raw near-invisible alpha=0.05 GLB
// material — this is what the app already renders today with no tint
// applied, so the slider's 0 position matches current appearance exactly.
const BMW_GLASS_BASELINE = {
  color: new THREE.Color("#101820"),
  opacity: 0.43,
  transmission: 0.45,
};

// Confirmed by direct GLB inspection (public/models/bmw_m3_final.glb): the
// "body" material is shared by 7 meshes, not just Object_34 — the
// materialmerger export step fused real body panels (doors, fenders, roof,
// quarter panels, trim strips) into these non-semantic geometry islands.
// The live bodyColor prop must cover all 7, or panels outside Object_34
// stay stuck on the design.exterior.bodyColor enum default instead of
// following the live override.
const BMW_BODY_PARTS = new Set([
  "Object_30:body",
  "Object_31:body",
  "Object_32:body",
  "Object_33:body",
  "Object_34:body",
  "Object_35:body",
  "Object_36:body",
]);

// Confirmed by runtime highlight testing (public/models/bmw_m3_final.glb):
// front and rear seat cushions, sharing the "sieges" material.
// Object_64:sieges intentionally excluded — unconfirmed small hardware/frame
// bits, not seat cushion surface.
const BMW_SEAT_PARTS = new Set(["Object_66:sieges", "Object_65:sieges"]);

// Confirmed by runtime highlight testing (public/models/bmw_m3_final.glb):
// "etriers" is used by exactly one mesh, the brake caliper. No rim, tire,
// disc, suspension, or body geometry is affected.
const BMW_CALIPER_PARTS = new Set(["Object_2:etriers"]);

// Confirmed by direct GLB inspection (public/models/bmw_m3_final.glb): every
// "alum" mesh that is actually part of the rim geometry at one of the 4
// wheel corners (Object_14/15/16/17 are the unique per-corner pieces;
// 8/9/10/11/12/18/20 are additional rim sub-components baked once but
// covering all 4 corners). Object_13 (rocker/sill trim) and Object_19
// (front bumper/grille surround) also use "alum" but sit nowhere near a
// wheel and are intentionally excluded. The previous check here only
// covered Object_15/Object_20, leaving the other 9 rim meshes stuck on
// the old design.exterior.rims enum instead of following live wheelColor.
const BMW_WHEEL_PARTS = new Set([
  "Object_8:alum",
  "Object_9:alum",
  "Object_10:alum",
  "Object_11:alum",
  "Object_12:alum",
  "Object_14:alum",
  "Object_15:alum",
  "Object_16:alum",
  "Object_17:alum",
  "Object_18:alum",
  "Object_20:alum",
]);

const RIM_COLORS: Record<DesignState["exterior"]["rims"], string> = {
  black_performance: "#101013",
  silver_sport: "#c9ccd2",
  chrome_luxury: "#e8e9ec",
};

const SEAT_COLORS: Record<DesignState["interior"]["seatColor"], string> = {
  black: "#0d0d0f",
  red: "#7a1220",
  beige: "#d8c9ac",
  cognac: "#7a4a26",
};

// Gets (or lazily creates) a replacement material for a given original
// material name, caching by name rather than by object reference so it
// stays stable across every re-run of the materials effect and across
// every mesh instance that shares the same original material — never
// mutates the shared/cached GLTF material returned by useGLTF directly.
function getOrCreateMaterial<T extends THREE.Material>(
  cache: Map<string, THREE.Material>,
  name: string,
  factory: () => T,
): T {
  const existing = cache.get(name);
  if (existing) return existing as T;
  const created = factory();
  created.name = name;
  cache.set(name, created);
  return created;
}

export function CarModel({
  design,
  bodyColor = null,
  wheelColor = null,
  seatColor = null,
  caliperColor = null,
  windowTint = 0,
}: {
  design: DesignState;
  bodyColor?: string | null;
  wheelColor?: string | null;
  seatColor?: string | null;
  caliperColor?: string | null;
  windowTint?: number;
}) {
  const group = useRef<THREE.Group>(null);
  // Guards the normalization effect below against running more than once
  // per clonedScene. It's not idempotent (re-running it on its own already
  // -normalized output re-derives a bogus scale), and React StrictMode
  // (see main.tsx) intentionally invokes effects twice in development.
  const normalizedSceneRef = useRef<THREE.Object3D | null>(null);
  // Replacement materials for roof/rearLight/glass, keyed by original
  // material name (see getOrCreateMaterial above).
  const specialMaterialsRef = useRef(new Map<string, THREE.Material>());
  const originalBmwMaterialsRef = useRef(new Map<string, THREE.Material>());

  useEffect(() => {
    console.log("CarModel mounted");
  }, []);

  console.log(`Loading GLB from ${MODEL_PATH}`);
  const { scene, materials } = useGLTF(MODEL_PATH);
  console.log("GLB loaded");

  // עותק ייחודי לכל mount, כדי לא לשתף חומרים בין מופעים
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    const materialNames = Object.keys(materials);
    assertFullCoverage(materialNames);

    // Confirmed by direct GLB inspection: only glass/glass_toit/r_glass are
    // glass-like (BLEND) materials — no distinct front headlight lens
    // material exists in this model. Front lights are intentionally left
    // unchanged rather than guessing which unrelated material to touch.
    const hasFrontLightCandidate = materialNames.some((name) =>
      /headlight|headlamp|front_light|^led$|drl|lamp_front/i.test(name),
    );
    if (!hasFrontLightCandidate) {
      console.warn(
        "[CarModel] No distinct front headlight lens material found in " +
          `this GLB (materials: ${materialNames.join(", ")}). ` +
          "Front light appearance left unchanged.",
      );
    }
  }, [materials]);

  // Center the model on the origin and normalize its size so it's always
  // visible regardless of the source file's original scale/pivot.
  useEffect(() => {
    if (normalizedSceneRef.current === clonedScene) {
      return;
    }
    normalizedSceneRef.current = clonedScene;

    console.log("scene.children.length:", clonedScene.children.length);

    // Measure the raw, unscaled scene first.
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log("bounding box size:", size);
    console.log("bounding box center:", center);
    console.log("bounding box min.y:", box.min.y);

    // Scale so the largest dimension is a fixed, always-visible size.
    const maxDimension = Math.max(size.x, size.y, size.z);
    const scale = maxDimension > 0 ? NORMALIZED_SIZE / maxDimension : 1;
    clonedScene.scale.setScalar(scale);

    // Re-measure after scaling, then position so the model sits centered
    // on x/z and rests on the ground plane (y = 0).
    const scaledBox = new THREE.Box3().setFromObject(clonedScene);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    const scaledMinY = scaledBox.min.y;

    clonedScene.position.set(-scaledCenter.x, -scaledMinY, -scaledCenter.z);

    // Log the final, normalized transform.
    const normalizedBox = new THREE.Box3().setFromObject(clonedScene);
    console.log("normalized bounding box size:", normalizedBox.getSize(new THREE.Vector3()));
    console.log("normalized bounding box center:", normalizedBox.getCenter(new THREE.Vector3()));
    console.log("normalized min.y:", normalizedBox.min.y);
    console.log("normalized max.y:", normalizedBox.max.y);
    console.log("final position:", clonedScene.position);
    console.log("final scale:", clonedScene.scale);
  }, [clonedScene]);

  useEffect(() => {
    const specialMaterials = specialMaterialsRef.current;

    clonedScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (!mat?.name) return;

      const isBmwBody = BMW_BODY_PARTS.has(`${obj.name}:${mat.name}`);

      const isBmwWheel = BMW_WHEEL_PARTS.has(`${obj.name}:${mat.name}`);

      const isBmwSeat = BMW_SEAT_PARTS.has(`${obj.name}:${mat.name}`);

      const isBmwCaliper = BMW_CALIPER_PARTS.has(`${obj.name}:${mat.name}`);

      if (isBmwBody || isBmwWheel || isBmwSeat || isBmwCaliper) {
        const originalKey = `${obj.name}:${mat.name}`;
        let originalMaterial = originalBmwMaterialsRef.current.get(originalKey);

        if (!originalMaterial) {
          originalMaterial = mat.clone();
          originalBmwMaterialsRef.current.set(originalKey, originalMaterial);
        }

        const editableMaterial = getOrCreateMaterial(specialMaterials, `bmw:${originalKey}`, () =>
          originalMaterial!.clone(),
        );

        editableMaterial.copy(originalMaterial);

        const selectedColor = isBmwBody
          ? bodyColor
          : isBmwWheel
            ? wheelColor
            : isBmwSeat
              ? seatColor
              : caliperColor;

        if (selectedColor && "color" in editableMaterial) {
          (editableMaterial as THREE.MeshStandardMaterial).color.set(selectedColor);
        }

        editableMaterial.needsUpdate = true;
        obj.material = editableMaterial;
        return;
      }

      const role = PARTS_MAP[mat.name] ?? "ignore";

      switch (role) {
        case "body": {
          mat.color.set(BODY_COLORS[design.exterior.bodyColor]);
          const finish = BODY_FINISH[design.exterior.bodyColor];
          mat.metalness = finish.metalness;
          mat.roughness = finish.roughness;
          mat.needsUpdate = true;
          break;
        }
        case "glass": {
          // Real, see-through tinted glass — not the washed-out grayscale
          // this used to compute. Upgraded to MeshPhysicalMaterial for
          // transmission; created once and reused/mutated on every re-run
          // (see getOrCreateMaterial), never mutating the shared original.
          if (!BMW_GLASS_PARTS.has(`${obj.name}:${mat.name}`)) {
            // Shares the "glass" material name but isn't one of the three
            // verified window meshes — leave it untouched rather than guess.
            break;
          }
          const glassMat = getOrCreateMaterial(
            specialMaterials,
            mat.name,
            () => new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide }),
          );
          glassMat.transparent = true;
          glassMat.roughness = 0.12;
          glassMat.metalness = 0;
          glassMat.depthWrite = false;
          glassMat.ior = 1.45;
          glassMat.thickness = 0.1;
          glassMat.clearcoat = 0.4;
          glassMat.clearcoatRoughness = 0.1;
          applyWindowTintToMaterial(
            glassMat,
            BMW_GLASS_BASELINE,
            getWindowTintStrength(windowTint),
          );
          obj.material = glassMat;
          break;
        }
        case "roof": {
          // Panoramic roof (glass_toit): opaque black, not tint-driven —
          // this used to share the "glass" role, which is what made it
          // render washed-out/light instead of solid black.
          const roofMat = getOrCreateMaterial(specialMaterials, mat.name, () => mat.clone());
          roofMat.color.set("#080808");
          roofMat.transparent = false;
          roofMat.opacity = 1;
          roofMat.roughness = 0.32;
          roofMat.metalness = 0.2;
          roofMat.depthWrite = true;
          roofMat.needsUpdate = true;
          obj.material = roofMat;
          break;
        }
        case "rearLight": {
          // Rear light lens (r_glass): stays red at all times (no on/off
          // state here), instead of sharing the window-tint "glass" role.
          const rearLightMat = getOrCreateMaterial(specialMaterials, mat.name, () => mat.clone());
          rearLightMat.color.set("#7a1018");
          rearLightMat.transparent = true;
          rearLightMat.opacity = 0.65;
          rearLightMat.roughness = 0.15;
          rearLightMat.metalness = 0;
          rearLightMat.depthWrite = false;
          rearLightMat.needsUpdate = true;
          obj.material = rearLightMat;
          break;
        }
        case "rims": {
          mat.color.set(RIM_COLORS[design.exterior.rims]);
          mat.metalness = 0.9;
          mat.roughness = 0.3;
          mat.needsUpdate = true;
          break;
        }
        case "seats": {
          mat.color.set(SEAT_COLORS[design.interior.seatColor]);
          mat.roughness =
            design.interior.seatMaterial === "leather"
              ? 0.35
              : design.interior.seatMaterial === "alcantara"
                ? 0.85
                : 0.7;
          mat.needsUpdate = true;
          break;
        }
        // tires, trim, brake, chrome_trim, logo_plate, interior, ignore:
        // נשארים כברירת המחדל של המודל — לא חלק מ-MVP 0.1 הצבעוני.
      }
    });
  }, [clonedScene, design, bodyColor, wheelColor, seatColor, caliperColor, windowTint]);

  const inspectClickedMesh = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();

    const object = event.object;

    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    const materialNames = (
      Array.isArray(object.material) ? object.material : [object.material]
    ).map((material) => material?.name || "(unnamed material)");

    console.group(`[BMW clicked mesh] ${object.name || "(unnamed mesh)"}`);

    console.log("name:", object.name);

    console.log("parent:", object.parent?.name || "(unnamed parent)");

    console.log("materials:", materialNames);

    console.groupEnd();
  };

  return <primitive ref={group} object={clonedScene} onClick={inspectClickedMesh} />;
}
