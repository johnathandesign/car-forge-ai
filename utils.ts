'use client'

import { useEffect, useState } from 'react'
import { Menu, X, Languages, ArrowRight, ArrowLeft } from 'lucide-react'
import { useSite } from './site-provider'
import { BrandLogo } from './brand-logo'
import { AccessibilityMenu } from './accessibility-menu'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { key: 'home', href: '#top', active: true },
  { key: 'showroom', href: '#showroom', active: false },
  { key: 'garage', href: '#garage', active: false },
] as const

export function SiteHeader() {
  const { t, dir, toggleLang } = useSite()
  const [mobileOpen, setMobileOpen] = useState(false)
  const DirArrow = dir === 'rtl' ? ArrowLeft : ArrowRight

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#top" className="flex shrink-0 items-center" aria-label={t.footer.rights}>
          <BrandLogo className="h-9" priority />
        </a>

        {/* Desktop nav */}
        <nav
          aria-label={t.nav.home}
          className="hidden items-center gap-1 lg:flex"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                item.active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="relative">
                {t.nav[item.key]}
                {item.active && (
                  <span className="absolute -bottom-1 inset-x-0 h-0.5 rounded-full bg-brand" />
                )}
              </span>
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={toggleLang}
            className="flex h-11 items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 text-sm font-medium transition-colors hover:border-brand/60 hover:text-brand"
            aria-label={t.langSwitchTo}
          >
            <Languages className="h-4 w-4" aria-hidden="true" />
            {t.langSwitchTo}
          </button>
          <AccessibilityMenu />
          <a
            href="#garage"
            className="flex h-11 items-center gap-2 rounded-md bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-[0_0_20px_-6px_var(--brand)] transition-transform hover:-translate-y-0.5"
          >
            {t.launchStudio}
            <DirArrow className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 lg:hidden">
          <AccessibilityMenu />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={t.menu}
            aria-expanded={mobileOpen}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary/40 text-foreground"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/70 bg-background lg:hidden">
          <nav
            aria-label={t.nav.home}
            className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex min-h-11 items-center rounded-md px-3 text-base font-medium transition-colors',
                  item.active
                    ? 'bg-brand/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.nav[item.key]}
              </a>
            ))}

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLang}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 text-sm font-medium"
                aria-label={t.langSwitchTo}
              >
                <Languages className="h-4 w-4" aria-hidden="true" />
                {t.langSwitchTo}
              </button>
            </div>

            <a
              href="#garage"
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-md bg-brand px-5 text-base font-semibold text-brand-foreground"
            >
              {t.launchStudio}
              <DirArrow className="h-4 w-4" aria-hidden="true" />
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
