'use client'

import Image from 'next/image'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { useSite } from './site-provider'
import { cn } from '@/lib/utils'

const IMAGES: Record<string, string> = {
  'bmw-m3': '/vehicles/bmw-m3.png',
  'byd-seal': '/vehicles/byd-seal.png',
  'porsche-gt3rs': '/vehicles/porsche-gt3rs.png',
}

export function VehiclePreview() {
  const { t, dir } = useSite()
  const DirArrow = dir === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <section
      id="showroom"
      aria-labelledby="showroom-heading"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
    >
      <div className="mb-8 max-w-2xl">
        <h2 id="showroom-heading" className="text-2xl font-bold sm:text-3xl">
          {t.preview.title}
        </h2>
        <p className="mt-2 text-muted-foreground">{t.preview.subtitle}</p>
      </div>

      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {t.vehicles.map((v) => {
          const available = v.availability === 'available'
          return (
            <li key={v.id}>
              <a
                href="#garage"
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card outline-none transition-all duration-200 hover:scale-[1.015] hover:border-brand/70 hover:shadow-[0_0_30px_-10px_var(--brand)] focus-visible:scale-[1.015] focus-visible:border-brand/70 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-secondary/40">
                  <Image
                    src={IMAGES[v.id] ?? '/vehicles/bmw-m3.png'}
                    alt={v.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                  <span
                    className={cn(
                      'absolute top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-sm',
                      dir === 'rtl' ? 'right-3' : 'left-3',
                      available
                        ? 'border-brand/50 bg-brand/15 text-foreground'
                        : 'border-border bg-background/70 text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        available ? 'bg-brand' : 'bg-muted-foreground',
                      )}
                      aria-hidden="true"
                    />
                    {available ? t.preview.availableLabel : t.preview.soonLabel}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-semibold">{v.name}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {v.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                    {t.preview.cardCta}
                    <DirArrow
                      className="h-4 w-4 transition-transform group-hover:translate-x-0 rtl:group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
