import { SiteProvider } from "@/components/carforge/site-provider";
import { SiteHeader } from "@/components/carforge/site-header";
import { Hero } from "@/components/carforge/hero";
import { AboutSection } from "@/components/carforge/about-section";
import { CapabilityStrip } from "@/components/carforge/capability-strip";
import { VehiclePreview } from "@/components/carforge/vehicle-preview";
import { ClosingCta } from "@/components/carforge/closing-cta";
import { SiteFooter } from "@/components/carforge/site-footer";

export function LandingPage() {
  return (
    <SiteProvider>
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main>
          <Hero />
          <AboutSection />
          <CapabilityStrip />
          <VehiclePreview />
          <ClosingCta />
        </main>
        <SiteFooter />
      </div>
    </SiteProvider>
  );
}

export function VehicleGlyph({ personality }: { personality: "sport" | "electric" | "track" }) {
  const map = {
    sport: "linear-gradient(115deg, oklch(0.30 0.02 260) 0%, oklch(0.16 0.005 260) 60%)",
    electric: "linear-gradient(115deg, oklch(0.32 0.04 200) 0%, oklch(0.14 0.008 220) 60%)",
    track: "linear-gradient(115deg, oklch(0.32 0.08 30) 0%, oklch(0.14 0.01 260) 60%)",
  };
  return (
    <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.03]" style={{ background: map[personality] }}>
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="absolute inset-4 rounded-lg border border-white/5" />
      <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(ellipse at 70% 60%, oklch(0.45 0.20 25 / 0.35), transparent 60%)" }} />
    </div>
  );
}
