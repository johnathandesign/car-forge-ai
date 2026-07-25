'use client'

import { Languages } from 'lucide-react'
import { useSite } from './site-provider'
import { BrandLogo } from './brand-logo'

const NAV_ITEMS = [
  { key: 'home', href: '#top' },
  { key: 'showroom', href: '#showroom' },
  { key: 'garage', href: '#garage' },
] as const

export function SiteFooter() {
  const { t, toggleLang } = useSite()

  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-4">
            <a href="#top" className="flex items-center" aria-label={t.footer.rights}>
              <BrandLogo className="h-10" />
            </a>
          </div>

          <div className="flex flex-col gap-4">
            <nav aria-label={t.nav.home} className="flex flex-wrap gap-x-6 gap-y-2">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t.nav[item.key]}
                </a>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={toggleLang}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                aria-label={t.langSwitchTo}
              >
                <Languages className="h-4 w-4" aria-hidden="true" />
                {t.langSwitchTo}
              </button>
              <a
                href="#top"
                className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.a11y.link}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-1.5 border-t border-border/60 pt-6 text-xs leading-relaxed text-muted-foreground">
          <p>{t.footer.studentNotice}</p>
          <p>{t.footer.affiliationNotice}</p>
        </div>
      </div>
    </footer>
  )
}
