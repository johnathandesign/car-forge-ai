import { Link } from "@tanstack/react-router";
import { BrandAsset } from "@/components/brand-asset";
import { useI18n } from "@/lib/i18n";

export function AppFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-white/8 bg-background/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <BrandAsset className="h-10 w-auto opacity-90" />
        </div>
        <nav className="flex flex-col gap-2 text-sm" aria-label="Footer">
          <Link to="/" className="text-foreground/70 hover:text-foreground">{t.nav.home}</Link>
          <Link to="/showroom" className="text-foreground/70 hover:text-foreground">{t.nav.showroom}</Link>
          <Link to="/garage/bmw-m3" className="text-foreground/70 hover:text-foreground">{t.nav.garage}</Link>
        </nav>
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>{t.footer.student}</p>
          <p>{t.footer.noAffiliation}</p>
          <p className="pt-2 text-foreground/70">{t.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
