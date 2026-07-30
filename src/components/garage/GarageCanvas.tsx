// src/components/garage/GarageCanvas.tsx
// ה-Canvas המלא: טוען את CarModel, מוסיף תאורת סטודיו, orbit, ורצפה עם השתקפות.
// זהו הקוד שנכנס בפועל לתוך #garage-canvas-root מ-CLAUDE.md §6.
//
// GarageCanvas owns the camera, OrbitControls, lights, grid, and overall
// scene setup. CarModel.tsx only loads/normalizes/renders the car itself.

import {
  Component,
  Suspense,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CarModel } from "./CarModel";
import PorscheModel from "./PorscheModel";
import type { DesignState } from "../../types/carModelDesign";
import { VehicleSelector, type ValidationVehicleId } from "./VehicleSelector";
import { BydSealModel } from "../../validation/bydRim01/BydSealModel";
import {
  useBydRim01Validation,
  BydSceneApiBridge,
} from "../../validation/bydRim01/useBydRim01Validation";
// Color-swatch data lives in colorPalettes.ts (no three.js import) so the
// Studio route can reuse the exact same palettes without pulling the 3D
// runtime into the server bundle. Re-exported here for any other consumer.
import {
  type PorscheColorChoice,
  type PorscheHoodMode,
  type PorscheColorOption,
  PORSCHE_WHEEL_COLORS,
  PORSCHE_CALIPER_COLORS,
  PORSCHE_BODY_COLORS,
  PORSCHE_HOOD_COLORS,
  HEX_COLOR_PATTERN,
  normalizeHexColor,
  getReadableTextColor,
} from "./colorPalettes";
export type { PorscheColorChoice, PorscheHoodMode, PorscheColorOption };
export { PORSCHE_WHEEL_COLORS, PORSCHE_CALIPER_COLORS, PORSCHE_BODY_COLORS, PORSCHE_HOOD_COLORS };

type ViewMode = "exterior" | "interior";

interface ViewConfig {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
  enablePan: boolean;
  screenSpacePanning: boolean;
  enableRotate: boolean;
  enableZoom: boolean;
  rotateSpeed: number;
  zoomSpeed: number;
  panSpeed: number;
}

const EXTERIOR_VIEW: ViewConfig = {
  position: new THREE.Vector3(5.5, 4.5, 6.5),
  target: new THREE.Vector3(0, 0.7, 0),
  fov: 38,
  minDistance: 1.2,
  maxDistance: 12,
  minPolarAngle: 0.01,
  maxPolarAngle: Math.PI - 0.05,
  // Full, unrestricted orbit — this is the one preset explicitly safe to
  // spin all the way around, so it stays that way.
  minAzimuthAngle: -Infinity,
  maxAzimuthAngle: Infinity,
  enablePan: false,
  screenSpacePanning: false,
  enableRotate: true,
  enableZoom: true,
  rotateSpeed: 1,
  zoomSpeed: 1,
  panSpeed: 1,
};

const FOCUS_WHEELS_VIEW: ViewConfig = {
  position: new THREE.Vector3(2.0, 0.75, 1.65),
  target: new THREE.Vector3(1.15, 0.38, 0.78),
  fov: 45,
  minDistance: 0.35,
  maxDistance: 3.5,
  // Bounded to a wide inspection arc — close-up detail view must not allow
  // a full 360 spin through the wheel well/body.
  minPolarAngle: Math.PI * 0.15,
  maxPolarAngle: Math.PI * 0.7,
  minAzimuthAngle: -Math.PI / 2,
  maxAzimuthAngle: Math.PI / 2,
  enablePan: false,
  screenSpacePanning: false,
  enableRotate: true,
  enableZoom: true,
  rotateSpeed: 1,
  zoomSpeed: 1,
  panSpeed: 1,
};

const PORSCHE_EXTERIOR_VIEW: ViewConfig = {
  ...EXTERIOR_VIEW,
  position: new THREE.Vector3(4.74, 3.19, 3.7),
  target: new THREE.Vector3(0, 0.7, 0),
  fov: 38,
};

const BYD_EXTERIOR_VIEW: ViewConfig = {
  ...EXTERIOR_VIEW,
  position: new THREE.Vector3(3.95, 2.04, 3.63),
  target: new THREE.Vector3(0, 0.7, 0),
  fov: 38,
};

const PORSCHE_FOCUS_WHEELS_VIEW: ViewConfig = {
  ...FOCUS_WHEELS_VIEW,
  position: new THREE.Vector3(1.69, 0.62, 1.5),
  target: new THREE.Vector3(0.75, 0.34, 1.28),
  fov: 45,
};

const BYD_FOCUS_WHEELS_VIEW: ViewConfig = {
  ...FOCUS_WHEELS_VIEW,
  position: new THREE.Vector3(1.56, 0.52, 1.87),
  target: new THREE.Vector3(0.72, 0.33, 1.36),
  fov: 40,
};

type ExteriorPreset = "default" | "wheels";

