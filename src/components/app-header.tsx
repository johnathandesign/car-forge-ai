import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { BrandAsset } from "@/components/brand-asset";
import { LanguageToggle } from "@/components/language-toggle";
import { AccessibilityMenu } from "@/components/accessibility-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function AppHeader() {
  const { t, dir } = useI18n();
  const state = useRouterState();
  const pathname = state.location.pathname;
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: t.nav.home },
    { to: "/showroom", label: t.nav.showroom },
    { to: "/garage/bmw-m3", label: t.nav.garage, matchPrefix: "/garage" },
  ];

  const isActive = (to: string, prefix?: string) =>
    prefix ? pathname.startsWith(prefix) : pathname === to;

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="CarForge AI">
          <BrandAsset className="h-11 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1 ms-4" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-11 flex items-center ${
                isActive(l.to, l.matchPrefix)
                  ? "text-foreground bg-white/5"
                  : "text-foreground/70 hover:text-foreground hover:bg-white/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1">
          <div className="hidden md:flex items-center gap-1">
            <LanguageToggle />
            <AccessibilityMenu />
          </div>
          <Link to="/showroom" className="hidden sm:inline-flex">
            <Button variant="default" size="sm" className="btn-red-glow uppercase tracking-wider text-xs font-semibold min-h-11 px-4">
              {t.cta.launchStudio}
            </Button>
          </Link>

          {/* Mobile menu */}
          <div className="lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={dir === "rtl" ? "right" : "left"} className="bg-background border-white/10 w-[85vw] sm:w-96 flex flex-col gap-4">
                <SheetTitle className="text-base">
                  <BrandAsset className="h-8 w-auto" />
                </SheetTitle>
                <nav className="flex flex-col gap-1 mt-2" aria-label="Mobile">
                  {links.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className={`px-3 py-3 rounded-md text-base font-medium min-h-11 ${
                        isActive(l.to, l.matchPrefix) ? "text-foreground bg-white/5" : "text-foreground/80"
                      }`}
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <LanguageToggle />
                    <AccessibilityMenu />
                  </div>
                  <Link to="/showroom" onClick={() => setOpen(false)}>
                    <Button className="btn-red-glow w-full uppercase tracking-wider text-xs font-semibold min-h-11">
                      {t.cta.launchStudio}
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
