import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useSite } from "./site-provider";

export function ClosingCta() {
  const { t, dir } = useSite();
  const DirArrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <section
      id="garage"
      aria-labelledby="closing-heading"
      className="scroll-mt-20 border-t border-border/70 bg-card/40"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 lg:py-20">
        <h2 id="closing-heading" className="text-balance text-2xl font-bold sm:text-3xl">
          {t.closing.headline}
        </h2>
        <p className="mt-3 max-w-xl text-pretty text-muted-foreground">{t.closing.body}</p>
        <Link
          to="/showroom"
          className="mt-7 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-7 text-base font-semibold text-brand-foreground shadow-[0_0_28px_-8px_var(--brand)] transition-transform hover:-translate-y-0.5"
        >
          {t.closing.cta}
          <DirArrow className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