interface InteriorPov {
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

const INTERIOR_POVS: InteriorPov[] = [
  {
    name: "Driver",
    position: new THREE.Vector3(-0.32, 1.05, -0.33),
    target: new THREE.Vector3(0.66, 0.88, -0.32),
    fov: 72,
  },
  {
    name: "Rear Seats",
    position: new THREE.Vector3(-0.32, 1.19, 0.06),
    target: new THREE.Vector3(-1.13, 0.6, 0.05),
    fov: 72,
  },
  {
    name: "Front Seats",
    position: new THREE.Vector3(0.37, 1.15, 0.04),
    target: new THREE.Vector3(-0.47, 0.62, 0.05),
    fov: 72,
  },
];

const BYD_INTERIOR_POVS: InteriorPov[] = [
  {
    name: "Driver",
    position: new THREE.Vector3(0.35, 1.14, -0.25),
    target: new THREE.Vector3(0.32, 0.91, 0.72),
    fov: 72,
  },
  {
    name: "Rear Seats",
    position: new THREE.Vector3(-0.08, 1.32, -0.25),
    target: new THREE.Vector3(-0.07, 0.72, -1.04),
    fov: 72,
  },
  {
    name: "Front Seats",
    position: new THREE.Vector3(-0.03, 1.23, 0.37),
    target: new THREE.Vector3(-0.03, 0.57, -0.38),
    fov: 72,
  },
];

const PORSCHE_INTERIOR_POVS: InteriorPov[] = [
  {
    name: "Driver",
    position: new THREE.Vector3(0.36, 1.11, -0.49),
    target: new THREE.Vector3(0.38, 0.71, 0.43),
    fov: 72,
  },
  {
    name: "Front Seats",
    position: new THREE.Vector3(0, 1.07, 0.15),
    target: new THREE.Vector3(0.01, 0.39, -0.58),
    fov: 72,
  },
];

const INTERIOR_CONTROLS = {
  // Raised from the model surface to keep the camera from zooming through
  // nearby seats/dash/console geometry at close range.
  minDistance: 0.08,
  maxDistance: 1.15,
  // Bounded "look around" cone — cannot flip past vertical or spin behind
  // yourself, but still lets you look around the cabin as intended.
  minPolarAngle: Math.PI * 0.25,
  maxPolarAngle: Math.PI * 0.75,
  minAzimuthAngle: -Math.PI * 0.6,
  maxAzimuthAngle: Math.PI * 0.6,
  enablePan: false,
  screenSpacePanning: false,
  enableRotate: true,
  enableZoom: true,
  rotateSpeed: 0.45,
  zoomSpeed: 0.45,
  panSpeed: 0,
};

interface RigControls {
  target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
  enablePan: boolean;
  screenSpacePanning: boolean;
  enableRotate: boolean;
  enableZoom: boolean;
  rotateSpeed: number;
  zoomSpeed: number;
  panSpeed: number;
  autoRotate: boolean;
  update: () => void;
}

function CameraRig({
  viewMode,
  interiorPovIndex,
  interiorPovs,
  exteriorView,
  wheelsView,
  exteriorPreset,
  viewNonce,
}: {
  viewMode: ViewMode;
  interiorPovIndex: number;
  interiorPovs: InteriorPov[];
  exteriorView: ViewConfig;
  wheelsView: ViewConfig;
  exteriorPreset: ExteriorPreset;
  viewNonce: number;
}) {
  const { camera, controls } = useThree();

  useEffect(() => {
    // Shared camera-safety conditions — single source of truth reused for
    // every vehicle (BMW/BYD/Porsche) instead of per-model camera logic.
    const isInteriorView = viewMode === "interior";
    const isCloseDetailView = !isInteriorView && exteriorPreset === "wheels";
    const shouldLockOrbit = isInteriorView;

    const pov = interiorPovs[interiorPovIndex] ?? interiorPovs[0];

    const view: ViewConfig = isInteriorView
      ? {
          position: pov.position,
          target: pov.target,
          fov: pov.fov,
          ...INTERIOR_CONTROLS,
        }
      : isCloseDetailView
        ? wheelsView
        : exteriorView;

    camera.position.set(view.position.x, view.position.y, view.position.z);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = view.fov;
      camera.updateProjectionMatrix();
    }

    camera.lookAt(view.target);

    const orbitControls = controls as RigControls | null;

    if (orbitControls) {
      orbitControls.target.set(view.target.x, view.target.y, view.target.z);
      orbitControls.minDistance = view.minDistance;
      orbitControls.maxDistance = view.maxDistance;
      orbitControls.minPolarAngle = view.minPolarAngle;
      orbitControls.maxPolarAngle = view.maxPolarAngle;
      orbitControls.minAzimuthAngle = view.minAzimuthAngle;
      orbitControls.maxAzimuthAngle = view.maxAzimuthAngle;
      orbitControls.enablePan = view.enablePan;
      orbitControls.screenSpacePanning = view.screenSpacePanning;
      orbitControls.enableRotate = shouldLockOrbit ? false : view.enableRotate;
      orbitControls.enableZoom = view.enableZoom;
      orbitControls.rotateSpeed = view.rotateSpeed;
      orbitControls.zoomSpeed = view.zoomSpeed;
      orbitControls.panSpeed = view.panSpeed;
      // Auto-rotate is disabled outright: an auto-spinning camera combined
      // with the safety-bounded angles/distances above is more likely to
      // clip through the model than to help, so it stays off in every view.
      orbitControls.autoRotate = false;
      orbitControls.update();
    }
  }, [
    viewMode,
    interiorPovIndex,
    interiorPovs,
    exteriorView,
    wheelsView,
    exteriorPreset,
    viewNonce,
    camera,
    controls,
  ]);

  return null;
}

interface CapturedPose {
  camera: THREE.Camera;
  controls: RigControls | null;
  viewMode: ViewMode;
  interiorPovIndex: number;
  calibrationFreeCamera: boolean;
}

function PoseTracker({
  viewMode,
  interiorPovIndex,
  calibrationFreeCamera,
  poseRef,
}: {
  viewMode: ViewMode;
  interiorPovIndex: number;
  calibrationFreeCamera: boolean;
  poseRef: {
    current: CapturedPose | null;
  };
}) {
  const { camera, controls } = useThree();

  useEffect(() => {
    poseRef.current = {
      camera,
      controls: controls as RigControls | null,
      viewMode,
      interiorPovIndex,
      calibrationFreeCamera,
    };
  }, [camera, controls, viewMode, interiorPovIndex, calibrationFreeCamera, poseRef]);

  return null;
}

// Captures the live WebGL renderer into a ref the outer GarageCanvas
// function can reach for PNG capture (capturePng on GarageCanvasHandle).
// Mirrors PoseTracker's existing bridge-component pattern — same technique,
// just carrying `gl` instead of camera/controls.
function RendererCapture({
  rendererRef,
}: {
  rendererRef: { current: THREE.WebGLRenderer | null };
}) {
  const { gl } = useThree();

  useEffect(() => {
    rendererRef.current = gl;

    return () => {
      rendererRef.current = null;
    };
  }, [gl, rendererRef]);

  return null;
}

function CalibrationFreeCamera() {
  const { camera, gl, controls } = useThree();

  const keysRef = useRef<Record<string, boolean>>({});

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const isDraggingRef = useRef(false);

  const lastPointerRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const orbitControls = controls as {
      enabled: boolean;
    } | null;

    if (orbitControls) {
      orbitControls.enabled = false;
    }

    return () => {
      if (orbitControls) {
        orbitControls.enabled = true;
      }
    };
  }, [controls]);

  useEffect(() => {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");

    yawRef.current = euler.y;
    pitchRef.current = euler.x;
  }, [camera]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      keysRef.current[event.key.toLowerCase()] = true;
    }

    function handleKeyUp(event: KeyboardEvent) {
      keysRef.current[event.key.toLowerCase()] = false;
    }

    window.addEventListener("keydown", handleKeyDown);

    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const domElement = gl.domElement;
    const lookSpeed = 0.0025;
    const maxPitch = Math.PI / 2 - 0.01;

    function handlePointerDown(event: PointerEvent) {
      isDraggingRef.current = true;

      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    function handlePointerMove(event: PointerEvent) {
      if (!isDraggingRef.current || !lastPointerRef.current) {
        return;
      }

      const deltaX = event.clientX - lastPointerRef.current.x;

      const deltaY = event.clientY - lastPointerRef.current.y;

      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      yawRef.current -= deltaX * lookSpeed;

      pitchRef.current -= deltaY * lookSpeed;

      pitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, pitchRef.current));
    }

    function handlePointerUp() {
      isDraggingRef.current = false;
      lastPointerRef.current = null;
    }

    domElement.addEventListener("pointerdown", handlePointerDown);

    window.addEventListener("pointermove", handlePointerMove);

    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      domElement.removeEventListener("pointerdown", handlePointerDown);

      window.removeEventListener("pointermove", handlePointerMove);

      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl]);

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);

  useFrame(() => {
    camera.rotation.order = "YXZ";

    camera.rotation.set(pitchRef.current, yawRef.current, 0);

    const keys = keysRef.current;

    const speed = keys["shift"] ? 0.12 : 0.04;

    camera.getWorldDirection(forward);

    right.crossVectors(forward, worldUp).normalize();

    if (keys["w"]) {
      camera.position.addScaledVector(forward, speed);
    }

    if (keys["s"]) {
      camera.position.addScaledVector(forward, -speed);
    }

    if (keys["d"]) {
      camera.position.addScaledVector(right, speed);
    }

    if (keys["a"]) {
      camera.position.addScaledVector(right, -speed);
    }

    if (keys["e"]) {
      camera.position.addScaledVector(worldUp, speed);
    }

    if (keys["q"]) {
      camera.position.addScaledVector(worldUp, -speed);
    }
  });

  return null;
}

