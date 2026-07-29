import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import {
  VEHICLES, getVehicle, EXTERIOR_CATEGORIES, INTERIOR_CATEGORIES,
} from "@/lib/vehicles";
import type { VehicleId } from "@/lib/vehicles";
import {
  ArrowLeft, ArrowRight, Undo2, Redo2, RotateCcw, RefreshCw, GitCompareArrows,
  ClipboardList, ChevronRight, ChevronLeft, Lock, AlertCircle, Sliders,
} from "lucide-react";

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
            <Button variant="ghost" size="sm" className="min-h-11 gap-2 text-foreground/85 hover:bg-white/5">
              <Back className="h-4 w-4" />
              <span className="hidden sm:inline">{t.garage.back}</span>
            </Button>
          </Link>

          <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

          <div className="min-w-[180px]">
            <Select
              value={vehicle.id}
              onValueChange={(v) => navigate({ to: "/garage/$vehicleId", params: { vehicleId: v as VehicleId } })}
            >
              <SelectTrigger className="h-11 bg-transparent border-white/15">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ms-auto flex items-center gap-1 flex-wrap">
            <IconBtn label={t.garage.undo} icon={<Undo2 className="h-4 w-4" />} />
            <IconBtn label={t.garage.redo} icon={<Redo2 className="h-4 w-4" />} />
            <IconBtn label={t.garage.returnOriginal} icon={<RotateCcw className="h-4 w-4" />} />
            <IconBtn label={t.garage.compare} icon={<GitCompareArrows className="h-4 w-4" />} />
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 gap-2 border-white/15 bg-transparent hover:bg-white/5"
              onClick={() => setResetOpen(true)}
              aria-label={t.garage.reset}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden md:inline text-xs uppercase tracking-wider font-semibold">{t.garage.reset}</span>
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
        <section aria-label={vehicle.name} className="studio-surface rounded-xl overflow-hidden relative min-h-[420px] lg:min-h-[620px]">
          <VehicleViewerContainer vehicleName={vehicle.name} />
        </section>

        {/* Desktop panel */}
        <aside className="hidden lg:flex studio-surface rounded-xl flex-col overflow-hidden">
          <CustomizationPanel
            tab={tab}
            setTab={setTab}
            selected={selected}
            setSelected={setSelected}
            vehicleSupported={vehicle.supportedCategories}
            categories={currentCategories}
            localeIsHe={locale === "he"}
            t={t}
            ChevronIcon={Chevron}
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
            <SheetContent side="bottom" className="bg-background border-white/10 max-h-[85vh] flex flex-col">
              <SheetTitle className="text-base">{vehicle.name}</SheetTitle>
              <div className="mt-2 flex-1 overflow-hidden">
                <CustomizationPanel
                  tab={tab}
                  setTab={setTab}
                  selected={selected}
                  setSelected={setSelected}
                  vehicleSupported={vehicle.supportedCategories}
                  categories={currentCategories}
                  localeIsHe={locale === "he"}
                  t={t}
                  ChevronIcon={Chevron}
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
          <div className="rounded-lg border border-white/10 p-6 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-primary/80" />
            <h3 className="mt-3 text-sm font-semibold">{t.garage.noChangesTitle}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t.garage.noChangesBody}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/15" onClick={() => setReviewOpen(false)}>
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
            <Button variant="outline" className="border-white/15" onClick={() => setResetOpen(false)}>
              {t.garage.cancel}
            </Button>
            <Button className="btn-red-glow" onClick={() => setResetOpen(false)}>
              {t.garage.resetPrimary}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconBtn({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-11 w-11 text-foreground/85 hover:bg-white/5"
      aria-label={label}
      title={label}
    >
      {icon}
    </Button>
  );
}

// VehicleViewerContainer — presentation-only shell. Does NOT create a Canvas or Three.js.
function VehicleViewerContainer({ vehicleName }: { vehicleName: string }) {
  const { t } = useI18n();
  return (
    <div
      data-viewer-mount
      data-vehicle-name={vehicleName}
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
        <p className="mt-3 text-sm text-muted-foreground max-w-sm">{t.garage.placeholderNote}</p>
      </div>
      {/* subtle floor reflection line */}
      <div className="absolute bottom-8 inset-x-16 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" aria-hidden="true" />
    </div>
  );
}

function CustomizationPanel({
  tab, setTab, selected, setSelected, vehicleSupported, categories, localeIsHe, t, ChevronIcon,
}: {
  tab: "exterior" | "interior";
  setTab: (v: "exterior" | "interior") => void;
  selected: string | null;
  setSelected: (v: string | null) => void;
  vehicleSupported: string[];
  categories: ReadonlyArray<{ id: string; he: string; en: string }>;
  localeIsHe: boolean;
  t: ReturnType<typeof useI18n>["t"];
  ChevronIcon: typeof ChevronRight;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/8 grid grid-cols-2 gap-1 bg-white/[0.02]">
        <TabBtn active={tab === "exterior"} onClick={() => { setTab("exterior"); setSelected(null); }}>{t.garage.exterior}</TabBtn>
        <TabBtn active={tab === "interior"} onClick={() => { setTab("interior"); setSelected(null); }}>{t.garage.interior}</TabBtn>
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
                    <Badge variant="outline" className="border-white/15 text-[10px] gap-1 font-medium">
                      <Lock className="h-3 w-3" />
                      {t.garage.unsupported}
                    </Badge>
                  ) : (
                    <ChevronIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {selected && (
          <div className="mt-4 rounded-md border border-white/10 p-4 text-center bg-white/[0.02]">
            <p className="text-sm font-semibold text-foreground">{t.garage.noOptionsTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.garage.noOptionsBody}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
