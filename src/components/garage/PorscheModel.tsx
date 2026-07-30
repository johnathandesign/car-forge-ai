import { useEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { applyWindowTintToMaterial, getWindowTintStrength } from "../../utils/windowTint";

const MODEL_PATH = "/models/porsche_manthey_final.glb";
const NORMALIZED_SIZE = 4.5;

const MIRROR_GLASS_MESH_NAME = "Object_82";

const MIRROR_GLASS_LOCAL_POSITION: [number, number, number] = [-0.01574, 0.0475, 0.0153];

const HOOD_MESH_NAMES = new Set(["Object_62"]);

const WING_MESH_NAMES = new Set(["Object_48"]);

const WHEEL_MATERIAL_NAMES = new Set(["Wheel1A.001", "Material.004"]);

const CALIPER_MATERIAL_NAMES = new Set(["caliper_main.001"]);

const BODY_MATERIAL_NAMES = new Set(["Material.005", "material_0"]);

const DASHBOARD_MESH_NAMES = new Set(["Object_438"]);

const DASHBOARD_ALCANTARA_MESH_NAMES = new Set(["Object_440"]);

const SEAT_ALCANTARA_MESH_NAMES = new Set(["Object_280", "Object_282"]);

const SEAT_LEATHER_MESH_NAMES = new Set(["Object_286"]);

const SEAT_CARBON_MESH_NAMES = new Set(["Object_284"]);

const CARPET_MESH_NAMES = new Set(["Object_296"]);

const DOOR_LEATHER_MESH_NAMES = new Set(["Object_338", "Object_368"]);

const DOOR_UPPER_ALCANTARA_MESH_NAMES = new Set(["Object_324", "Object_354"]);

const DOOR_LOWER_ALCANTARA_MESH_NAMES = new Set(["Object_340", "Object_370"]);

const DOOR_CARBON_TRIM_MESH_NAMES = new Set(["Object_334", "Object_364"]);

const DOOR_METAL_TRIM_MESH_NAMES = new Set(["Object_332", "Object_362"]);

// Confirmed by direct GLB inspection (public/models/porsche_manthey_final.glb,
// glTF JSON dumped and cross-checked): "Material.003" is used exclusively by
// these 3 nodes, each parented under a "Window_Geo_lodA*" node (windshield +
// side glass) — confirmed visually too via click-inspection. No headlight,
// taillight, mirror, or interior glass shares this material.
const WINDOW_MESH_NAMES = new Set(["Object_494", "Object_496", "Object_498"]);

const WINDOW_MATERIAL_NAME = "Material.003";

export type PorscheColorValue = string | null;

export type PorscheHoodMode = "follow-body" | "separate";

export interface PorscheModelProps {
  wheelColor: PorscheColorValue;
  caliperColor: PorscheColorValue;
  bodyColor: PorscheColorValue;
  hoodMode: PorscheHoodMode;
  hoodColor: PorscheColorValue;
  dashboardColor: PorscheColorValue;
  dashboardAlcantaraColor: PorscheColorValue;
  seatAlcantaraColor: PorscheColorValue;
  seatLeatherColor: PorscheColorValue;
  seatCarbonColor: PorscheColorValue;
  carpetColor: PorscheColorValue;
  doorLeatherColor: PorscheColorValue;
  doorUpperAlcantaraColor: PorscheColorValue;
  doorLowerAlcantaraColor: PorscheColorValue;
  doorCarbonTrimColor: PorscheColorValue;
  doorMetalTrimColor: PorscheColorValue;
  windowTint: number;
}

interface PaintableMaterial extends Omit<THREE.Material, "vertexColors" | "opacity"> {
  color?: THREE.Color;
  emissive?: THREE.Color;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  transmission?: number;
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  metalnessMap?: THREE.Texture | null;
  aoMap?: THREE.Texture | null;
  vertexColors?: boolean;
}

interface OriginalMaterialState {
  color?: THREE.Color;
  emissive?: THREE.Color;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  metalnessMap?: THREE.Texture | null;
  aoMap?: THREE.Texture | null;
  vertexColors?: boolean;
}

useGLTF.preload(MODEL_PATH);

function getMaterials(mesh: THREE.Mesh): THREE.Material[] {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

  return materials.filter((material): material is THREE.Material => Boolean(material));
}

function cloneSceneMaterials(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    if (Array.isArray(object.material)) {
      object.material = object.material.map((material) => material.clone());
    } else {
      object.material = object.material.clone();
    }
  });
}

