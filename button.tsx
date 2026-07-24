'use client'

import Image from 'next/image'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { useSite } from './site-provider'

export function Hero() {
  const { t, dir, lang } = useSite()
  const DirArrow = dir === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden"
    >
      {/* Atmosphere: deep black to graphite + restrained red lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_75%_35%,oklch(0.2_0.02_20)_0%,oklch(0.13_0.005_285)_45%,oklch(0.1_0.004_285)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_45%,oklch(0.5_0.19_25/0.16)_0%,transparent_70%)]"
      />
      {/* Soft vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_60px_oklch(0.06_0_0/0.9)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[560px] flex-col items-stretch gap-6 py-10 lg:min-h-[720px] lg:flex-row lg:items-center lg:gap-8 lg:py-16">
          {/* Content */}
          <div className="flex flex-col justify-center lg:w-[46%]">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">
              {t.hero.eyebrow}
            </p>
            <h1
              id="hero-heading"
              className={
                lang === 'he'
                  ? 'mt-4 text-balance font-bold leading-[1.1] text-[2.5rem] sm:text-5xl lg:text-6xl xl:text-[4rem]'
                  : 'mt-4 text-balance font-bold leading-[1.08] text-[1.75rem] sm:text-4xl md:text-[2.5rem] lg:text-[2.75rem]'
              }
            >
              {lang === 'he' ? (
                <>
                  {t.hero.headlineLine1}
                  <br />
                  {t.hero.headlineLine2}
                </>
              ) : (
                `${t.hero.headlineLine1} ${t.hero.headlineLine2}`
              )}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t.hero.body}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#garage"
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-base font-semibold text-brand-foreground shadow-[0_0_28px_-8px_var(--brand)] transition-transform hover:-translate-y-0.5"
              >
                {t.hero.primaryCta}
                <DirArrow className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#showroom"
                className="flex min-h-12 items-center justify-center rounded-lg border border-border bg-secondary/30 px-6 text-base font-medium text-foreground transition-colors hover:border-brand/60"
              >
                {t.hero.secondaryCta}
              </a>
            </div>
          </div>

          {/* Vehicle visual */}
          <div className="relative flex items-center justify-center lg:w-[54%]">
            {/* Ambient red glow anchored behind the car */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,oklch(0.5_0.19_25/0.22),transparent)] blur-2xl"
            />
            <div className="relative w-full">
              <Image
                src="/carforge-hero.png"
                alt={t.hero.imageAlt}
                width={1280}
                height={800}
                priority
                sizes="(max-width: 1024px) 100vw, 56vw"
                className="relative h-auto w-full object-contain mix-blend-screen"
                style={{
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 9%, #000 88%, transparent 100%)',
                  maskImage:
                    'linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 9%, #000 88%, transparent 100%)',
                  WebkitMaskComposite: 'source-in',
                  maskComposite: 'intersect',
                }}
              />
              {/* Subtle floor reflection */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-6 -bottom-2 h-16 rounded-[50%] bg-[radial-gradient(closest-side,oklch(0.5_0.19_25/0.16),transparent)] blur-md"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