function InteriorFixedLookCamera({ pov }: { pov: InteriorPov }) {
  const { camera, gl, controls } = useThree();

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const initialYawRef = useRef(0);
  const isDraggingRef = useRef(false);

  const lastPointerRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const fixedPositionRef = useRef(new THREE.Vector3());

  useEffect(() => {
    const orbitControls = controls as {
      enabled: boolean;
    } | null;

    if (orbitControls) {
      orbitControls.enabled = false;
    }

    return () => {
      if (orbitControls) {
        orbitControls.enabled = true;
      }
    };
  }, [controls]);

  useEffect(() => {
    fixedPositionRef.current.copy(pov.position);

    camera.position.copy(pov.position);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = pov.fov;
      camera.updateProjectionMatrix();
    }

    const lookMatrix = new THREE.Matrix4().lookAt(
      pov.position,
      pov.target,
      new THREE.Vector3(0, 1, 0),
    );

    const quaternion = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);

    const euler = new THREE.Euler().setFromQuaternion(quaternion, "YXZ");

    yawRef.current = euler.y;
    pitchRef.current = euler.x;
    initialYawRef.current = euler.y;
  }, [pov, camera]);

  useEffect(() => {
    const domElement = gl.domElement;
    const lookSpeed = 0.0025;
    // Bounded look-around cone, reused from the shared interior orbit
    // limits (INTERIOR_CONTROLS) — keeps this fixed-POV camera from
    // spinning a full 360 through seat backs/doors/dashboard, the same
    // way azimuth/polar limits bound OrbitControls in the orbiting views.
    const maxPitch = Math.PI / 2 - INTERIOR_CONTROLS.minPolarAngle;
    const minPitch = Math.PI / 2 - INTERIOR_CONTROLS.maxPolarAngle;

    function handlePointerDown(event: PointerEvent) {
      isDraggingRef.current = true;

      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    function handlePointerMove(event: PointerEvent) {
      if (!isDraggingRef.current || !lastPointerRef.current) {
        return;
      }

      const deltaX = event.clientX - lastPointerRef.current.x;

      const deltaY = event.clientY - lastPointerRef.current.y;

      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      yawRef.current -= deltaX * lookSpeed;

      pitchRef.current -= deltaY * lookSpeed;

      const minYaw = initialYawRef.current + INTERIOR_CONTROLS.minAzimuthAngle;

      const maxYaw = initialYawRef.current + INTERIOR_CONTROLS.maxAzimuthAngle;

      yawRef.current = Math.max(minYaw, Math.min(maxYaw, yawRef.current));

      pitchRef.current = Math.max(minPitch, Math.min(maxPitch, pitchRef.current));
    }

    function handlePointerUp() {
      isDraggingRef.current = false;
      lastPointerRef.current = null;
    }

    domElement.addEventListener("pointerdown", handlePointerDown);

    window.addEventListener("pointermove", handlePointerMove);

    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      domElement.removeEventListener("pointerdown", handlePointerDown);

      window.removeEventListener("pointermove", handlePointerMove);

      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl]);

  useFrame(() => {
    camera.position.copy(fixedPositionRef.current);

    camera.rotation.order = "YXZ";

    camera.rotation.set(pitchRef.current, yawRef.current, 0);
  });

  return null;
}

function ModelLoadingFallback() {
  return (
    <Html center>
      <p
        style={{
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        Loading car model...
      </p>
    </Html>
  );
}

class ModelErrorBoundary extends Component<
  {
    children: ReactNode;
  },
  {
    error: Error | null;
  }
> {
  state = {
    error: null as Error | null,
  };

  static getDerivedStateFromError(error: Error) {
    return {
      error,
    };
  }

  componentDidCatch(error: Error) {
    console.error("GLB failed to load", error);
  }

  render() {
    if (this.state.error) {
      return (
        <Html center>
          <div
            style={{
              color: "red",
              fontFamily: "sans-serif",
            }}
          >
            <p>GLB failed to load</p>
            <p>{this.state.error.message}</p>
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}

function PorscheColorRow({
  label,
  options,
  selected,
  onChange,
  pickerFallback,
}: {
  label: string;
  options: PorscheColorOption[];
  selected: PorscheColorChoice;
  onChange: (value: PorscheColorChoice) => void;
  pickerFallback: string;
}) {
  const [hexDraft, setHexDraft] = useState(selected ?? "");

  useEffect(() => {
    setHexDraft(selected ?? "");
  }, [selected]);

  function handleHexChange(value: string) {
    setHexDraft(value);

    const normalized = normalizeHexColor(value);

    if (HEX_COLOR_PATTERN.test(normalized)) {
      onChange(normalized);
      setHexDraft(normalized);
    }
  }

  const pickerValue = selected && HEX_COLOR_PATTERN.test(selected) ? selected : pickerFallback;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "78px minmax(0, 1fr)",
        gap: "8px",
        alignItems: "start",
      }}
    >
      <strong
        style={{
          fontSize: "12px",
          paddingTop: "6px",
        }}
      >
        {label}
      </strong>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "7px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "6px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {options.map((option) => {
            const active = selected === option.value;

            return (
              <button
                key={`${label}-${option.label}`}
                type="button"
                onClick={() => onChange(option.value)}
                style={{
                  border: active ? "2px solid #E0B34D" : "1px solid #666",
                  background: option.value ?? "#2B2B2B",
                  color: getReadableTextColor(option.value),
                  padding: "5px 9px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
              fontSize: "12px",
            }}
          >
            Custom
            <input
              type="color"
              value={pickerValue}
              onChange={(event) => onChange(event.target.value.toUpperCase())}
              style={{
                width: "38px",
                height: "28px",
                padding: "1px",
                border: "1px solid #666",
                borderRadius: "4px",
                background: "transparent",
                cursor: "pointer",
              }}
              aria-label={`${label} custom color picker`}
            />
          </label>

          <label
            style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
              fontSize: "12px",
            }}
          >
            HEX
            <input
              type="text"
              value={hexDraft}
              placeholder={pickerFallback}
              maxLength={7}
              onChange={(event) => handleHexChange(event.target.value)}
              style={{
                width: "92px",
                padding: "5px 7px",
                border:
                  hexDraft === "" || HEX_COLOR_PATTERN.test(normalizeHexColor(hexDraft))
                    ? "1px solid #666"
                    : "1px solid #D90429",
                borderRadius: "4px",
                background: "#0F0F12",
                color: "#FFFFFF",
                fontFamily: "monospace",
              }}
              aria-label={`${label} HEX color`}
            />
          </label>

          <span
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "4px",
              border: "1px solid #777",
              background: selected ?? pickerFallback,
            }}
            title={selected ?? "Original"}
          />
        </div>
      </div>
    </div>
  );
}

function WindowTintSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "78px minmax(0, 1fr)",
        gap: "8px",
        alignItems: "center",
      }}
    >
      <strong
        style={{
          fontSize: "12px",
        }}
      >
        Window Tint
      </strong>

      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ flex: 1 }}
          aria-label="Window Tint"
        />

        <span
          style={{
            fontSize: "12px",
            width: "36px",
            textAlign: "right",
          }}
        >
          {value}%
        </span>
      </div>
    </div>
  );
}

