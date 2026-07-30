import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { VEHICLES } from "@/lib/vehicles";
import { VehicleGlyph } from "@/components/landing-page";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

const VEHICLE_IMAGES: Record<string, string> = {
  "byd-seal": "/vehicles/byd-seal.png",
  "bmw-m3": "/vehicles/bmw-m3.png",
  "porsche-manthey": "/vehicles/porsche-gt3rs.png",
};

export const Route = createFileRoute("/showroom")({
  head: () => ({
    meta: [
      { title: "Showroom — CarForge AI" },
      { name: "description", content: "Choose the vehicle you want to customize. Three vehicles: BMW M3, BYD Seal, and Porsche Manthey 911 GT3 RS." },
      { property: "og:title", content: "Showroom — CarForge AI" },
      { property: "og:description", content: "Choose the vehicle you want to customize and open it in the Garage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Showroom — CarForge AI" },
      { name: "twitter:description", content: "Three vehicles ready for customization." },
    ],
  }),
  component: ShowroomPage,
});

function ShowroomPage() {
  const { t, locale, dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1">
        <section className="border-b border-white/8 bg-[oklch(0.13_0.005_260)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 lg:py-16">
            <p className="eyebrow">{t.nav.showroom}</p>
            <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-semibold">{t.showroom.title}</h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground leading-relaxed">{t.showroom.subtitle}</p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:py-14">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {VEHICLES.map((v) => {
              const subtitle = locale === "he" ? v.subtitleHe : v.subtitleEn;
              const desc = locale === "he" ? v.descriptionHe : v.descriptionEn;
              return (
                <article
                  key={v.id}
                  className="group studio-surface rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:border-primary/60 hover:shadow-[0_12px_50px_oklch(0.58_0.22_25/0.28)] focus-within:border-primary"
                >
                  <div className="aspect-[16/10] relative overflow-hidden bg-secondary/40">
                    {VEHICLE_IMAGES[v.id] ? (
                      <img
                        src={VEHICLE_IMAGES[v.id]}
                        alt={v.name}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <VehicleGlyph personality={v.personality} />
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{subtitle}</p>
                      <h2 className="mt-1 text-xl font-semibold">{v.name}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed min-h-[3rem]">{desc}</p>
                    <div className="flex items-center gap-2 text-[11px] text-foreground/70">
                      <Check className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {v.supportedCategories.length} {locale === "he" ? "אפשרויות התאמה" : "customization categories"}
                      </span>
                    </div>
                    <div className="pt-2 mt-auto">
                      <Link to="/garage/$vehicleId" params={{ vehicleId: v.id }}>
                        <Button className="btn-red-glow w-full uppercase tracking-wider text-xs font-semibold min-h-11 gap-2">
                          {t.cta.openInGarage}
                          <Arrow className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mt-8 text-xs text-muted-foreground max-w-3xl">{t.showroom.note}</p>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}