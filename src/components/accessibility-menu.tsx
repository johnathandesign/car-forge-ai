import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useA11y } from "@/lib/a11y";
import { useI18n } from "@/lib/i18n";
import { Accessibility, Minus, Plus, RotateCcw, Check } from "lucide-react";

export function AccessibilityMenu() {
  const { t } = useI18n();
  const a = useA11y();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t.a11y.trigger}
          className="min-h-11 min-w-11 gap-2 text-foreground/85 hover:text-foreground hover:bg-white/5"
        >
          <Accessibility className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">{t.a11y.trigger}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 studio-surface p-0" sideOffset={8}>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground">{t.a11y.trigger}</h3>
        </div>
        <Separator />
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-foreground/90">{t.a11y.decrease} / {t.a11y.increase}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={a.decrease} aria-label={t.a11y.decrease}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">{a.scale}%</span>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={a.increase} aria-label={t.a11y.increase}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <A11yToggle
            label={t.a11y.highContrast}
            active={a.highContrast}
            onClick={a.toggleHighContrast}
            onLabel={t.a11y.on}
            offLabel={t.a11y.off}
          />
          <A11yToggle
            label={t.a11y.grayscale}
            active={a.grayscale}
            onClick={a.toggleGrayscale}
            onLabel={t.a11y.on}
            offLabel={t.a11y.off}
          />
        </div>
        <Separator />
        <div className="p-3">
          <Button variant="ghost" className="w-full justify-start gap-2 text-sm" onClick={a.reset}>
            <RotateCcw className="h-4 w-4" />
            {t.a11y.reset}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function A11yToggle({
  label, active, onClick, onLabel, offLabel,
}: { label: string; active: boolean; onClick: () => void; onLabel: string; offLabel: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors min-h-11 ${
        active
          ? "border-primary/60 bg-primary/10 text-foreground"
          : "border-border bg-transparent text-foreground/90 hover:bg-white/5"
      }`}
    >
      <span>{label}</span>
      <span className="flex items-center gap-1.5 text-xs">
        {active && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
        <span className={active ? "text-primary" : "text-muted-foreground"}>{active ? onLabel : offLabel}</span>
      </span>
    </button>
  );
}