function BydColorControls({
  vehicleLabel = "BYD",
  isOpen,
  onToggleOpen,
  bodyColor,
  onBodyColorChange,
  rimColor,
  onRimColorChange,
  seatColor,
  onSeatColorChange,
  caliperColor,
  onCaliperColorChange,
  windowTint,
  onWindowTintChange,
  onRestoreOriginal,
}: {
  vehicleLabel?: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  bodyColor: PorscheColorChoice;
  onBodyColorChange: (value: PorscheColorChoice) => void;
  rimColor: PorscheColorChoice;
  onRimColorChange: (value: PorscheColorChoice) => void;
  seatColor?: PorscheColorChoice;
  onSeatColorChange?: (value: PorscheColorChoice) => void;
  caliperColor?: PorscheColorChoice;
  onCaliperColorChange?: (value: PorscheColorChoice) => void;
  windowTint: number;
  onWindowTintChange: (value: number) => void;
  onRestoreOriginal: () => void;
}) {
  return (
    <div
      style={{
        borderTop: "1px solid #444",
        borderBottom: "1px solid #444",
        background: "#17171B",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "8px",
        }}
      >
        <button type="button" onClick={onToggleOpen}>
          {isOpen ? `Close ${vehicleLabel} Customization` : `Open ${vehicleLabel} Customization`}
        </button>

        {isOpen && (
          <button type="button" onClick={onRestoreOriginal}>
            Restore All Original
          </button>
        )}
      </div>

      {isOpen && (
        <div
          style={{
            padding: "0 8px 12px",
          }}
        >
          <PorscheColorRow
            label="Body"
            options={PORSCHE_BODY_COLORS}
            selected={bodyColor}
            onChange={onBodyColorChange}
            pickerFallback="#D90429"
          />

          <PorscheColorRow
            label="Wheels"
            options={PORSCHE_WHEEL_COLORS}
            selected={rimColor}
            onChange={onRimColorChange}
            pickerFallback="#808080"
          />

          {onSeatColorChange && (
            <PorscheColorRow
              label="Seat Color"
              options={PORSCHE_WHEEL_COLORS}
              selected={seatColor ?? null}
              onChange={onSeatColorChange}
              pickerFallback="#808080"
            />
          )}

          {onCaliperColorChange && (
            <PorscheColorRow
              label="Brake Caliper Color"
              options={PORSCHE_CALIPER_COLORS}
              selected={caliperColor ?? null}
              onChange={onCaliperColorChange}
              pickerFallback="#D90429"
            />
          )}

          <WindowTintSlider value={windowTint} onChange={onWindowTintChange} />
        </div>
      )}
    </div>
  );
}

function PorscheColorControls({
  isOpen,
  onToggleOpen,
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
  onWindowTintChange,
  onWheelColorChange,
  onCaliperColorChange,
  onBodyColorChange,
  onHoodModeChange,
  onHoodColorChange,
  onDashboardColorChange,
  onDashboardAlcantaraColorChange,
  onSeatAlcantaraColorChange,
  onSeatLeatherColorChange,
  onSeatCarbonColorChange,
  onCarpetColorChange,
  onDoorLeatherColorChange,
  onDoorUpperAlcantaraColorChange,
  onDoorLowerAlcantaraColorChange,
  onDoorCarbonTrimColorChange,
  onDoorMetalTrimColorChange,
  onRestoreOriginal,
}: {
  isOpen: boolean;
  onToggleOpen: () => void;
  wheelColor: PorscheColorChoice;
  caliperColor: PorscheColorChoice;
  bodyColor: PorscheColorChoice;
  hoodMode: PorscheHoodMode;
  hoodColor: PorscheColorChoice;
  dashboardColor: PorscheColorChoice;
  dashboardAlcantaraColor: PorscheColorChoice;
  seatAlcantaraColor: PorscheColorChoice;
  seatLeatherColor: PorscheColorChoice;
  seatCarbonColor: PorscheColorChoice;
  carpetColor: PorscheColorChoice;
  doorLeatherColor: PorscheColorChoice;
  doorUpperAlcantaraColor: PorscheColorChoice;
  doorLowerAlcantaraColor: PorscheColorChoice;
  doorCarbonTrimColor: PorscheColorChoice;
  doorMetalTrimColor: PorscheColorChoice;
  windowTint: number;
  onWindowTintChange: (value: number) => void;
  onWheelColorChange: (value: PorscheColorChoice) => void;
  onCaliperColorChange: (value: PorscheColorChoice) => void;
  onBodyColorChange: (value: PorscheColorChoice) => void;
  onHoodModeChange: (value: PorscheHoodMode) => void;
  onHoodColorChange: (value: PorscheColorChoice) => void;
  onDashboardColorChange: (value: PorscheColorChoice) => void;
  onDashboardAlcantaraColorChange: (value: PorscheColorChoice) => void;
  onSeatAlcantaraColorChange: (value: PorscheColorChoice) => void;
  onSeatLeatherColorChange: (value: PorscheColorChoice) => void;
  onSeatCarbonColorChange: (value: PorscheColorChoice) => void;
  onCarpetColorChange: (value: PorscheColorChoice) => void;
  onDoorLeatherColorChange: (value: PorscheColorChoice) => void;
  onDoorUpperAlcantaraColorChange: (value: PorscheColorChoice) => void;
  onDoorLowerAlcantaraColorChange: (value: PorscheColorChoice) => void;
  onDoorCarbonTrimColorChange: (value: PorscheColorChoice) => void;
  onDoorMetalTrimColorChange: (value: PorscheColorChoice) => void;
  onRestoreOriginal: () => void;
}) {
  return (
    <div
      style={{
        borderTop: "1px solid #444",
        borderBottom: "1px solid #444",
        background: "#17171B",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "8px",
        }}
      >
        <button type="button" onClick={onToggleOpen}>
          {isOpen ? "Close Porsche Customization" : "Open Porsche Customization"}
        </button>

        {isOpen && (
          <>
            <button type="button" onClick={onRestoreOriginal}>
              Restore All Original
            </button>

            <span
              style={{
                fontSize: "12px",
                color: "#AAA",
              }}
            >
              Front bumper follows Body. Rear carbon wing remains unchanged.
            </span>
          </>
        )}
      </div>

      {isOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "0 8px 12px",
          }}
        >
          <PorscheColorRow
            label="Wheels"
            options={PORSCHE_WHEEL_COLORS}
            selected={wheelColor}
            onChange={onWheelColorChange}
            pickerFallback="#111111"
          />

          <PorscheColorRow
            label="Calipers"
            options={PORSCHE_CALIPER_COLORS}
            selected={caliperColor}
            onChange={onCaliperColorChange}
            pickerFallback="#D90429"
          />

          <PorscheColorRow
            label="Body"
            options={PORSCHE_BODY_COLORS}
            selected={bodyColor}
            onChange={onBodyColorChange}
            pickerFallback="#C1121F"
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "78px minmax(0, 1fr)",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <strong
              style={{
                fontSize: "12px",
              }}
            >
              Hood Mode
            </strong>

            <div
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => onHoodModeChange("follow-body")}
                style={{
                  border: hoodMode === "follow-body" ? "2px solid #E0B34D" : "1px solid #666",
                }}
              >
                Follow Body Color
              </button>

              <button
                type="button"
                onClick={() => onHoodModeChange("separate")}
                style={{
                  border: hoodMode === "separate" ? "2px solid #E0B34D" : "1px solid #666",
                }}
              >
                Separate Hood Color
              </button>
            </div>
          </div>

          {hoodMode === "separate" && (
            <PorscheColorRow
              label="Hood"
              options={PORSCHE_HOOD_COLORS}
              selected={hoodColor}
              onChange={onHoodColorChange}
              pickerFallback="#111111"
            />
          )}

          <PorscheColorRow
            label="Dashboard"
            options={PORSCHE_BODY_COLORS}
            selected={dashboardColor}
            onChange={onDashboardColorChange}
            pickerFallback="#6B4A3A"
          />

          <PorscheColorRow
            label="Dashboard Alcantara"
            options={PORSCHE_BODY_COLORS}
            selected={dashboardAlcantaraColor}
            onChange={onDashboardAlcantaraColorChange}
            pickerFallback="#2B2B2B"
          />

          <PorscheColorRow
            label="Seat Alcantara"
            options={PORSCHE_BODY_COLORS}
            selected={seatAlcantaraColor}
            onChange={onSeatAlcantaraColorChange}
            pickerFallback="#2B2B2B"
          />

          <PorscheColorRow
            label="Seat Leather"
            options={PORSCHE_BODY_COLORS}
            selected={seatLeatherColor}
            onChange={onSeatLeatherColorChange}
            pickerFallback="#6B4A3A"
          />

          <PorscheColorRow
            label="Seat Carbon Shell"
            options={PORSCHE_BODY_COLORS}
            selected={seatCarbonColor}
            onChange={onSeatCarbonColorChange}
            pickerFallback="#111111"
          />

          <PorscheColorRow
            label="Carpet"
            options={PORSCHE_BODY_COLORS}
            selected={carpetColor}
            onChange={onCarpetColorChange}
            pickerFallback="#202020"
          />

          <PorscheColorRow
            label="Door Leather"
            options={PORSCHE_BODY_COLORS}
            selected={doorLeatherColor}
            onChange={onDoorLeatherColorChange}
            pickerFallback="#6B4A3A"
          />

          <PorscheColorRow
            label="Door Upper Alcantara"
            options={PORSCHE_BODY_COLORS}
            selected={doorUpperAlcantaraColor}
            onChange={onDoorUpperAlcantaraColorChange}
            pickerFallback="#2B2B2B"
          />

          <PorscheColorRow
            label="Door Lower Alcantara"
            options={PORSCHE_BODY_COLORS}
            selected={doorLowerAlcantaraColor}
            onChange={onDoorLowerAlcantaraColorChange}
            pickerFallback="#2B2B2B"
          />

          <PorscheColorRow
            label="Door Carbon Trim"
            options={PORSCHE_BODY_COLORS}
            selected={doorCarbonTrimColor}
            onChange={onDoorCarbonTrimColorChange}
            pickerFallback="#111111"
          />

          <PorscheColorRow
            label="Door Metal Trim"
            options={PORSCHE_BODY_COLORS}
            selected={doorMetalTrimColor}
            onChange={onDoorMetalTrimColorChange}
            pickerFallback="#B7BDC5"
          />

          <WindowTintSlider value={windowTint} onChange={onWindowTintChange} />
        </div>
      )}
    </div>
  );
}