function captureOriginalMaterialStates(root: THREE.Object3D): Map<string, OriginalMaterialState> {
  const states = new Map<string, OriginalMaterialState>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    getMaterials(object).forEach((material) => {
      if (states.has(material.uuid)) {
        return;
      }

      const target = material as PaintableMaterial;

      states.set(material.uuid, {
        color: target.color?.clone(),
        emissive: target.emissive?.clone(),
        metalness: target.metalness,
        roughness: target.roughness,
        opacity: target.opacity,
        map: target.map ?? null,
        normalMap: target.normalMap ?? null,
        roughnessMap: target.roughnessMap ?? null,
        metalnessMap: target.metalnessMap ?? null,
        aoMap: target.aoMap ?? null,
        vertexColors: target.vertexColors,
      });
    });
  });

  return states;
}

function restoreMaterial(
  material: THREE.Material,
  originals: Map<string, OriginalMaterialState>,
): void {
  const target = material as PaintableMaterial;

  const original = originals.get(material.uuid);

  if (!original) {
    console.warn("[PorscheModel] Original material state missing:", material.name, material.uuid);

    return;
  }

  if (target.color && original.color) {
    target.color.copy(original.color);
  }

  if (target.emissive && original.emissive) {
    target.emissive.copy(original.emissive);
  }

  if (typeof original.metalness === "number") {
    target.metalness = original.metalness;
  }

  if (typeof original.roughness === "number") {
    target.roughness = original.roughness;
  }

  if (typeof original.opacity === "number") {
    target.opacity = original.opacity;
  }

  target.map = original.map ?? null;

  target.normalMap = original.normalMap ?? null;

  target.roughnessMap = original.roughnessMap ?? null;

  target.metalnessMap = original.metalnessMap ?? null;

  target.aoMap = original.aoMap ?? null;

  if (typeof original.vertexColors === "boolean") {
    target.vertexColors = original.vertexColors;
  }

  material.needsUpdate = true;
}

function applyStandardColor(
  material: THREE.Material,
  color: PorscheColorValue,
  originals: Map<string, OriginalMaterialState>,
): void {
  if (color === null) {
    restoreMaterial(material, originals);

    return;
  }

  const target = material as PaintableMaterial;

  if (target.color) {
    target.color.set(color);
  }

  material.needsUpdate = true;
}

function applyTargetColorByMaterial(
  root: THREE.Object3D,
  materialNames: Set<string>,
  color: PorscheColorValue,
  originals: Map<string, OriginalMaterialState>,
): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    if (HOOD_MESH_NAMES.has(object.name) || WING_MESH_NAMES.has(object.name)) {
      return;
    }

    getMaterials(object).forEach((material) => {
      if (materialNames.has(material.name)) {
        applyStandardColor(material, color, originals);
      }
    });
  });
}

function applyTargetColorByMesh(
  root: THREE.Object3D,
  meshNames: Set<string>,
  expectedMaterialName: string,
  color: PorscheColorValue,
  originals: Map<string, OriginalMaterialState>,
): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    if (!meshNames.has(object.name)) {
      return;
    }

    getMaterials(object).forEach((material) => {
      if (material.name !== expectedMaterialName) {
        console.warn("[PorscheModel] Interior target material mismatch:", {
          mesh: object.name,
          expected: expectedMaterialName,
          actual: material.name,
        });

        return;
      }

      applyStandardColor(material, color, originals);
    });
  });
}

function applyWindowTint(
  root: THREE.Object3D,
  meshNames: Set<string>,
  expectedMaterialName: string,
  tintStrength: number,
  originals: Map<string, OriginalMaterialState>,
): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    if (!meshNames.has(object.name)) {
      return;
    }

    getMaterials(object).forEach((material) => {
      if (material.name !== expectedMaterialName) {
        console.warn("[PorscheModel] Window target material mismatch:", {
          mesh: object.name,
          expected: expectedMaterialName,
          actual: material.name,
        });

        return;
      }

      const original = originals.get(material.uuid);

      if (!original?.color) {
        return;
      }

      applyWindowTintToMaterial(
        material,
        {
          color: original.color,
          opacity: original.opacity ?? 1,
        },
        tintStrength,
      );
    });
  });
}

