import { useI18n, type Locale } from "@/lib/i18n";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const other: Locale = locale === "he" ? "en" : "he";
  const label = other === "he" ? "עברית" : "English";
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(other)}
      aria-label={`${t.lang.switchTo}: ${label}`}
      className="min-h-11 gap-2 text-foreground/85 hover:text-foreground hover:bg-white/5"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="text-xs font-semibold tracking-wider uppercase">{compact ? other.toUpperCase() : label}</span>
    </Button>
  );
}