// Lets each customization field be driven by an external controller (the
// Studio route, which owns per-vehicle design state as the single source of
// truth) while staying fully self-contained — and identical to today's
// behavior — for any caller that doesn't pass the controlled value/setter,
// such as the validationMode-only debug panels below.
function useControllable<T>(
  controlledValue: T | undefined,
  onChange: ((value: T) => void) | undefined,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      if (!isControlled) {
        setInternalValue(resolved);
      }
      onChange?.(resolved);
    },
    [isControlled, onChange, value],
  );

  return [value, setValue];
}

export interface GarageCanvasHandle {
  showExteriorView: () => void;
  showInteriorView: () => void;
  focusWheels: () => void;
  // Returns a "image/png" data URL of the current frame, or null if the
  // renderer isn't mounted yet. Relies on the <Canvas> below already being
  // configured with gl={{ preserveDrawingBuffer: true }}.
  capturePng: () => string | null;
}

export interface GarageCanvasProps {
  design: DesignState;
  environment?: "studio" | "warehouse";
  validationMode?: boolean;
  // Controlled vehicle selection — the Studio route drives this from the
  // matched route param, so the debug VehicleSelector isn't the only way
  // to switch vehicles.
  vehicle?: ValidationVehicleId;
  onVehicleChange?: (vehicle: ValidationVehicleId) => void;
  // BMW — all optional/controlled; omitted fields keep managing themselves
  // internally exactly as before.
  bmwBodyColor?: PorscheColorChoice;
  onBmwBodyColorChange?: (value: PorscheColorChoice) => void;
  bmwWheelColor?: PorscheColorChoice;
  onBmwWheelColorChange?: (value: PorscheColorChoice) => void;
  bmwSeatColor?: PorscheColorChoice;
  onBmwSeatColorChange?: (value: PorscheColorChoice) => void;
  bmwCaliperColor?: PorscheColorChoice;
  onBmwCaliperColorChange?: (value: PorscheColorChoice) => void;
  bmwWindowTint?: number;
  onBmwWindowTintChange?: (value: number) => void;
  // BYD
  bydBodyColor?: PorscheColorChoice;
  onBydBodyColorChange?: (value: PorscheColorChoice) => void;
  bydRimColor?: PorscheColorChoice;
  onBydRimColorChange?: (value: PorscheColorChoice) => void;
  bydWindowTint?: number;
  onBydWindowTintChange?: (value: number) => void;
  // Porsche — exterior fields.
  porscheWheelColor?: PorscheColorChoice;
  onPorscheWheelColorChange?: (value: PorscheColorChoice) => void;
  porscheCaliperColor?: PorscheColorChoice;
  onPorscheCaliperColorChange?: (value: PorscheColorChoice) => void;
  porscheBodyColor?: PorscheColorChoice;
  onPorscheBodyColorChange?: (value: PorscheColorChoice) => void;
  porscheHoodMode?: PorscheHoodMode;
  onPorscheHoodModeChange?: (value: PorscheHoodMode) => void;
  porscheHoodColor?: PorscheColorChoice;
  onPorscheHoodColorChange?: (value: PorscheColorChoice) => void;
  porscheWindowTint?: number;
  onPorscheWindowTintChange?: (value: number) => void;
  // Porsche — interior fields. All optional/controlled, same fallback
  // pattern as every other field: omitted props keep managing themselves
  // internally exactly as before.
  porscheDashboardColor?: PorscheColorChoice;
  onPorscheDashboardColorChange?: (value: PorscheColorChoice) => void;
  porscheDashboardAlcantaraColor?: PorscheColorChoice;
  onPorscheDashboardAlcantaraColorChange?: (value: PorscheColorChoice) => void;
  porscheSeatAlcantaraColor?: PorscheColorChoice;
  onPorscheSeatAlcantaraColorChange?: (value: PorscheColorChoice) => void;
  porscheSeatLeatherColor?: PorscheColorChoice;
  onPorscheSeatLeatherColorChange?: (value: PorscheColorChoice) => void;
  porscheSeatCarbonColor?: PorscheColorChoice;
  onPorscheSeatCarbonColorChange?: (value: PorscheColorChoice) => void;
  porscheCarpetColor?: PorscheColorChoice;
  onPorscheCarpetColorChange?: (value: PorscheColorChoice) => void;
  porscheDoorLeatherColor?: PorscheColorChoice;
  onPorscheDoorLeatherColorChange?: (value: PorscheColorChoice) => void;
  porscheDoorUpperAlcantaraColor?: PorscheColorChoice;
  onPorscheDoorUpperAlcantaraColorChange?: (value: PorscheColorChoice) => void;
  porscheDoorLowerAlcantaraColor?: PorscheColorChoice;
  onPorscheDoorLowerAlcantaraColorChange?: (value: PorscheColorChoice) => void;
  porscheDoorCarbonTrimColor?: PorscheColorChoice;
  onPorscheDoorCarbonTrimColorChange?: (value: PorscheColorChoice) => void;
  porscheDoorMetalTrimColor?: PorscheColorChoice;
  onPorscheDoorMetalTrimColorChange?: (value: PorscheColorChoice) => void;
}

