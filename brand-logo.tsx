'use client'

import { SiteProvider } from '@/components/carforge/site-provider'
import { SiteHeader } from '@/components/carforge/site-header'
import { Hero } from '@/components/carforge/hero'
import { AboutSection } from '@/components/carforge/about-section'
import { CapabilityStrip } from '@/components/carforge/capability-strip'
import { VehiclePreview } from '@/components/carforge/vehicle-preview'
import { ClosingCta } from '@/components/carforge/closing-cta'
import { SiteFooter } from '@/components/carforge/site-footer'

export default function Page() {
  return (
    <SiteProvider>
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main>
          <Hero />
          <AboutSection />
          <CapabilityStrip />
          <VehiclePreview />
          <ClosingCta />
        </main>
        <SiteFooter />
      </div>
    </SiteProvider>
  )
}
