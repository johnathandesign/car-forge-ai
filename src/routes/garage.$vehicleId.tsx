import { createFileRoute, Link, useParams, useNavigate, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { VEHICLES, getVehicle, EXTERIOR_CATEGORIES, INTERIOR_CATEGORIES } from "@/lib/vehicles";
import type { VehicleId } from "@/lib/vehicles";
import {
  ArrowLeft,
  ArrowRight,
  Undo2,
  Redo2,
  RotateCcw,
  RefreshCw,
  GitCompareArrows,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  Lock,
  AlertCircle,
  Sliders,
  Eye,
  Armchair,
  Disc3,
  Pipette,
  Download,
  Loader2,
} from "lucide-react";
import {
  PORSCHE_BODY_COLORS,
  PORSCHE_WHEEL_COLORS,
  PORSCHE_CALIPER_COLORS,
  PORSCHE_HOOD_COLORS,
  HEX_COLOR_PATTERN,
  normalizeHexColor,
  getReadableTextColor,
  type PorscheColorChoice,
  type PorscheColorOption,
  type PorscheHoodMode,
} from "@/components/garage/colorPalettes";
import type { GarageCanvasHandle } from "@/components/garage/GarageCanvas";
import type { ValidationVehicleId } from "@/components/garage/VehicleSelector";
import type { DesignState } from "@/types/carModelDesign";
import {
  designHistoryReducer,
  createDesignHistory,
  DEFAULT_BMW_SNAPSHOT,
  DEFAULT_BYD_SNAPSHOT,
  DEFAULT_PORSCHE_SNAPSHOT,
  type BmwDesignSnapshot,
  type BydDesignSnapshot,
  type PorscheDesignSnapshot,
} from "@/components/garage/designHistory";

// Lazy-loaded (never a static import): GarageCanvas.tsx pulls in three.js /
// @react-three/fiber and, transitively, useGLTF.preload() calls that run at
// module-evaluation time. Those need a real browser fetch() with an
// absolute URL — statically importing this module would evaluate it during
// SSR too and throw. lazy() + ClientOnly keeps it out of the server bundle
// and only loads it once we're rendering in the browser.
const GarageCanvas = lazy(() =>
  import("@/components/garage/GarageCanvas").then((m) => ({ default: m.GarageCanvas })),
);

export const Route = createFileRoute("/garage/$vehicleId")({
  head: ({ params }) => {
    const v = getVehicle(params.vehicleId);
    const title = v ? `${v.name} — Garage — CarForge AI` : "Garage — CarForge AI";
    const desc = v
      ? `Customize the ${v.name} in a professional 3D garage: exterior colors, rims, spoilers, interior, and more.`
      : "Customize your vehicle in the CarForge AI garage.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
    };
  },
  component: GaragePage,
});

// Route vehicleId -> the 3D runtime's own vehicle identifier. Smallest
// possible mapping adapter between the Showroom/route layer and GarageCanvas.
const VEHICLE_RUNTIME_MAP: Record<VehicleId, ValidationVehicleId> = {
  "bmw-m3": "bmw",
  "byd-seal": "byd",
  "porsche-manthey": "porsche",
};

// CarModel.tsx's enum-driven fallback path (design.exterior/interior) only
// ever applies to BMW meshes outside the confirmed, live-color-overridden
// sets in src/config/partsMap.ts — none exist in the shipped GLB today, so
// these values are inert. Kept as valid enum members for forward safety.
const DEFAULT_DESIGN_STATE: DesignState = {
  exterior: { bodyColor: "pearl_white", windowTint: "0", rims: "silver_sport" },
  interior: { seatColor: "black", seatMaterial: "leather" },
};