export const GarageCanvas = forwardRef<GarageCanvasHandle, GarageCanvasProps>(function GarageCanvas(
  {
    design,
    environment = "studio",
    validationMode = false,
    vehicle: controlledVehicle,
    onVehicleChange,
    bmwBodyColor: controlledBmwBodyColor,
    onBmwBodyColorChange,
    bmwWheelColor: controlledBmwWheelColor,
    onBmwWheelColorChange,
    bmwSeatColor: controlledBmwSeatColor,
    onBmwSeatColorChange,
    bmwCaliperColor: controlledBmwCaliperColor,
    onBmwCaliperColorChange,
    bmwWindowTint: controlledBmwWindowTint,
    onBmwWindowTintChange,
    bydBodyColor: controlledBydBodyColor,
    onBydBodyColorChange,
    bydRimColor: controlledBydRimColor,
    onBydRimColorChange,
    bydWindowTint: controlledBydWindowTint,
    onBydWindowTintChange,
    porscheWheelColor: controlledPorscheWheelColor,
    onPorscheWheelColorChange,
    porscheCaliperColor: controlledPorscheCaliperColor,
    onPorscheCaliperColorChange,
    porscheBodyColor: controlledPorscheBodyColor,
    onPorscheBodyColorChange,
    porscheHoodMode: controlledPorscheHoodMode,
    onPorscheHoodModeChange,
    porscheHoodColor: controlledPorscheHoodColor,
    onPorscheHoodColorChange,
    porscheWindowTint: controlledPorscheWindowTint,
    onPorscheWindowTintChange,
    porscheDashboardColor: controlledPorscheDashboardColor,
    onPorscheDashboardColorChange,
    porscheDashboardAlcantaraColor: controlledPorscheDashboardAlcantaraColor,
    onPorscheDashboardAlcantaraColorChange,
    porscheSeatAlcantaraColor: controlledPorscheSeatAlcantaraColor,
    onPorscheSeatAlcantaraColorChange,
    porscheSeatLeatherColor: controlledPorscheSeatLeatherColor,
    onPorscheSeatLeatherColorChange,
    porscheSeatCarbonColor: controlledPorscheSeatCarbonColor,
    onPorscheSeatCarbonColorChange,
    porscheCarpetColor: controlledPorscheCarpetColor,
    onPorscheCarpetColorChange,
    porscheDoorLeatherColor: controlledPorscheDoorLeatherColor,
    onPorscheDoorLeatherColorChange,
    porscheDoorUpperAlcantaraColor: controlledPorscheDoorUpperAlcantaraColor,
    onPorscheDoorUpperAlcantaraColorChange,
    porscheDoorLowerAlcantaraColor: controlledPorscheDoorLowerAlcantaraColor,
    onPorscheDoorLowerAlcantaraColorChange,
    porscheDoorCarbonTrimColor: controlledPorscheDoorCarbonTrimColor,
    onPorscheDoorCarbonTrimColorChange,
    porscheDoorMetalTrimColor: controlledPorscheDoorMetalTrimColor,
    onPorscheDoorMetalTrimColorChange,
  },
  ref,
) {
  const [viewMode, setViewMode] = useState<ViewMode>("exterior");

  const [vehicle, setVehicle] = useControllable<ValidationVehicleId>(
    controlledVehicle,
    onVehicleChange,
    "bmw",
  );

  const bydValidation = useBydRim01Validation();

  const activeInteriorPovs =
    vehicle === "porsche"
      ? PORSCHE_INTERIOR_POVS
      : vehicle === "byd"
        ? BYD_INTERIOR_POVS
        : INTERIOR_POVS;

  const activeExteriorView =
    vehicle === "porsche"
      ? PORSCHE_EXTERIOR_VIEW
      : vehicle === "byd"
        ? BYD_EXTERIOR_VIEW
        : EXTERIOR_VIEW;

  const activeWheelsView =
    vehicle === "porsche"
      ? PORSCHE_FOCUS_WHEELS_VIEW
      : vehicle === "byd"
        ? BYD_FOCUS_WHEELS_VIEW
        : FOCUS_WHEELS_VIEW;

  function handleVehicleChange(next: ValidationVehicleId) {
    if (next === vehicle) {
      return;
    }

    bydValidation.resetValidationState();
    setInteriorPovIndex(0);
    setVehicle(next);

    if (next === "byd") {
      bydValidation.verifyChecksumBeforeLoad();
    }
  }

  const [interiorPovIndex, setInteriorPovIndex] = useState(0);

  const [exteriorPreset, setExteriorPreset] = useState<ExteriorPreset>("default");

  const [viewNonce, setViewNonce] = useState(0);

  const [calibrationFreeCamera, setCalibrationFreeCamera] = useState(false);

  const [bmwCustomizationOpen, setBmwCustomizationOpen] = useState(false);

  const [bmwBodyColor, setBmwBodyColor] = useControllable<PorscheColorChoice>(
    controlledBmwBodyColor,
    onBmwBodyColorChange,
    null,
  );

  const [bmwWheelColor, setBmwWheelColor] = useControllable<PorscheColorChoice>(
    controlledBmwWheelColor,
    onBmwWheelColorChange,
    null,
  );

  const [bmwSeatColor, setBmwSeatColor] = useControllable<PorscheColorChoice>(
    controlledBmwSeatColor,
    onBmwSeatColorChange,
    null,
  );

  const [bmwCaliperColor, setBmwCaliperColor] = useControllable<PorscheColorChoice>(
    controlledBmwCaliperColor,
    onBmwCaliperColorChange,
    null,
  );

  const [bmwWindowTint, setBmwWindowTint] = useControllable<number>(
    controlledBmwWindowTint,
    onBmwWindowTintChange,
    0,
  );

  const [bydCustomizationOpen, setBydCustomizationOpen] = useState(false);

  const [bydBodyColor, setBydBodyColor] = useControllable<PorscheColorChoice>(
    controlledBydBodyColor,
    onBydBodyColorChange,
    null,
  );

  const [bydRimColor, setBydRimColor] = useControllable<PorscheColorChoice>(
    controlledBydRimColor,
    onBydRimColorChange,
    null,
  );

  const [bydWindowTint, setBydWindowTint] = useControllable<number>(
    controlledBydWindowTint,
    onBydWindowTintChange,
    0,
  );

  const [porscheCustomizationOpen, setPorscheCustomizationOpen] = useState(false);

  const [porscheWheelColor, setPorscheWheelColor] = useControllable<PorscheColorChoice>(
    controlledPorscheWheelColor,
    onPorscheWheelColorChange,
    null,
  );

  const [porscheCaliperColor, setPorscheCaliperColor] = useControllable<PorscheColorChoice>(
    controlledPorscheCaliperColor,
    onPorscheCaliperColorChange,
    null,
  );

  const [porscheBodyColor, setPorscheBodyColor] = useControllable<PorscheColorChoice>(
    controlledPorscheBodyColor,
    onPorscheBodyColorChange,
    null,
  );

  const [porscheHoodMode, setPorscheHoodMode] = useControllable<PorscheHoodMode>(
    controlledPorscheHoodMode,
    onPorscheHoodModeChange,
    "separate",
  );

  const [porscheHoodColor, setPorscheHoodColor] = useControllable<PorscheColorChoice>(
    controlledPorscheHoodColor,
    onPorscheHoodColorChange,
    null,
  );

  const [porscheDashboardColor, setPorscheDashboardColor] = useControllable<PorscheColorChoice>(
    controlledPorscheDashboardColor,
    onPorscheDashboardColorChange,
    null,
  );
  const [porscheDashboardAlcantaraColor, setPorscheDashboardAlcantaraColor] =
    useControllable<PorscheColorChoice>(
      controlledPorscheDashboardAlcantaraColor,
      onPorscheDashboardAlcantaraColorChange,
      null,
    );
  const [porscheSeatAlcantaraColor, setPorscheSeatAlcantaraColor] =
    useControllable<PorscheColorChoice>(
      controlledPorscheSeatAlcantaraColor,
      onPorscheSeatAlcantaraColorChange,
      null,
    );
  const [porscheSeatLeatherColor, setPorscheSeatLeatherColor] = useControllable<PorscheColorChoice>(
    controlledPorscheSeatLeatherColor,
    onPorscheSeatLeatherColorChange,
    null,
  );
  const [porscheSeatCarbonColor, setPorscheSeatCarbonColor] = useControllable<PorscheColorChoice>(
    controlledPorscheSeatCarbonColor,
    onPorscheSeatCarbonColorChange,
    null,
  );
  const [porscheCarpetColor, setPorscheCarpetColor] = useControllable<PorscheColorChoice>(
    controlledPorscheCarpetColor,
    onPorscheCarpetColorChange,
    null,
  );
  const [porscheDoorLeatherColor, setPorscheDoorLeatherColor] = useControllable<PorscheColorChoice>(
    controlledPorscheDoorLeatherColor,
    onPorscheDoorLeatherColorChange,
    null,
  );
  const [porscheDoorUpperAlcantaraColor, setPorscheDoorUpperAlcantaraColor] =
    useControllable<PorscheColorChoice>(
      controlledPorscheDoorUpperAlcantaraColor,
      onPorscheDoorUpperAlcantaraColorChange,
      null,
    );
  const [porscheDoorLowerAlcantaraColor, setPorscheDoorLowerAlcantaraColor] =
    useControllable<PorscheColorChoice>(
      controlledPorscheDoorLowerAlcantaraColor,
      onPorscheDoorLowerAlcantaraColorChange,
      null,
    );
  const [porscheDoorCarbonTrimColor, setPorscheDoorCarbonTrimColor] =
    useControllable<PorscheColorChoice>(
      controlledPorscheDoorCarbonTrimColor,
      onPorscheDoorCarbonTrimColorChange,
      null,
    );
  const [porscheDoorMetalTrimColor, setPorscheDoorMetalTrimColor] =
    useControllable<PorscheColorChoice>(
      controlledPorscheDoorMetalTrimColor,
      onPorscheDoorMetalTrimColorChange,
      null,
    );
  const [porscheWindowTint, setPorscheWindowTint] = useControllable<number>(
    controlledPorscheWindowTint,
    onPorscheWindowTintChange,
    0,
  );

  function restorePorscheOriginal() {
    setPorscheWheelColor(null);
    setPorscheCaliperColor(null);
    setPorscheBodyColor(null);

    setPorscheHoodMode("separate");

    setPorscheHoodColor(null);
    setPorscheDashboardColor(null);
    setPorscheDashboardAlcantaraColor(null);
    setPorscheSeatAlcantaraColor(null);
    setPorscheSeatLeatherColor(null);
    setPorscheSeatCarbonColor(null);
    setPorscheCarpetColor(null);
    setPorscheDoorLeatherColor(null);
    setPorscheDoorUpperAlcantaraColor(null);
    setPorscheDoorLowerAlcantaraColor(null);
    setPorscheDoorCarbonTrimColor(null);
    setPorscheDoorMetalTrimColor(null);
    setPorscheWindowTint(0);
  }

  function showExteriorView() {
    setViewMode("exterior");
    setExteriorPreset("default");

    setViewNonce((n) => n + 1);
  }

  function showInteriorView() {
    if (viewMode === "interior") {
      setInteriorPovIndex((index) => (index + 1) % activeInteriorPovs.length);
    }

    setViewMode("interior");

    setViewNonce((n) => n + 1);
  }

  function focusWheels() {
    setViewMode("exterior");
    setExteriorPreset("wheels");

    setViewNonce((n) => n + 1);
  }

  // No dependency array: showExteriorView/showInteriorView/focusWheels are
  // plain function declarations re-created every render (not memoized), so
  // the handle is simply rebuilt each render too — cheap, and correct
  // without having to chase a dependency list for closures that already
  // capture the current render's values.
  useImperativeHandle(ref, () => ({
    showExteriorView,
    showInteriorView,
    focusWheels,
    capturePng,
  }));

  function toggleCalibrationFreeCamera() {
    setCalibrationFreeCamera((current) => {
      const next = !current;

      if (!next) {
        setViewNonce((n) => n + 1);
      }

      return next;
    });
  }

  const poseRef = useRef<CapturedPose | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // The <Canvas> below is already configured with gl={{ preserveDrawingBuffer: true }},
  // which is what makes toDataURL() reliably capture the current frame instead
  // of a blank/cleared buffer — no extra render call needed here.
  function capturePng(): string | null {
    const renderer = rendererRef.current;

    if (!renderer) {
      return null;
    }

    return renderer.domElement.toDataURL("image/png");
  }

  function formatCurrentPose(): string | null {
    const pose = poseRef.current;

    if (!pose) {
      return null;
    }

    const {
      camera,
      controls,
      viewMode: capturedViewMode,
      interiorPovIndex: capturedIndex,
      calibrationFreeCamera: capturedCalibration,
    } = pose;

    const usesLookDirection = capturedCalibration || capturedViewMode === "interior";

    const target = usesLookDirection
      ? camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()))
      : (controls?.target ?? new THREE.Vector3());

    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : "-";

    const lines = [
      "POV COPY:",
      `position: [${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(
        2,
      )}, ${camera.position.z.toFixed(2)}]`,
      `target: [${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}]`,
      `fov: ${fov}`,
      `viewMode: ${capturedViewMode}`,
    ];

    if (capturedViewMode === "interior") {
      lines.push(`pov: ${activeInteriorPovs[capturedIndex]?.name ?? "Unknown"}`);
    }

    lines.push(`calibrationFreeCamera: ${capturedCalibration}`);

    return lines.join("\n");
  }

  function handleLogCameraPose() {
    const text = formatCurrentPose();

    if (text) {
      console.log(text);
    }
  }

  function handleCopyCameraPose() {
    const text = formatCurrentPose();

    if (!text) {
      return;
    }

    console.log(text);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => console.log("Camera pose copied"),
        () => undefined,
      );
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {validationMode && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {validationMode && <VehicleSelector vehicle={vehicle} onChange={handleVehicleChange} />}

          {validationMode && vehicle === "byd" && (
            <span
              style={{
                alignSelf: "center",
                fontSize: "12px",
                color: "#e0b34d",
              }}
            >
              Checksum:{" "}
              {bydValidation.checksumBlocked
                ? "MISMATCH — BLOCKED"
                : bydValidation.checksumBefore
                  ? bydValidation.checksumBefore.matches
                    ? "MATCH"
                    : "MISMATCH"
                  : "checking..."}
            </span>
          )}

          <button type="button" onClick={showExteriorView}>
            Exterior View
          </button>

          <button type="button" onClick={showInteriorView}>
            Interior View: {activeInteriorPovs[interiorPovIndex]?.name ?? "Driver"}
          </button>

          <button type="button" onClick={focusWheels}>
            Focus Wheels
          </button>

          <button type="button" onClick={handleLogCameraPose}>
            Log Camera Pose
          </button>

          <button type="button" onClick={handleCopyCameraPose}>
            Copy Camera Pose
          </button>

          <button type="button" onClick={toggleCalibrationFreeCamera}>
            Calibration Free Camera: {calibrationFreeCamera ? "ON" : "OFF"}
          </button>

          {calibrationFreeCamera && (
            <span
              style={{
                alignSelf: "center",
                fontSize: "12px",
              }}
            >
              Calibration: drag mouse to look, W/A/S/D move, Q/E height, Shift faster
            </span>
          )}

          {viewMode === "interior" && !calibrationFreeCamera && (
            <span
              style={{
                alignSelf: "center",
                fontSize: "12px",
              }}
            >
              Interior POV: drag mouse to look around
            </span>
          )}
        </div>
      )}

      {validationMode && vehicle === "bmw" && (
        <BydColorControls
          vehicleLabel="BMW"
          isOpen={bmwCustomizationOpen}
          onToggleOpen={() => setBmwCustomizationOpen((current) => !current)}
          bodyColor={bmwBodyColor}
          onBodyColorChange={setBmwBodyColor}
          rimColor={bmwWheelColor}
          onRimColorChange={setBmwWheelColor}
          seatColor={bmwSeatColor}
          onSeatColorChange={setBmwSeatColor}
          caliperColor={bmwCaliperColor}
          onCaliperColorChange={setBmwCaliperColor}
          windowTint={bmwWindowTint}
          onWindowTintChange={setBmwWindowTint}
          onRestoreOriginal={() => {
            setBmwBodyColor(null);
            setBmwWheelColor(null);
            setBmwSeatColor(null);
            setBmwCaliperColor(null);
            setBmwWindowTint(0);
          }}
        />
      )}

      {validationMode &&
        vehicle === "byd" &&
        !bydValidation.checksumBlocked &&
        bydValidation.checksumBefore?.matches && (
          <BydColorControls
            isOpen={bydCustomizationOpen}
            onToggleOpen={() => setBydCustomizationOpen((current) => !current)}
            bodyColor={bydBodyColor}
            onBodyColorChange={setBydBodyColor}
            rimColor={bydRimColor}
            onRimColorChange={setBydRimColor}
            windowTint={bydWindowTint}
            onWindowTintChange={setBydWindowTint}
            onRestoreOriginal={() => {
              setBydBodyColor(null);
              setBydRimColor(null);
              setBydWindowTint(0);
            }}
          />
        )}

      {validationMode && vehicle === "porsche" && (
        <PorscheColorControls
          isOpen={porscheCustomizationOpen}
          onToggleOpen={() => setPorscheCustomizationOpen((current) => !current)}
          wheelColor={porscheWheelColor}
          caliperColor={porscheCaliperColor}
          bodyColor={porscheBodyColor}
          hoodMode={porscheHoodMode}
          hoodColor={porscheHoodColor}
          dashboardColor={porscheDashboardColor}
          dashboardAlcantaraColor={porscheDashboardAlcantaraColor}
          seatAlcantaraColor={porscheSeatAlcantaraColor}
          seatLeatherColor={porscheSeatLeatherColor}
          seatCarbonColor={porscheSeatCarbonColor}
          carpetColor={porscheCarpetColor}
          doorLeatherColor={porscheDoorLeatherColor}
          doorUpperAlcantaraColor={porscheDoorUpperAlcantaraColor}
          doorLowerAlcantaraColor={porscheDoorLowerAlcantaraColor}
          doorCarbonTrimColor={porscheDoorCarbonTrimColor}
          doorMetalTrimColor={porscheDoorMetalTrimColor}
          onWheelColorChange={setPorscheWheelColor}
          onCaliperColorChange={setPorscheCaliperColor}
          onBodyColorChange={setPorscheBodyColor}
          onHoodModeChange={setPorscheHoodMode}
          onHoodColorChange={setPorscheHoodColor}
          onDashboardColorChange={setPorscheDashboardColor}
          onDashboardAlcantaraColorChange={setPorscheDashboardAlcantaraColor}
          onSeatAlcantaraColorChange={setPorscheSeatAlcantaraColor}
          onSeatLeatherColorChange={setPorscheSeatLeatherColor}
          onSeatCarbonColorChange={setPorscheSeatCarbonColor}
          onCarpetColorChange={setPorscheCarpetColor}
          onDoorLeatherColorChange={setPorscheDoorLeatherColor}
          onDoorUpperAlcantaraColorChange={setPorscheDoorUpperAlcantaraColor}
          onDoorLowerAlcantaraColorChange={setPorscheDoorLowerAlcantaraColor}
          onDoorCarbonTrimColorChange={setPorscheDoorCarbonTrimColor}
          onDoorMetalTrimColorChange={setPorscheDoorMetalTrimColor}
          windowTint={porscheWindowTint}
          onWindowTintChange={setPorscheWindowTint}
          onRestoreOriginal={restorePorscheOriginal}
        />
      )}

      <div style={{ flex: 1 }}>
        <Canvas
          shadows
          camera={{
            position: [5.5, 4.5, 6.5],
            fov: 38,
            near: 0.1,
            far: 1000,
          }}
          dpr={[1, 2]}
          gl={{
            preserveDrawingBuffer: true,
          }}
        >
          <color attach="background" args={["#0A0A0C"]} />

          <hemisphereLight intensity={0.4} groundColor="#0a0a0c" />

          <directionalLight position={[5, 5, 5]} intensity={1} />

          <gridHelper args={[12, 24]} position={[0, 0, 0]} />

          <ModelErrorBoundary key={vehicle}>
            <Suspense fallback={<ModelLoadingFallback />}>
              {vehicle === "bmw" ? (
                <CarModel
                  design={design}
                  bodyColor={bmwBodyColor}
                  wheelColor={bmwWheelColor}
                  seatColor={bmwSeatColor}
                  caliperColor={bmwCaliperColor}
                  windowTint={bmwWindowTint}
                />
              ) : vehicle === "porsche" ? (
                <PorscheModel
                  wheelColor={porscheWheelColor}
                  caliperColor={porscheCaliperColor}
                  bodyColor={porscheBodyColor}
                  hoodMode={porscheHoodMode}
                  hoodColor={porscheHoodColor}
                  dashboardColor={porscheDashboardColor}
                  dashboardAlcantaraColor={porscheDashboardAlcantaraColor}
                  seatAlcantaraColor={porscheSeatAlcantaraColor}
                  seatLeatherColor={porscheSeatLeatherColor}
                  seatCarbonColor={porscheSeatCarbonColor}
                  carpetColor={porscheCarpetColor}
                  doorLeatherColor={porscheDoorLeatherColor}
                  doorUpperAlcantaraColor={porscheDoorUpperAlcantaraColor}
                  doorLowerAlcantaraColor={porscheDoorLowerAlcantaraColor}
                  doorCarbonTrimColor={porscheDoorCarbonTrimColor}
                  doorMetalTrimColor={porscheDoorMetalTrimColor}
                  windowTint={porscheWindowTint}
                />
              ) : (
                !bydValidation.checksumBlocked && (
                  <BydSealModel
                    bodyColor={bydBodyColor}
                    rimColor={bydRimColor}
                    windowTint={bydWindowTint}
                    onReady={bydValidation.registerModelInfo}
                  />
                )
              )}

              <Environment preset={environment} />
            </Suspense>
          </ModelErrorBoundary>

          <ContactShadows position={[0, 0, 0]} opacity={0.65} blur={2.4} scale={12} far={4} />

          <OrbitControls makeDefault enableDamping autoRotateSpeed={0.6} />

          <RendererCapture rendererRef={rendererRef} />

          <>
            <CameraRig
              viewMode={viewMode}
              interiorPovIndex={interiorPovIndex}
              interiorPovs={activeInteriorPovs}
              exteriorView={activeExteriorView}
              wheelsView={activeWheelsView}
              exteriorPreset={exteriorPreset}
              viewNonce={viewNonce}
            />

            <PoseTracker
              viewMode={viewMode}
              interiorPovIndex={interiorPovIndex}
              calibrationFreeCamera={calibrationFreeCamera}
              poseRef={poseRef}
            />

            {calibrationFreeCamera && <CalibrationFreeCamera />}

            {viewMode === "interior" && !calibrationFreeCamera && (
              <InteriorFixedLookCamera
                key={`${vehicle}-${interiorPovIndex}`}
                pov={activeInteriorPovs[interiorPovIndex] ?? activeInteriorPovs[0]}
              />
            )}
          </>

          {validationMode && vehicle === "byd" && (
            <BydSceneApiBridge apiRef={bydValidation.sceneApiRef} />
          )}
        </Canvas>
      </div>
    </div>
  );
});
