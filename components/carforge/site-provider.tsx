'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { CONTENT, type Lang, type SiteCopy } from '@/lib/content'

interface A11yState {
  fontScale: number
  highContrast: boolean
  grayscale: boolean
  reduceMotion: boolean
}

const DEFAULT_A11Y: A11yState = {
  fontScale: 1,
  highContrast: false,
  grayscale: false,
  reduceMotion: false,
}

interface SiteContextValue {
  lang: Lang
  dir: 'rtl' | 'ltr'
  t: SiteCopy
  toggleLang: () => void
  a11y: A11yState
  increaseFont: () => void
  decreaseFont: () => void
  toggleContrast: () => void
  toggleGrayscale: () => void
  toggleReduceMotion: () => void
  resetA11y: () => void
}

const SiteContext = createContext<SiteContextValue | null>(null)

const MIN_SCALE = 0.9
const MAX_SCALE = 1.4
const STEP = 0.1

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('he')
  const [a11y, setA11y] = useState<A11yState>(DEFAULT_A11Y)

  const dir = lang === 'he' ? 'rtl' : 'ltr'
  const t = CONTENT[lang]

  // Keep the document element in sync with language + direction.
  useEffect(() => {
    const el = document.documentElement
    el.lang = lang
    el.dir = dir
    el.classList.toggle('lang-he', lang === 'he')
    el.classList.toggle('lang-en', lang === 'en')
  }, [lang, dir])

  // Apply accessibility settings to the document element.
  useEffect(() => {
    const el = document.documentElement
    el.style.fontSize = `${a11y.fontScale * 100}%`
    el.classList.toggle('a11y-contrast', a11y.highContrast)
    el.classList.toggle('a11y-grayscale', a11y.grayscale)
    el.classList.toggle('a11y-reduce-motion', a11y.reduceMotion)
  }, [a11y])

  const toggleLang = useCallback(
    () => setLang((prev) => (prev === 'he' ? 'en' : 'he')),
    [],
  )

  const increaseFont = useCallback(
    () =>
      setA11y((s) => ({
        ...s,
        fontScale: Math.min(MAX_SCALE, +(s.fontScale + STEP).toFixed(2)),
      })),
    [],
  )
  const decreaseFont = useCallback(
    () =>
      setA11y((s) => ({
        ...s,
        fontScale: Math.max(MIN_SCALE, +(s.fontScale - STEP).toFixed(2)),
      })),
    [],
  )
  const toggleContrast = useCallback(
    () => setA11y((s) => ({ ...s, highContrast: !s.highContrast })),
    [],
  )
  const toggleGrayscale = useCallback(
    () => setA11y((s) => ({ ...s, grayscale: !s.grayscale })),
    [],
  )
  const toggleReduceMotion = useCallback(
    () => setA11y((s) => ({ ...s, reduceMotion: !s.reduceMotion })),
    [],
  )
  const resetA11y = useCallback(() => setA11y(DEFAULT_A11Y), [])

  const value = useMemo<SiteContextValue>(
    () => ({
      lang,
      dir,
      t,
      toggleLang,
      a11y,
      increaseFont,
      decreaseFont,
      toggleContrast,
      toggleGrayscale,
      toggleReduceMotion,
      resetA11y,
    }),
    [
      lang,
      dir,
      t,
      toggleLang,
      a11y,
      increaseFont,
      decreaseFont,
      toggleContrast,
      toggleGrayscale,
      toggleReduceMotion,
      resetA11y,
    ],
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite() {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite must be used within SiteProvider')
  return ctx
}