function GaragePage() {
  const { vehicleId } = useParams({ from: "/garage/$vehicleId" });
  const vehicle = getVehicle(vehicleId);
  const { t, locale, dir } = useI18n();
  const navigate = useNavigate();
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const [tab, setTab] = useState<"exterior" | "interior">("exterior");
  const [selected, setSelected] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const garageRef = useRef<GarageCanvasHandle>(null);

  // Real customization state — single source of truth, independent per
  // vehicle, passed straight into GarageCanvas as controlled props. This is
  // the actual configurator state (not a second/parallel design state).
  //
  // Each vehicle's fields live in one canonical snapshot object managed by
  // a past/present/future history reducer (designHistory.ts), so Undo/Redo
  // in the Studio toolbar operate on real design changes. The individual
  // `bmwBodyColor`/`setBmwBodyColor`-style values below are derived from
  // that snapshot so every existing consumer (GarageCanvas props,
  // CustomizationPanel, Change Summary) keeps reading/writing them exactly
  // as before — only how they're sourced changed, not their shape.
  const [bmwHistory, dispatchBmwHistory] = useReducer(
    designHistoryReducer<BmwDesignSnapshot>,
    DEFAULT_BMW_SNAPSHOT,
    createDesignHistory,
  );
  const bmwBodyColor = bmwHistory.present.bodyColor;
  const bmwWheelColor = bmwHistory.present.wheelColor;
  const bmwSeatColor = bmwHistory.present.seatColor;
  const bmwCaliperColor = bmwHistory.present.caliperColor;
  const bmwWindowTint = bmwHistory.present.windowTint;
  const setBmwBodyColor = (value: PorscheColorChoice) =>
    dispatchBmwHistory({ type: "set", snapshot: { ...bmwHistory.present, bodyColor: value } });
  const setBmwWheelColor = (value: PorscheColorChoice) =>
    dispatchBmwHistory({ type: "set", snapshot: { ...bmwHistory.present, wheelColor: value } });
  const setBmwSeatColor = (value: PorscheColorChoice) =>
    dispatchBmwHistory({ type: "set", snapshot: { ...bmwHistory.present, seatColor: value } });
  const setBmwCaliperColor = (value: PorscheColorChoice) =>
    dispatchBmwHistory({ type: "set", snapshot: { ...bmwHistory.present, caliperColor: value } });
  const setBmwWindowTint = (value: number) =>
    dispatchBmwHistory({ type: "set", snapshot: { ...bmwHistory.present, windowTint: value } });

  const [bydHistory, dispatchBydHistory] = useReducer(
    designHistoryReducer<BydDesignSnapshot>,
    DEFAULT_BYD_SNAPSHOT,
    createDesignHistory,
  );
  const bydBodyColor = bydHistory.present.bodyColor;
  const bydRimColor = bydHistory.present.rimColor;
  const bydWindowTint = bydHistory.present.windowTint;
  const setBydBodyColor = (value: PorscheColorChoice) =>
    dispatchBydHistory({ type: "set", snapshot: { ...bydHistory.present, bodyColor: value } });
  const setBydRimColor = (value: PorscheColorChoice) =>
    dispatchBydHistory({ type: "set", snapshot: { ...bydHistory.present, rimColor: value } });
  const setBydWindowTint = (value: number) =>
    dispatchBydHistory({ type: "set", snapshot: { ...bydHistory.present, windowTint: value } });

  // Porsche interior — the same real fields GarageCanvas already owns
  // internally (see PorscheModel.tsx), lifted to the route as controlled
  // props. Porsche Carpet stays removed (DEFAULT_PORSCHE_SNAPSHOT has no
  // carpet field) and must not be reintroduced here.
  const [porscheHistory, dispatchPorscheHistory] = useReducer(
    designHistoryReducer<PorscheDesignSnapshot>,
    DEFAULT_PORSCHE_SNAPSHOT,
    createDesignHistory,
  );
  const porscheWheelColor = porscheHistory.present.wheelColor;
  const porscheCaliperColor = porscheHistory.present.caliperColor;
  const porscheBodyColor = porscheHistory.present.bodyColor;
  const porscheHoodMode = porscheHistory.present.hoodMode;
  const porscheHoodColor = porscheHistory.present.hoodColor;
  const porscheWindowTint = porscheHistory.present.windowTint;
  const porscheDashboardColor = porscheHistory.present.dashboardColor;
  const porscheDashboardAlcantaraColor = porscheHistory.present.dashboardAlcantaraColor;
  const porscheSeatAlcantaraColor = porscheHistory.present.seatAlcantaraColor;
  const porscheSeatLeatherColor = porscheHistory.present.seatLeatherColor;
  const porscheSeatCarbonColor = porscheHistory.present.seatCarbonColor;
  const porscheDoorLeatherColor = porscheHistory.present.doorLeatherColor;
  const porscheDoorUpperAlcantaraColor = porscheHistory.present.doorUpperAlcantaraColor;
  const porscheDoorLowerAlcantaraColor = porscheHistory.present.doorLowerAlcantaraColor;
  const porscheDoorCarbonTrimColor = porscheHistory.present.doorCarbonTrimColor;
  const porscheDoorMetalTrimColor = porscheHistory.present.doorMetalTrimColor;
  const setPorscheWheelColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, wheelColor: value },
    });
  const setPorscheCaliperColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, caliperColor: value },
    });
  const setPorscheBodyColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, bodyColor: value },
    });
  const setPorscheHoodMode = (value: PorscheHoodMode) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, hoodMode: value },
    });
  const setPorscheHoodColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, hoodColor: value },
    });
  const setPorscheWindowTint = (value: number) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, windowTint: value },
    });
  const setPorscheDashboardColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, dashboardColor: value },
    });
  const setPorscheDashboardAlcantaraColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, dashboardAlcantaraColor: value },
    });
  const setPorscheSeatAlcantaraColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, seatAlcantaraColor: value },
    });
  const setPorscheSeatLeatherColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, seatLeatherColor: value },
    });
  const setPorscheSeatCarbonColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, seatCarbonColor: value },
    });
  const setPorscheDoorLeatherColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, doorLeatherColor: value },
    });
  const setPorscheDoorUpperAlcantaraColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, doorUpperAlcantaraColor: value },
    });
  const setPorscheDoorLowerAlcantaraColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, doorLowerAlcantaraColor: value },
    });
  const setPorscheDoorCarbonTrimColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, doorCarbonTrimColor: value },
    });
  const setPorscheDoorMetalTrimColor = (value: PorscheColorChoice) =>
    dispatchPorscheHistory({
      type: "set",
      snapshot: { ...porscheHistory.present, doorMetalTrimColor: value },
    });

  // Reset whenever the route's vehicle changes camera framing back to a
  // known-safe default (GarageCanvas already clamps every preset itself —
  // this just avoids leaving a stale "focus wheels" close-up framed on a
  // freshly switched vehicle).
  useEffect(() => {
    setSelected(null);
    setTab("exterior");
    garageRef.current?.showExteriorView();
  }, [vehicleId]);

  function selectTab(next: "exterior" | "interior") {
    setTab(next);
    if (next === "interior") {
      garageRef.current?.showInteriorView();
    } else {
      garageRef.current?.showExteriorView();
    }
  }

  // Both rim color and brake caliper color are wheel-area controls — either
  // one should keep (or bring) the camera into the wheels-focus preset
  // rather than snapping back to the default exterior view.
  function selectCategory(categoryId: string | null) {
    setSelected(categoryId);
    if (tab !== "exterior") return;
    if (categoryId === "rim-color" || categoryId === "caliper-color") {
      garageRef.current?.focusWheels();
    } else {
      garageRef.current?.showExteriorView();
    }
  }

  // Reset Design and Restore All Original both land here — dispatching one
  // full-snapshot "set" (rather than calling each field setter separately)
  // so a reset is a single undoable step, not one step per field.
  function restoreCurrentVehicle() {
    switch (vehicle?.id) {
      case "bmw-m3":
        dispatchBmwHistory({ type: "set", snapshot: DEFAULT_BMW_SNAPSHOT });
        break;
      case "byd-seal":
        dispatchBydHistory({ type: "set", snapshot: DEFAULT_BYD_SNAPSHOT });
        break;
      case "porsche-manthey":
        dispatchPorscheHistory({ type: "set", snapshot: DEFAULT_PORSCHE_SNAPSHOT });
        break;
    }
  }

  // Undo/Redo operate on whichever vehicle is currently active in the
  // route — each vehicle keeps its own independent past/future stack, so
  // switching vehicles never corrupts another vehicle's history.
  const canUndo =
    vehicle?.id === "bmw-m3"
      ? bmwHistory.past.length > 0
      : vehicle?.id === "byd-seal"
        ? bydHistory.past.length > 0
        : vehicle?.id === "porsche-manthey"
          ? porscheHistory.past.length > 0
          : false;

  const canRedo =
    vehicle?.id === "bmw-m3"
      ? bmwHistory.future.length > 0
      : vehicle?.id === "byd-seal"
        ? bydHistory.future.length > 0
        : vehicle?.id === "porsche-manthey"
          ? porscheHistory.future.length > 0
          : false;

  function handleUndo() {
    switch (vehicle?.id) {
      case "bmw-m3":
        dispatchBmwHistory({ type: "undo" });
        break;
      case "byd-seal":
        dispatchBydHistory({ type: "undo" });
        break;
      case "porsche-manthey":
        dispatchPorscheHistory({ type: "undo" });
        break;
    }
  }

  function handleRedo() {
    switch (vehicle?.id) {
      case "bmw-m3":
        dispatchBmwHistory({ type: "redo" });
        break;
      case "byd-seal":
        dispatchBydHistory({ type: "redo" });
        break;
      case "porsche-manthey":
        dispatchPorscheHistory({ type: "redo" });
        break;
    }
  }

  // capturePng() is synchronous (canvas.toDataURL) but can still take a
  // noticeable moment on a large canvas — the setTimeout lets React commit
  // the isDownloading=true render (spinner, disabled button) before the
  // blocking capture call runs, instead of freezing mid-click with no
  // visible feedback.
  function handleDownloadDesign() {
    if (isDownloading || !vehicle) return;
    setIsDownloading(true);

    setTimeout(() => {
      const dataUrl = garageRef.current?.capturePng() ?? null;

      if (dataUrl) {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `carforge-${vehicle.id}-design.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      setIsDownloading(false);
    }, 0);
  }

  const changeSummary: { label: string; value: string }[] = [];
  const pushChange = (labelHe: string, labelEn: string, value: PorscheColorChoice) => {
    if (value) changeSummary.push({ label: locale === "he" ? labelHe : labelEn, value });
  };
  const pushTint = (tint: number) => {
    if (tint > 0) {
      changeSummary.push({
        label: locale === "he" ? "הכהיית חלונות" : "Window Tint",
        value: `${tint}%`,
      });
    }
  };
  if (vehicle?.id === "bmw-m3") {
    pushChange("צבע מרכב", "Body Color", bmwBodyColor);
    pushChange("צבע חישוקים", "Rim Color", bmwWheelColor);
    pushChange("צבע מושבים", "Seat Color", bmwSeatColor);
    pushChange("צבע קליפרים", "Brake Caliper Color", bmwCaliperColor);
    pushTint(bmwWindowTint);
  } else if (vehicle?.id === "byd-seal") {
    pushChange("צבע מרכב", "Body Color", bydBodyColor);
    pushChange("צבע חישוקים", "Rim Color", bydRimColor);
    pushTint(bydWindowTint);
  } else if (vehicle?.id === "porsche-manthey") {
    pushChange("צבע מרכב", "Body Color", porscheBodyColor);
    pushChange("צבע חישוקים", "Rim Color", porscheWheelColor);
    pushChange("צבע קליפרים", "Brake Caliper Color", porscheCaliperColor);
    if (porscheHoodMode === "separate") {
      pushChange("צבע מכסה מנוע", "Hood Color", porscheHoodColor);
    }
    pushChange("דשבורד", "Dashboard", porscheDashboardColor);
    pushChange("דשבורד — אלקנטרה", "Dashboard Alcantara", porscheDashboardAlcantaraColor);
    pushChange("מושבים — אלקנטרה", "Seat Alcantara", porscheSeatAlcantaraColor);
    pushChange("מושבים — עור", "Seat Leather", porscheSeatLeatherColor);
    pushChange("מושבים — קרבון", "Seat Carbon", porscheSeatCarbonColor);
    pushChange("דלתות — עור", "Door Leather", porscheDoorLeatherColor);
    pushChange("דלתות — אלקנטרה עליון", "Door Upper Alcantara", porscheDoorUpperAlcantaraColor);
    pushChange("דלתות — אלקנטרה תחתון", "Door Lower Alcantara", porscheDoorLowerAlcantaraColor);
    pushChange("דלתות — גימור קרבון", "Door Carbon Trim", porscheDoorCarbonTrimColor);
    pushChange("דלתות — גימור מתכת", "Door Metal Trim", porscheDoorMetalTrimColor);
    pushTint(porscheWindowTint);
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center studio-surface p-8 rounded-xl">
            <AlertCircle className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-4 text-xl font-semibold">{t.garage.invalidVehicle}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t.garage.errorBody}</p>
            <div className="mt-6">
              <Link to="/showroom">
                <Button className="btn-red-glow uppercase tracking-wider text-xs font-semibold">
                  {t.garage.back}
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentCategories = tab === "exterior" ? EXTERIOR_CATEGORIES : INTERIOR_CATEGORIES;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      {/* Command bar */}
      <div className="border-b border-white/8 bg-[oklch(0.13_0.005_260)]">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-3 flex items-center gap-2 flex-wrap">
          <Link to="/showroom" aria-label={t.garage.back}>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 gap-2 text-foreground/85 hover:bg-white/5"
            >
              <Back className="h-4 w-4" />
              <span className="hidden sm:inline">{t.garage.back}</span>
            </Button>
          </Link>

          <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

          <div className="min-w-[180px]">
            <Select
              value={vehicle.id}
              onValueChange={(v) =>
                navigate({ to: "/garage/$vehicleId", params: { vehicleId: v as VehicleId } })
              }
            >
              <SelectTrigger className="h-11 bg-transparent border-white/15">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ms-auto flex items-center gap-1 flex-wrap">
            <IconBtn
              label={t.garage.undo}
              icon={<Undo2 className="h-4 w-4" />}
              onClick={handleUndo}
              disabled={!canUndo}
              title={t.garage.undo}
            />
            <IconBtn
              label={t.garage.redo}
              icon={<Redo2 className="h-4 w-4" />}
              onClick={handleRedo}
              disabled={!canRedo}
              title={t.garage.redo}
            />
            <IconBtn
              label={t.garage.returnOriginal}
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={restoreCurrentVehicle}
            />
            <IconBtn
              label={t.garage.compare}
              icon={<GitCompareArrows className="h-4 w-4" />}
              disabled
              title={t.garage.disabled}
            />
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 gap-2 border-white/15 bg-transparent hover:bg-white/5"
              onClick={() => setResetOpen(true)}
              aria-label={t.garage.reset}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden md:inline text-xs uppercase tracking-wider font-semibold">
                {t.garage.reset}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 gap-2 border-white/15 bg-transparent hover:bg-white/5 disabled:opacity-60"
              onClick={handleDownloadDesign}
              disabled={isDownloading}
              aria-label={isDownloading ? t.garage.downloadingDesign : t.garage.downloadDesign}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden md:inline text-xs uppercase tracking-wider font-semibold">
                {isDownloading ? t.garage.downloadingDesign : t.garage.downloadDesign}
              </span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="btn-red-glow min-h-11 gap-2 uppercase tracking-wider text-xs font-semibold"
              onClick={() => setReviewOpen(true)}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">{t.garage.review}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-3 sm:px-6 py-4 lg:py-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Viewer */}
        <section
          aria-label={vehicle.name}
          className="studio-surface rounded-xl overflow-hidden relative min-h-[420px] lg:min-h-[620px]"
        >
          <div className="absolute inset-0">
            <ClientOnly
              fallback={<ViewerFallback vehicleName={vehicle.name} note={t.garage.loading} />}
            >
              <Suspense
                fallback={<ViewerFallback vehicleName={vehicle.name} note={t.garage.loading} />}
              >
                <GarageCanvas
                  ref={garageRef}
                  design={DEFAULT_DESIGN_STATE}
                  vehicle={VEHICLE_RUNTIME_MAP[vehicle.id]}
                  environment="studio"
                  validationMode={false}
                  bmwBodyColor={bmwBodyColor}
                  onBmwBodyColorChange={setBmwBodyColor}
                  bmwWheelColor={bmwWheelColor}
                  onBmwWheelColorChange={setBmwWheelColor}
                  bmwSeatColor={bmwSeatColor}
                  onBmwSeatColorChange={setBmwSeatColor}
                  bmwCaliperColor={bmwCaliperColor}
                  onBmwCaliperColorChange={setBmwCaliperColor}
                  bmwWindowTint={bmwWindowTint}
                  onBmwWindowTintChange={setBmwWindowTint}
                  bydBodyColor={bydBodyColor}
                  onBydBodyColorChange={setBydBodyColor}
                  bydRimColor={bydRimColor}
                  onBydRimColorChange={setBydRimColor}
                  bydWindowTint={bydWindowTint}
                  onBydWindowTintChange={setBydWindowTint}
                  porscheWheelColor={porscheWheelColor}
                  onPorscheWheelColorChange={setPorscheWheelColor}
                  porscheCaliperColor={porscheCaliperColor}
                  onPorscheCaliperColorChange={setPorscheCaliperColor}
                  porscheBodyColor={porscheBodyColor}
                  onPorscheBodyColorChange={setPorscheBodyColor}
                  porscheHoodMode={porscheHoodMode}
                  onPorscheHoodModeChange={setPorscheHoodMode}
                  porscheHoodColor={porscheHoodColor}
                  onPorscheHoodColorChange={setPorscheHoodColor}
                  porscheWindowTint={porscheWindowTint}
                  onPorscheWindowTintChange={setPorscheWindowTint}
                  porscheDashboardColor={porscheDashboardColor}
                  onPorscheDashboardColorChange={setPorscheDashboardColor}
                  porscheDashboardAlcantaraColor={porscheDashboardAlcantaraColor}
                  onPorscheDashboardAlcantaraColorChange={setPorscheDashboardAlcantaraColor}
                  porscheSeatAlcantaraColor={porscheSeatAlcantaraColor}
                  onPorscheSeatAlcantaraColorChange={setPorscheSeatAlcantaraColor}
                  porscheSeatLeatherColor={porscheSeatLeatherColor}
                  onPorscheSeatLeatherColorChange={setPorscheSeatLeatherColor}
                  porscheSeatCarbonColor={porscheSeatCarbonColor}
                  onPorscheSeatCarbonColorChange={setPorscheSeatCarbonColor}
                  porscheDoorLeatherColor={porscheDoorLeatherColor}
                  onPorscheDoorLeatherColorChange={setPorscheDoorLeatherColor}
                  porscheDoorUpperAlcantaraColor={porscheDoorUpperAlcantaraColor}
                  onPorscheDoorUpperAlcantaraColorChange={setPorscheDoorUpperAlcantaraColor}
                  porscheDoorLowerAlcantaraColor={porscheDoorLowerAlcantaraColor}
                  onPorscheDoorLowerAlcantaraColorChange={setPorscheDoorLowerAlcantaraColor}
                  porscheDoorCarbonTrimColor={porscheDoorCarbonTrimColor}
                  onPorscheDoorCarbonTrimColorChange={setPorscheDoorCarbonTrimColor}
                  porscheDoorMetalTrimColor={porscheDoorMetalTrimColor}
                  onPorscheDoorMetalTrimColorChange={setPorscheDoorMetalTrimColor}
                />
              </Suspense>
            </ClientOnly>
          </div>

          {/* Visible camera controls — real GarageCanvas runtime actions,
              not tied only to the Exterior/Interior tab switch. */}
          <div className="absolute bottom-3 inset-x-0 flex justify-center px-3 z-10 pointer-events-none">
            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-background/85 backdrop-blur-md px-1.5 py-1.5 pointer-events-auto shadow-lg">
              <CameraBtn
                icon={<Eye className="h-4 w-4" />}
                label={t.garage.cameraExterior}
                onClick={() => {
                  setTab("exterior");
                  setSelected(null);
                  garageRef.current?.showExteriorView();
                }}
              />
              <CameraBtn
                icon={<Armchair className="h-4 w-4" />}
                label={t.garage.cameraInterior}
                onClick={() => {
                  setTab("interior");
                  setSelected(null);
                  garageRef.current?.showInteriorView();
                }}
              />
              <CameraBtn
                icon={<Disc3 className="h-4 w-4" />}
                label={t.garage.cameraFocusWheels}
                onClick={() => {
                  setTab("exterior");
                  setSelected("rim-color");
                  garageRef.current?.focusWheels();
                }}
              />
            </div>
          </div>
        </section>

        {/* Desktop panel */}
        <aside className="hidden lg:flex studio-surface rounded-xl flex-col overflow-hidden">
          <CustomizationPanel
            tab={tab}
            setTab={selectTab}
            selected={selected}
            setSelected={selectCategory}
            vehicleSupported={vehicle.supportedCategories}
            categories={currentCategories}
            localeIsHe={locale === "he"}
            t={t}
            ChevronIcon={Chevron}
            vehicleId={vehicle.id}
            bmwWheelColor={bmwWheelColor}
            onBmwWheelColorChange={setBmwWheelColor}
            bmwBodyColor={bmwBodyColor}
            onBmwBodyColorChange={setBmwBodyColor}
            bmwSeatColor={bmwSeatColor}
            onBmwSeatColorChange={setBmwSeatColor}
            bmwCaliperColor={bmwCaliperColor}
            onBmwCaliperColorChange={setBmwCaliperColor}
            bmwWindowTint={bmwWindowTint}
            onBmwWindowTintChange={setBmwWindowTint}
            bydBodyColor={bydBodyColor}
            onBydBodyColorChange={setBydBodyColor}
            bydRimColor={bydRimColor}
            onBydRimColorChange={setBydRimColor}
            bydWindowTint={bydWindowTint}
            onBydWindowTintChange={setBydWindowTint}
            porscheWheelColor={porscheWheelColor}
            onPorscheWheelColorChange={setPorscheWheelColor}
            porscheCaliperColor={porscheCaliperColor}
            onPorscheCaliperColorChange={setPorscheCaliperColor}
            porscheBodyColor={porscheBodyColor}
            onPorscheBodyColorChange={setPorscheBodyColor}
            porscheHoodMode={porscheHoodMode}
            onPorscheHoodModeChange={setPorscheHoodMode}
            porscheHoodColor={porscheHoodColor}
            onPorscheHoodColorChange={setPorscheHoodColor}
            porscheWindowTint={porscheWindowTint}
            onPorscheWindowTintChange={setPorscheWindowTint}
            porscheDashboardColor={porscheDashboardColor}
            onPorscheDashboardColorChange={setPorscheDashboardColor}
            porscheDashboardAlcantaraColor={porscheDashboardAlcantaraColor}
            onPorscheDashboardAlcantaraColorChange={setPorscheDashboardAlcantaraColor}
            porscheSeatAlcantaraColor={porscheSeatAlcantaraColor}
            onPorscheSeatAlcantaraColorChange={setPorscheSeatAlcantaraColor}
            porscheSeatLeatherColor={porscheSeatLeatherColor}
            onPorscheSeatLeatherColorChange={setPorscheSeatLeatherColor}
            porscheSeatCarbonColor={porscheSeatCarbonColor}
            onPorscheSeatCarbonColorChange={setPorscheSeatCarbonColor}
            porscheDoorLeatherColor={porscheDoorLeatherColor}
            onPorscheDoorLeatherColorChange={setPorscheDoorLeatherColor}
            porscheDoorUpperAlcantaraColor={porscheDoorUpperAlcantaraColor}
            onPorscheDoorUpperAlcantaraColorChange={setPorscheDoorUpperAlcantaraColor}
            porscheDoorLowerAlcantaraColor={porscheDoorLowerAlcantaraColor}
            onPorscheDoorLowerAlcantaraColorChange={setPorscheDoorLowerAlcantaraColor}
            porscheDoorCarbonTrimColor={porscheDoorCarbonTrimColor}
            onPorscheDoorCarbonTrimColorChange={setPorscheDoorCarbonTrimColor}
            porscheDoorMetalTrimColor={porscheDoorMetalTrimColor}
            onPorscheDoorMetalTrimColorChange={setPorscheDoorMetalTrimColor}
          />
        </aside>

        {/* Mobile FAB */}
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-30 flex justify-center pointer-events-none">
          <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
            <SheetTrigger asChild>
              <Button className="btn-red-glow pointer-events-auto min-h-12 gap-2 uppercase tracking-wider text-xs font-semibold px-6 shadow-2xl">
                <Sliders className="h-4 w-4" />
                {tab === "exterior" ? t.garage.exterior : t.garage.interior}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="bg-background border-white/10 max-h-[85vh] flex flex-col"
            >
              <SheetTitle className="text-base">{vehicle.name}</SheetTitle>
              <div className="mt-2 flex-1 overflow-hidden">
                <CustomizationPanel
                  tab={tab}
                  setTab={selectTab}
                  selected={selected}
                  setSelected={selectCategory}
                  vehicleSupported={vehicle.supportedCategories}
                  categories={currentCategories}
                  localeIsHe={locale === "he"}
                  t={t}
                  ChevronIcon={Chevron}
                  vehicleId={vehicle.id}
                  bmwWheelColor={bmwWheelColor}
                  onBmwWheelColorChange={setBmwWheelColor}
                  bmwBodyColor={bmwBodyColor}
                  onBmwBodyColorChange={setBmwBodyColor}
                  bmwSeatColor={bmwSeatColor}
                  onBmwSeatColorChange={setBmwSeatColor}
                  bmwCaliperColor={bmwCaliperColor}
                  onBmwCaliperColorChange={setBmwCaliperColor}
                  bmwWindowTint={bmwWindowTint}
                  onBmwWindowTintChange={setBmwWindowTint}
                  bydBodyColor={bydBodyColor}
                  onBydBodyColorChange={setBydBodyColor}
                  bydRimColor={bydRimColor}
                  onBydRimColorChange={setBydRimColor}
                  bydWindowTint={bydWindowTint}
                  onBydWindowTintChange={setBydWindowTint}
                  porscheWheelColor={porscheWheelColor}
                  onPorscheWheelColorChange={setPorscheWheelColor}
                  porscheCaliperColor={porscheCaliperColor}
                  onPorscheCaliperColorChange={setPorscheCaliperColor}
                  porscheBodyColor={porscheBodyColor}
                  onPorscheBodyColorChange={setPorscheBodyColor}
                  porscheHoodMode={porscheHoodMode}
                  onPorscheHoodModeChange={setPorscheHoodMode}
                  porscheHoodColor={porscheHoodColor}
                  onPorscheHoodColorChange={setPorscheHoodColor}
                  porscheWindowTint={porscheWindowTint}
                  onPorscheWindowTintChange={setPorscheWindowTint}
                  porscheDashboardColor={porscheDashboardColor}
                  onPorscheDashboardColorChange={setPorscheDashboardColor}
                  porscheDashboardAlcantaraColor={porscheDashboardAlcantaraColor}
                  onPorscheDashboardAlcantaraColorChange={setPorscheDashboardAlcantaraColor}
                  porscheSeatAlcantaraColor={porscheSeatAlcantaraColor}
                  onPorscheSeatAlcantaraColorChange={setPorscheSeatAlcantaraColor}
                  porscheSeatLeatherColor={porscheSeatLeatherColor}
                  onPorscheSeatLeatherColorChange={setPorscheSeatLeatherColor}
                  porscheSeatCarbonColor={porscheSeatCarbonColor}
                  onPorscheSeatCarbonColorChange={setPorscheSeatCarbonColor}
                  porscheDoorLeatherColor={porscheDoorLeatherColor}
                  onPorscheDoorLeatherColorChange={setPorscheDoorLeatherColor}
                  porscheDoorUpperAlcantaraColor={porscheDoorUpperAlcantaraColor}
                  onPorscheDoorUpperAlcantaraColorChange={setPorscheDoorUpperAlcantaraColor}
                  porscheDoorLowerAlcantaraColor={porscheDoorLowerAlcantaraColor}
                  onPorscheDoorLowerAlcantaraColorChange={setPorscheDoorLowerAlcantaraColor}
                  porscheDoorCarbonTrimColor={porscheDoorCarbonTrimColor}
                  onPorscheDoorCarbonTrimColorChange={setPorscheDoorCarbonTrimColor}
                  porscheDoorMetalTrimColor={porscheDoorMetalTrimColor}
                  onPorscheDoorMetalTrimColorChange={setPorscheDoorMetalTrimColor}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </main>

      {/* Review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="studio-surface">
          <DialogHeader>
            <DialogTitle>{t.garage.review}</DialogTitle>
            <DialogDescription>{vehicle.name}</DialogDescription>
          </DialogHeader>
          {changeSummary.length === 0 ? (
            <div className="rounded-lg border border-white/10 p-6 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-primary/80" />
              <h3 className="mt-3 text-sm font-semibold">{t.garage.noChangesTitle}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t.garage.noChangesBody}</p>
            </div>
          ) : (
            <ul className="rounded-lg border border-white/10 divide-y divide-white/10">
              {changeSummary.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="text-foreground/80">{row.label}</span>
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="h-4 w-4 rounded-full border border-white/20"
                      style={{ background: row.value.startsWith("#") ? row.value : undefined }}
                      aria-hidden="true"
                    />
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/15"
              onClick={() => setReviewOpen(false)}
            >
              {t.garage.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="studio-surface">
          <DialogHeader>
            <DialogTitle>{t.garage.resetTitle}</DialogTitle>
            <DialogDescription>{t.garage.resetBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/15"
              onClick={() => setResetOpen(false)}
            >
              {t.garage.cancel}
            </Button>
            <Button
              className="btn-red-glow"
              onClick={() => {
                restoreCurrentVehicle();
                setResetOpen(false);
              }}
            >
              {t.garage.resetPrimary}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Rendered until the 3D runtime hydrates client-side (GarageCanvas needs a
// real WebGL context and never runs during SSR).
function ViewerFallback({ vehicleName, note }: { vehicleName: string; note: string }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{
        background:
          "radial-gradient(ellipse at 50% 55%, oklch(0.58 0.22 25 / 0.15), transparent 60%), linear-gradient(180deg, oklch(0.17 0.005 260) 0%, oklch(0.11 0.005 260) 100%)",
      }}
      role="img"
      aria-label={vehicleName}
    >
      <div className="text-center px-6">
        <p className="eyebrow">{vehicleName}</p>
        <p className="mt-3 text-sm text-muted-foreground max-w-sm">{note}</p>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  icon,
  disabled,
  title,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-11 w-11 text-foreground/85 hover:bg-white/5 disabled:opacity-35 disabled:cursor-not-allowed"
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}

function CameraBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-9 gap-1.5 rounded-full px-3 text-foreground/85 hover:bg-white/10"
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </Button>
  );
}

function ColorSwatchRow({
  label,
  options,
  value,
  onChange,
  localeIsHe,
}: {
  label: string;
  options: PorscheColorOption[];
  value: PorscheColorChoice;
  onChange: (value: PorscheColorChoice) => void;
  localeIsHe: boolean;
}) {
  // Mirrors GarageCanvas.tsx's own PorscheColorRow custom-color pattern
  // (shared normalizeHexColor/HEX_COLOR_PATTERN from colorPalettes.ts) so
  // both the Studio and the internal debug panel validate/apply hex input
  // identically — just styled to match the Studio design system here.
  const [hexDraft, setHexDraft] = useState(value ?? "");

  useEffect(() => {
    setHexDraft(value ?? "");
  }, [value]);

  function handleHexInput(next: string) {
    setHexDraft(next);
    const normalized = normalizeHexColor(next);
    if (HEX_COLOR_PATTERN.test(normalized)) {
      onChange(normalized);
      setHexDraft(normalized);
    }
  }

  const isHexValid = hexDraft === "" || HEX_COLOR_PATTERN.test(normalizeHexColor(hexDraft));
  const pickerValue = value && HEX_COLOR_PATTERN.test(value) ? value : "#808080";
  const isCustomActive = value !== null && !options.some((opt) => opt.value === value);
  const customLabel = localeIsHe ? "צבע מותאם אישית" : "Custom Color";

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              title={opt.label}
              className={`h-9 w-9 rounded-full border-2 transition-all shrink-0 ${
                active
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-white/20 hover:border-white/40"
              }`}
              style={{
                background:
                  opt.value ?? "repeating-conic-gradient(#5a5a5a 0deg 90deg, #2a2a2a 90deg 180deg)",
              }}
            />
          );
        })}

        <label
          className={`relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 transition-all grid place-items-center ${
            isCustomActive
              ? "border-primary ring-2 ring-primary/40"
              : "border-white/20 hover:border-white/40"
          }`}
          style={isCustomActive && value ? { background: value } : undefined}
          title={customLabel}
        >
          {!isCustomActive && <Pipette className="h-4 w-4 text-foreground/70" aria-hidden="true" />}
          <input
            type="color"
            value={pickerValue}
            onChange={(event) => {
              const next = event.target.value.toUpperCase();
              setHexDraft(next);
              onChange(next);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} — ${customLabel}`}
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground shrink-0">HEX</span>
        <input
          type="text"
          value={hexDraft ?? ""}
          placeholder="#RRGGBB"
          maxLength={7}
          onChange={(event) => handleHexInput(event.target.value)}
          className={`h-8 w-28 rounded-md border bg-background/60 px-2 font-mono text-xs tracking-wide text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
            isHexValid ? "border-white/15" : "border-destructive"
          }`}
          aria-label={`${label} — HEX`}
        />
        {value && HEX_COLOR_PATTERN.test(value) && (
          <span
            className="flex h-6 shrink-0 items-center rounded-full border border-white/20 px-2 font-mono text-[10px]"
            style={{ background: value, color: getReadableTextColor(value) }}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

function TintSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="text-xs text-foreground/70">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
        aria-label={label}
      />
    </div>
  );
}

interface CustomizationPanelProps {
  tab: "exterior" | "interior";
  setTab: (v: "exterior" | "interior") => void;
  selected: string | null;
  setSelected: (v: string | null) => void;
  vehicleSupported: string[];
  categories: ReadonlyArray<{ id: string; he: string; en: string }>;
  localeIsHe: boolean;
  t: ReturnType<typeof useI18n>["t"];
  ChevronIcon: typeof ChevronRight;
  vehicleId: VehicleId;
  bmwWheelColor: PorscheColorChoice;
  onBmwWheelColorChange: (v: PorscheColorChoice) => void;
  bmwBodyColor: PorscheColorChoice;
  onBmwBodyColorChange: (v: PorscheColorChoice) => void;
  bmwSeatColor: PorscheColorChoice;
  onBmwSeatColorChange: (v: PorscheColorChoice) => void;
  bmwCaliperColor: PorscheColorChoice;
  onBmwCaliperColorChange: (v: PorscheColorChoice) => void;
  bmwWindowTint: number;
  onBmwWindowTintChange: (v: number) => void;
  bydBodyColor: PorscheColorChoice;
  onBydBodyColorChange: (v: PorscheColorChoice) => void;
  bydRimColor: PorscheColorChoice;
  onBydRimColorChange: (v: PorscheColorChoice) => void;
  bydWindowTint: number;
  onBydWindowTintChange: (v: number) => void;
  porscheWheelColor: PorscheColorChoice;
  onPorscheWheelColorChange: (v: PorscheColorChoice) => void;
  porscheCaliperColor: PorscheColorChoice;
  onPorscheCaliperColorChange: (v: PorscheColorChoice) => void;
  porscheBodyColor: PorscheColorChoice;
  onPorscheBodyColorChange: (v: PorscheColorChoice) => void;
  porscheHoodMode: PorscheHoodMode;
  onPorscheHoodModeChange: (v: PorscheHoodMode) => void;
  porscheHoodColor: PorscheColorChoice;
  onPorscheHoodColorChange: (v: PorscheColorChoice) => void;
  porscheWindowTint: number;
  onPorscheWindowTintChange: (v: number) => void;
  porscheDashboardColor: PorscheColorChoice;
  onPorscheDashboardColorChange: (v: PorscheColorChoice) => void;
  porscheDashboardAlcantaraColor: PorscheColorChoice;
  onPorscheDashboardAlcantaraColorChange: (v: PorscheColorChoice) => void;
  porscheSeatAlcantaraColor: PorscheColorChoice;
  onPorscheSeatAlcantaraColorChange: (v: PorscheColorChoice) => void;
  porscheSeatLeatherColor: PorscheColorChoice;
  onPorscheSeatLeatherColorChange: (v: PorscheColorChoice) => void;
  porscheSeatCarbonColor: PorscheColorChoice;
  onPorscheSeatCarbonColorChange: (v: PorscheColorChoice) => void;
  porscheDoorLeatherColor: PorscheColorChoice;
  onPorscheDoorLeatherColorChange: (v: PorscheColorChoice) => void;
  porscheDoorUpperAlcantaraColor: PorscheColorChoice;
  onPorscheDoorUpperAlcantaraColorChange: (v: PorscheColorChoice) => void;
  porscheDoorLowerAlcantaraColor: PorscheColorChoice;
  onPorscheDoorLowerAlcantaraColorChange: (v: PorscheColorChoice) => void;
  porscheDoorCarbonTrimColor: PorscheColorChoice;
  onPorscheDoorCarbonTrimColorChange: (v: PorscheColorChoice) => void;
  porscheDoorMetalTrimColor: PorscheColorChoice;
  onPorscheDoorMetalTrimColorChange: (v: PorscheColorChoice) => void;
}

function CustomizationPanel({
  tab,
  setTab,
  selected,
  setSelected,
  vehicleSupported,
  categories,
  localeIsHe,
  t,
  ChevronIcon,
  vehicleId,
  bmwWheelColor,
  onBmwWheelColorChange,
  bmwBodyColor,
  onBmwBodyColorChange,
  bmwSeatColor,
  onBmwSeatColorChange,
  bmwCaliperColor,
  onBmwCaliperColorChange,
  bmwWindowTint,
  onBmwWindowTintChange,
  bydBodyColor,
  onBydBodyColorChange,
  bydRimColor,
  onBydRimColorChange,
  bydWindowTint,
  onBydWindowTintChange,
  porscheWheelColor,
  onPorscheWheelColorChange,
  porscheCaliperColor,
  onPorscheCaliperColorChange,
  porscheBodyColor,
  onPorscheBodyColorChange,
  porscheHoodMode,
  onPorscheHoodModeChange,
  porscheHoodColor,
  onPorscheHoodColorChange,
  porscheWindowTint,
  onPorscheWindowTintChange,
  porscheDashboardColor,
  onPorscheDashboardColorChange,
  porscheDashboardAlcantaraColor,
  onPorscheDashboardAlcantaraColorChange,
  porscheSeatAlcantaraColor,
  onPorscheSeatAlcantaraColorChange,
  porscheSeatLeatherColor,
  onPorscheSeatLeatherColorChange,
  porscheSeatCarbonColor,
  onPorscheSeatCarbonColorChange,
  porscheDoorLeatherColor,
  onPorscheDoorLeatherColorChange,
  porscheDoorUpperAlcantaraColor,
  onPorscheDoorUpperAlcantaraColorChange,
  porscheDoorLowerAlcantaraColor,
  onPorscheDoorLowerAlcantaraColorChange,
  porscheDoorCarbonTrimColor,
  onPorscheDoorCarbonTrimColorChange,
  porscheDoorMetalTrimColor,
  onPorscheDoorMetalTrimColorChange,
}: CustomizationPanelProps) {
  function renderControls(categoryId: string) {
    const bodyLabel = localeIsHe ? "צבע מרכב" : "Body Color";
    const rimLabel = localeIsHe ? "צבע חישוקים" : "Rim Color";
    const seatLabel = localeIsHe ? "צבע מושבים" : "Seat Color";
    const caliperLabel = localeIsHe ? "צבע קליפרים" : "Brake Caliper Color";
    const tintLabel = localeIsHe ? "הכהיית חלונות" : "Window Tint";
    const hoodLabel = localeIsHe ? "צבע מכסה מנוע" : "Hood Color";

    if (vehicleId === "bmw-m3") {
      if (categoryId === "body-color") {
        return (
          <ColorSwatchRow
            localeIsHe={localeIsHe}
            label={bodyLabel}
            options={PORSCHE_BODY_COLORS}
            value={bmwBodyColor}
            onChange={onBmwBodyColorChange}
          />
        );
      }
      if (categoryId === "rim-color") {
        return (
          <ColorSwatchRow
            localeIsHe={localeIsHe}
            label={rimLabel}
            options={PORSCHE_WHEEL_COLORS}
            value={bmwWheelColor}
            onChange={onBmwWheelColorChange}
          />
        );
      }
      if (categoryId === "seats") {
        return (
          <ColorSwatchRow
            localeIsHe={localeIsHe}
            label={seatLabel}
            options={PORSCHE_WHEEL_COLORS}
            value={bmwSeatColor}
            onChange={onBmwSeatColorChange}
          />
        );
      }
      if (categoryId === "caliper-color") {
        return (
          <ColorSwatchRow
            localeIsHe={localeIsHe}
            label={caliperLabel}
            options={PORSCHE_CALIPER_COLORS}
            value={bmwCaliperColor}
            onChange={onBmwCaliperColorChange}
          />
        );
      }
      if (categoryId === "window-tint") {
        return (
          <TintSlider label={tintLabel} value={bmwWindowTint} onChange={onBmwWindowTintChange} />
        );
      }
    }

    if (vehicleId === "byd-seal") {
      if (categoryId === "body-color") {
        return (
          <ColorSwatchRow
            localeIsHe={localeIsHe}
            label={bodyLabel}
            options={PORSCHE_BODY_COLORS}
            value={bydBodyColor}
            onChange={onBydBodyColorChange}
          />
        );
      }
      if (categoryId === "rim-color") {
        return (
          <ColorSwatchRow
            localeIsHe={localeIsHe}
            label={rimLabel}
            options={PORSCHE_WHEEL_COLORS}
            value={bydRimColor}
            onChange={onBydRimColorChange}
          />
        );
      }
      if (categoryId === "window-tint") {
        return (
          <TintSlider label={tintLabel} value={bydWindowTint} onChange={onBydWindowTintChange} />
        );
      }
    }

    if (vehicleId === "porsche-manthey") {
      if (categoryId === "body-color") {
        return (
          <ColorSwatchRow
            localeIsHe={localeIsHe}
            label={bodyLabel}
            options={PORSCHE_BODY_COLORS}
            value={porscheBodyColor}
            onChange={onPorscheBodyColorChange}
          />
        );
      }
      if (categoryId === "rim-color") {
        return (
          <ColorSwatchRow
            localeIsHe={localeIsHe}
            label={rimLabel}
            options={PORSCHE_WHEEL_COLORS}
            value={porscheWheelColor}
            onChange={onPorscheWheelColorChange}
          />
        );
      }
      if (categoryId === "caliper-color") {
        return (
          <ColorSwatchRow
            localeIsHe={localeIsHe}
            label={caliperLabel}
            options={PORSCHE_CALIPER_COLORS}
            value={porscheCaliperColor}
            onChange={onPorscheCaliperColorChange}
          />
        );
      }
      if (categoryId === "hood-color") {
        return (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {hoodLabel}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onPorscheHoodModeChange("follow-body")}
                  aria-pressed={porscheHoodMode === "follow-body"}
                  className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium ${
                    porscheHoodMode === "follow-body"
                      ? "border-primary bg-primary/12 text-foreground"
                      : "border-white/15 text-foreground/75 hover:bg-white/5"
                  }`}
                >
                  {localeIsHe ? "לפי צבע המרכב" : "Follow Body"}
                </button>
                <button
                  type="button"
                  onClick={() => onPorscheHoodModeChange("separate")}
                  aria-pressed={porscheHoodMode === "separate"}
                  className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium ${
                    porscheHoodMode === "separate"
                      ? "border-primary bg-primary/12 text-foreground"
                      : "border-white/15 text-foreground/75 hover:bg-white/5"
                  }`}
                >
                  {localeIsHe ? "צבע נפרד" : "Separate"}
                </button>
              </div>
            </div>
            {porscheHoodMode === "separate" && (
              <ColorSwatchRow
                localeIsHe={localeIsHe}
                label={hoodLabel}
                options={PORSCHE_HOOD_COLORS}
                value={porscheHoodColor}
                onChange={onPorscheHoodColorChange}
              />
            )}
          </div>
        );
      }
      if (categoryId === "window-tint") {
        return (
          <TintSlider
            label={tintLabel}
            value={porscheWindowTint}
            onChange={onPorscheWindowTintChange}
          />
        );
      }
      if (categoryId === "dashboard") {
        return (
          <div className="space-y-3">
            <ColorSwatchRow
              localeIsHe={localeIsHe}
              label={localeIsHe ? "דשבורד" : "Dashboard"}
              options={PORSCHE_BODY_COLORS}
              value={porscheDashboardColor}
              onChange={onPorscheDashboardColorChange}
            />
            <ColorSwatchRow
              localeIsHe={localeIsHe}
              label={localeIsHe ? "דשבורד — אלקנטרה" : "Dashboard Alcantara"}
              options={PORSCHE_BODY_COLORS}
              value={porscheDashboardAlcantaraColor}
              onChange={onPorscheDashboardAlcantaraColorChange}
            />
          </div>
        );
      }
      if (categoryId === "seats") {
        return (
          <div className="space-y-3">
            <ColorSwatchRow
              localeIsHe={localeIsHe}
              label={localeIsHe ? "מושבים — אלקנטרה" : "Seat Alcantara"}
              options={PORSCHE_BODY_COLORS}
              value={porscheSeatAlcantaraColor}
              onChange={onPorscheSeatAlcantaraColorChange}
            />
            <ColorSwatchRow
              localeIsHe={localeIsHe}
              label={localeIsHe ? "מושבים — עור" : "Seat Leather"}
              options={PORSCHE_BODY_COLORS}
              value={porscheSeatLeatherColor}
              onChange={onPorscheSeatLeatherColorChange}
            />
            <ColorSwatchRow
              localeIsHe={localeIsHe}
              label={localeIsHe ? "מושבים — קרבון" : "Seat Carbon Shell"}
              options={PORSCHE_BODY_COLORS}
              value={porscheSeatCarbonColor}
              onChange={onPorscheSeatCarbonColorChange}
            />
          </div>
        );
      }
      if (categoryId === "door-trim") {
        return (
          <div className="space-y-3">
            <ColorSwatchRow
              localeIsHe={localeIsHe}
              label={localeIsHe ? "דלתות — עור" : "Door Leather"}
              options={PORSCHE_BODY_COLORS}
              value={porscheDoorLeatherColor}
              onChange={onPorscheDoorLeatherColorChange}
            />
            <ColorSwatchRow
              localeIsHe={localeIsHe}
              label={localeIsHe ? "דלתות — אלקנטרה עליון" : "Door Upper Alcantara"}
              options={PORSCHE_BODY_COLORS}
              value={porscheDoorUpperAlcantaraColor}
              onChange={onPorscheDoorUpperAlcantaraColorChange}
            />
            <ColorSwatchRow
              localeIsHe={localeIsHe}
              label={localeIsHe ? "דלתות — אלקנטרה תחתון" : "Door Lower Alcantara"}
              options={PORSCHE_BODY_COLORS}
              value={porscheDoorLowerAlcantaraColor}
              onChange={onPorscheDoorLowerAlcantaraColorChange}
            />
            <ColorSwatchRow
              localeIsHe={localeIsHe}
              label={localeIsHe ? "דלתות — גימור קרבון" : "Door Carbon Trim"}
              options={PORSCHE_BODY_COLORS}
              value={porscheDoorCarbonTrimColor}
              onChange={onPorscheDoorCarbonTrimColorChange}
            />
            <ColorSwatchRow
              localeIsHe={localeIsHe}
              label={localeIsHe ? "דלתות — גימור מתכת" : "Door Metal Trim"}
              options={PORSCHE_BODY_COLORS}
              value={porscheDoorMetalTrimColor}
              onChange={onPorscheDoorMetalTrimColorChange}
            />
          </div>
        );
      }
    }

    return null;
  }

  const controls = selected ? renderControls(selected) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/8 grid grid-cols-2 gap-1 bg-white/[0.02]">
        <TabBtn
          active={tab === "exterior"}
          onClick={() => {
            setTab("exterior");
            setSelected(null);
          }}
        >
          {t.garage.exterior}
        </TabBtn>
        <TabBtn
          active={tab === "interior"}
          onClick={() => {
            setTab("interior");
            setSelected(null);
          }}
        >
          {t.garage.interior}
        </TabBtn>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1" role="list">
          {categories.map((cat) => {
            const supported = vehicleSupported.includes(cat.id);
            const isSelected = selected === cat.id;
            const label = localeIsHe ? cat.he : cat.en;
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  disabled={!supported}
                  onClick={() => supported && setSelected(cat.id)}
                  aria-pressed={isSelected}
                  className={`w-full flex items-center gap-3 rounded-md px-3 py-3 min-h-12 text-sm text-start transition-colors ${
                    !supported
                      ? "opacity-55 cursor-not-allowed border border-dashed border-white/10"
                      : isSelected
                        ? "bg-primary/12 border border-primary/50 text-foreground"
                        : "border border-transparent hover:bg-white/5 text-foreground/90"
                  }`}
                >
                  <span className="flex-1">{label}</span>
                  {!supported ? (
                    <Badge
                      variant="outline"
                      className="border-white/15 text-[10px] gap-1 font-medium"
                    >
                      <Lock className="h-3 w-3" />
                      {t.garage.unsupported}
                    </Badge>
                  ) : (
                    <ChevronIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isSelected && supported && controls && (
                  <div className="mt-2 mb-1 px-1">{controls}</div>
                )}
              </li>
            );
          })}
        </ul>

        {selected && supportedButEmpty(vehicleSupported, selected, controls) && (
          <div className="mt-4 rounded-md border border-white/10 p-4 text-center bg-white/[0.02]">
            <p className="text-sm font-semibold text-foreground">{t.garage.noOptionsTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.garage.noOptionsBody}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function supportedButEmpty(
  vehicleSupported: string[],
  selected: string,
  controls: React.ReactNode,
) {
  return vehicleSupported.includes(selected) && !controls;
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-md text-sm font-semibold uppercase tracking-wider transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-foreground/75 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}
