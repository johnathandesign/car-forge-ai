'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Accessibility,
  Contrast,
  Droplet,
  Minus,
  MoveHorizontal,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import { useSite } from './site-provider'
import { cn } from '@/lib/utils'

export function AccessibilityMenu() {
  const {
    t,
    dir,
    a11y,
    increaseFont,
    decreaseFont,
    toggleContrast,
    toggleGrayscale,
    toggleReduceMotion,
    resetA11y,
  } = useSite()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t.a11y.open}
        title={t.a11y.open}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary/40 text-foreground transition-colors hover:border-brand/60 hover:text-brand focus-visible:text-brand"
      >
        <Accessibility className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t.a11y.title}
          className={cn(
            'absolute top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border border-border bg-popover p-4 shadow-2xl shadow-black/60',
            dir === 'rtl' ? 'left-0' : 'right-0',
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t.a11y.title}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.a11y.close}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mb-4">
            <span className="mb-2 block text-xs text-muted-foreground">
              {t.a11y.textSize}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={decreaseFont}
                aria-label={t.a11y.decrease}
                className="flex h-10 flex-1 items-center justify-center rounded-md border border-border bg-secondary/40 transition-colors hover:border-brand/60"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span
                aria-live="polite"
                className="w-12 text-center text-sm tabular-nums"
              >
                {Math.round(a11y.fontScale * 100)}%
              </span>
              <button
                type="button"
                onClick={increaseFont}
                aria-label={t.a11y.increase}
                className="flex h-10 flex-1 items-center justify-center rounded-md border border-border bg-secondary/40 transition-colors hover:border-brand/60"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <ul className="flex flex-col gap-1.5">
            <li>
              <A11yToggle
                active={a11y.highContrast}
                onClick={toggleContrast}
                icon={<Contrast className="h-4 w-4" aria-hidden="true" />}
                label={t.a11y.highContrast}
              />
            </li>
            <li>
              <A11yToggle
                active={a11y.grayscale}
                onClick={toggleGrayscale}
                icon={<Droplet className="h-4 w-4" aria-hidden="true" />}
                label={t.a11y.grayscale}
              />
            </li>
            <li>
              <A11yToggle
                active={a11y.reduceMotion}
                onClick={toggleReduceMotion}
                icon={<MoveHorizontal className="h-4 w-4" aria-hidden="true" />}
                label={t.a11y.reduceMotion}
              />
            </li>
          </ul>

          <button
            type="button"
            onClick={resetA11y}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t.a11y.reset}
          </button>
        </div>
      )}
    </div>
  )
}

function A11yToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={active}
      className={cn(
        'flex h-11 w-full items-center gap-3 rounded-md border px-3 text-sm transition-colors',
        active
          ? 'border-brand/70 bg-brand/15 text-foreground'
          : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground',
      )}
    >
      <span className={cn(active ? 'text-brand' : '')}>{icon}</span>
      <span className="flex-1 text-start">{label}</span>
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full',
          active ? 'bg-brand' : 'bg-muted-foreground/40',
        )}
        aria-hidden="true"
      />
    </button>
  )
}