function applySeatSurfaceColorByMesh(
  root: THREE.Object3D,
  meshNames: Set<string>,
  expectedMaterialName: string,
  color: PorscheColorValue,
  surface: "leather" | "alcantara" | "carbon" | "metal",
  originals: Map<string, OriginalMaterialState>,
): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    if (!meshNames.has(object.name)) {
      return;
    }

    getMaterials(object).forEach((material) => {
      if (material.name !== expectedMaterialName) {
        console.warn("[PorscheModel] Seat target material mismatch:", {
          mesh: object.name,
          expected: expectedMaterialName,
          actual: material.name,
        });

        return;
      }

      if (color === null) {
        restoreMaterial(material, originals);

        return;
      }

      const target = material as PaintableMaterial;

      if (surface !== "carbon") {
        target.map = null;

        if (typeof target.vertexColors === "boolean") {
          target.vertexColors = false;
        }
      }

      if (target.color) {
        target.color.set(color);
      }

      if (target.emissive) {
        target.emissive.set("#000000");
      }

      if (typeof target.metalness === "number") {
        target.metalness = surface === "metal" ? 0.8 : 0;
      }

      if (typeof target.roughness === "number") {
        target.roughness =
          surface === "alcantara"
            ? 0.82
            : surface === "leather"
              ? 0.46
              : surface === "metal"
                ? 0.24
                : target.roughness;
      }

      material.needsUpdate = true;
    });
  });
}

function applyHoodColor(
  root: THREE.Object3D,
  color: PorscheColorValue,
  originals: Map<string, OriginalMaterialState>,
): void {
  let hoodFound = false;

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    if (!HOOD_MESH_NAMES.has(object.name)) {
      return;
    }

    hoodFound = true;

    getMaterials(object).forEach((material) => {
      if (color === null) {
        restoreMaterial(material, originals);

        return;
      }

      const target = material as PaintableMaterial;

      target.map = null;

      if (typeof target.vertexColors === "boolean") {
        target.vertexColors = false;
      }

      if (target.color) {
        target.color.set(color);
      }

      if (target.emissive) {
        target.emissive.set("#000000");
      }

      if (typeof target.metalness === "number") {
        target.metalness = 0.35;
      }

      if (typeof target.roughness === "number") {
        target.roughness = 0.28;
      }

      material.needsUpdate = true;
    });
  });

  if (!hoodFound) {
    console.warn("[PorscheModel] Hood mesh was not found:", Array.from(HOOD_MESH_NAMES));
  }
}

function getCurrentBodyColor(root: THREE.Object3D): PorscheColorValue {
  let result: PorscheColorValue = null;

  root.traverse((object) => {
    if (result !== null || !(object instanceof THREE.Mesh)) {
      return;
    }

    getMaterials(object).forEach((material) => {
      if (result !== null) {
        return;
      }

      if (material.name !== "Material.005") {
        return;
      }

      const target = material as PaintableMaterial;

      if (target.color) {
        result = `#${target.color.getHexString()}`;
      }
    });
  });

  return result;
}

function applyMirrorGlassCorrection(root: THREE.Object3D): void {
  const mirrorGlass = root.getObjectByName(MIRROR_GLASS_MESH_NAME);

  if (!(mirrorGlass instanceof THREE.Mesh)) {
    console.warn(`[PorscheModel] Mirror mesh ${MIRROR_GLASS_MESH_NAME} was not found.`);

    return;
  }

  mirrorGlass.position.set(...MIRROR_GLASS_LOCAL_POSITION);

  mirrorGlass.updateMatrix();
  mirrorGlass.updateMatrixWorld(true);
}

