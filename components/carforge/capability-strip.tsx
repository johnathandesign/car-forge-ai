'use client'

import { Box, Paintbrush, Armchair, History } from 'lucide-react'
import { useSite } from './site-provider'

const ICONS = {
  view3d: Box,
  exterior: Paintbrush,
  interior: Armchair,
  history: History,
} as const

export function CapabilityStrip() {
  const { t } = useSite()

  return (
    <section aria-label={t.capabilitiesTitle} className="border-y border-border/70 bg-card/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          {t.capabilities.map((cap, i) => {
            const Icon = ICONS[cap.id as keyof typeof ICONS] ?? Box
            return (
              <li
                key={cap.id}
                className="flex items-start gap-3 py-6 sm:px-6 lg:border-e lg:border-border/60 lg:last:border-e-0 lg:[&:nth-child(1)]:ps-0"
                style={i === 0 ? { paddingInlineStart: 0 } : undefined}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/40 text-brand">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{cap.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {cap.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
