'use client'

import { Check } from 'lucide-react'
import { useSite } from './site-provider'

export function AboutSection() {
  const { t } = useSite()

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="relative scroll-mt-20 border-t border-border/60"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_0%,oklch(0.5_0.19_25/0.08)_0%,transparent_60%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* Intro */}
          <div>
            <h2
              id="about-heading"
              className="text-balance text-2xl font-bold sm:text-3xl lg:text-4xl"
            >
              {t.about.title}
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t.about.intro}
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {t.about.benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-3 rounded-lg border border-border/70 bg-card/50 p-3.5"
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand"
                    aria-hidden="true"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* How it works */}
          <div className="flex flex-col justify-center rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
            <h3 className="text-lg font-semibold sm:text-xl">
              {t.about.flowTitle}
            </h3>
            <ol className="mt-6 flex flex-col gap-5">
              {t.about.flow.map((step, i) => (
                <li key={step} className="flex items-center gap-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand/50 bg-brand/10 text-base font-bold text-brand"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="text-base font-medium text-foreground">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