export function PorscheModel({
  wheelColor,
  caliperColor,
  bodyColor,
  hoodMode,
  hoodColor,
  dashboardColor,
  dashboardAlcantaraColor,
  seatAlcantaraColor,
  seatLeatherColor,
  seatCarbonColor,
  carpetColor,
  doorLeatherColor,
  doorUpperAlcantaraColor,
  doorLowerAlcantaraColor,
  doorCarbonTrimColor,
  doorMetalTrimColor,
  windowTint,
}: PorscheModelProps) {
  const group = useRef<THREE.Group>(null);

  const normalizedSceneRef = useRef<THREE.Object3D | null>(null);

  const originalMaterialStatesRef = useRef<Map<string, OriginalMaterialState>>(new Map());

  const { scene } = useGLTF(MODEL_PATH);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    cloneSceneMaterials(clone);

    return clone;
  }, [scene]);

  useEffect(() => {
    if (normalizedSceneRef.current === clonedScene) {
      return;
    }

    normalizedSceneRef.current = clonedScene;

    const rawBox = new THREE.Box3().setFromObject(clonedScene);

    const rawSize = rawBox.getSize(new THREE.Vector3());

    const maxDimension = Math.max(rawSize.x, rawSize.y, rawSize.z);

    const scale = maxDimension > 0 ? NORMALIZED_SIZE / maxDimension : 1;

    clonedScene.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(clonedScene);

    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

    clonedScene.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);

    clonedScene.updateMatrix();
    clonedScene.updateMatrixWorld(true);

    applyMirrorGlassCorrection(clonedScene);

    clonedScene.updateMatrixWorld(true);

    originalMaterialStatesRef.current = captureOriginalMaterialStates(clonedScene);

    console.log("[PorscheModel] loaded:", MODEL_PATH);

    console.log("[PorscheModel] customization targets:", {
      wheels: Array.from(WHEEL_MATERIAL_NAMES),
      calipers: Array.from(CALIPER_MATERIAL_NAMES),
      bodyAndBumper: Array.from(BODY_MATERIAL_NAMES),
      hood: Array.from(HOOD_MESH_NAMES),
      lockedWing: Array.from(WING_MESH_NAMES),
      dashboard: Array.from(DASHBOARD_MESH_NAMES),
      dashboardAlcantara: Array.from(DASHBOARD_ALCANTARA_MESH_NAMES),
      seatAlcantara: Array.from(SEAT_ALCANTARA_MESH_NAMES),
      seatLeather: Array.from(SEAT_LEATHER_MESH_NAMES),
      seatCarbon: Array.from(SEAT_CARBON_MESH_NAMES),
      carpet: Array.from(CARPET_MESH_NAMES),
      doorLeather: Array.from(DOOR_LEATHER_MESH_NAMES),
      doorUpperAlcantara: Array.from(DOOR_UPPER_ALCANTARA_MESH_NAMES),
      doorLowerAlcantara: Array.from(DOOR_LOWER_ALCANTARA_MESH_NAMES),
      doorCarbonTrim: Array.from(DOOR_CARBON_TRIM_MESH_NAMES),
      doorMetalTrim: Array.from(DOOR_METAL_TRIM_MESH_NAMES),
    });
  }, [clonedScene]);

  useEffect(() => {
    const originals = originalMaterialStatesRef.current;

    if (originals.size === 0) {
      return;
    }

    applyTargetColorByMaterial(clonedScene, WHEEL_MATERIAL_NAMES, wheelColor, originals);

    applyTargetColorByMaterial(clonedScene, CALIPER_MATERIAL_NAMES, caliperColor, originals);

    applyTargetColorByMaterial(clonedScene, BODY_MATERIAL_NAMES, bodyColor, originals);

    const resolvedHoodColor =
      hoodMode === "follow-body" ? (bodyColor ?? getCurrentBodyColor(clonedScene)) : hoodColor;

    applyHoodColor(clonedScene, resolvedHoodColor, originals);

    applySeatSurfaceColorByMesh(
      clonedScene,
      DASHBOARD_MESH_NAMES,
      "leather_1.001",
      dashboardColor,
      "leather",
      originals,
    );

    applySeatSurfaceColorByMesh(
      clonedScene,
      DASHBOARD_ALCANTARA_MESH_NAMES,
      "Alcantara.001",
      dashboardAlcantaraColor,
      "alcantara",
      originals,
    );

    applySeatSurfaceColorByMesh(
      clonedScene,
      SEAT_ALCANTARA_MESH_NAMES,
      "Alcantara.001",
      seatAlcantaraColor,
      "alcantara",
      originals,
    );

    applySeatSurfaceColorByMesh(
      clonedScene,
      SEAT_LEATHER_MESH_NAMES,
      "leather_1.001",
      seatLeatherColor,
      "leather",
      originals,
    );

    applySeatSurfaceColorByMesh(
      clonedScene,
      SEAT_CARBON_MESH_NAMES,
      "int_Carbon.001",
      seatCarbonColor,
      "carbon",
      originals,
    );

    applyTargetColorByMesh(clonedScene, CARPET_MESH_NAMES, "Carpet.001", carpetColor, originals);

    applySeatSurfaceColorByMesh(
      clonedScene,
      DOOR_LEATHER_MESH_NAMES,
      "leather_1.001",
      doorLeatherColor,
      "leather",
      originals,
    );

    applySeatSurfaceColorByMesh(
      clonedScene,
      DOOR_UPPER_ALCANTARA_MESH_NAMES,
      "Alcantara.001",
      doorUpperAlcantaraColor,
      "alcantara",
      originals,
    );

    applySeatSurfaceColorByMesh(
      clonedScene,
      DOOR_LOWER_ALCANTARA_MESH_NAMES,
      "Alcantara.001",
      doorLowerAlcantaraColor,
      "alcantara",
      originals,
    );

    applySeatSurfaceColorByMesh(
      clonedScene,
      DOOR_CARBON_TRIM_MESH_NAMES,
      "int_Carbon.001",
      doorCarbonTrimColor,
      "carbon",
      originals,
    );

    applySeatSurfaceColorByMesh(
      clonedScene,
      DOOR_METAL_TRIM_MESH_NAMES,
      "int_Alum_Matte_Grey.001",
      doorMetalTrimColor,
      "metal",
      originals,
    );

    applyWindowTint(
      clonedScene,
      WINDOW_MESH_NAMES,
      WINDOW_MATERIAL_NAME,
      getWindowTintStrength(windowTint),
      originals,
    );
  }, [
    clonedScene,
    wheelColor,
    caliperColor,
    bodyColor,
    hoodMode,
    hoodColor,
    dashboardColor,
    dashboardAlcantaraColor,
    seatAlcantaraColor,
    seatLeatherColor,
    seatCarbonColor,
    carpetColor,
    doorLeatherColor,
    doorUpperAlcantaraColor,
    doorLowerAlcantaraColor,
    doorCarbonTrimColor,
    doorMetalTrimColor,
    windowTint,
  ]);

  const inspectClickedMesh = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();

    const object = event.object;

    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.updateMatrixWorld(true);

    const materials = getMaterials(object);

    const boundingBox = new THREE.Box3().setFromObject(object);

    const worldPosition = new THREE.Vector3();

    const worldQuaternion = new THREE.Quaternion();

    const worldScale = new THREE.Vector3();

    object.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

    const worldRotation = new THREE.Euler().setFromQuaternion(worldQuaternion);

    console.group(`[Porsche clicked mesh] ${object.name || "(unnamed mesh)"}`);

    console.log("uuid:", object.uuid);

    console.log("name:", object.name);

    console.log("parent:", object.parent?.name || "(unnamed parent)");

    console.log(
      "materials:",
      materials.map((material) => material.name || "(unnamed material)"),
    );

    console.log("localPosition:", object.position.toArray());

    console.log("localRotation:", [object.rotation.x, object.rotation.y, object.rotation.z]);

    console.log("localScale:", object.scale.toArray());

    console.log("worldPosition:", worldPosition.toArray());

    console.log("worldRotation:", [worldRotation.x, worldRotation.y, worldRotation.z]);

    console.log("worldScale:", worldScale.toArray());

    console.log("boundingCenter:", boundingBox.getCenter(new THREE.Vector3()).toArray());

    console.log("boundingSize:", boundingBox.getSize(new THREE.Vector3()).toArray());

    console.log("clickedPointWorld:", event.point.toArray());

    console.log("clickedPointLocal:", object.worldToLocal(event.point.clone()).toArray());

    console.log("faceIndex:", event.faceIndex ?? null);

    console.groupEnd();
  };

  return <primitive ref={group} object={clonedScene} onClick={inspectClickedMesh} />;
}

export default PorscheModel;
