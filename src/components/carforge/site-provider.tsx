import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CONTENT, type Lang, type SiteCopy } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { useA11y } from "@/lib/a11y";

interface A11yState {
  fontScale: number;
  highContrast: boolean;
  grayscale: boolean;
  reduceMotion: boolean;
}

interface SiteContextValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: SiteCopy;
  toggleLang: () => void;
  a11y: A11yState;
  increaseFont: () => void;
  decreaseFont: () => void;
  toggleContrast: () => void;
  toggleGrayscale: () => void;
  toggleReduceMotion: () => void;
  resetA11y: () => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

/**
 * Bridges the site homepage's `useSite()` API onto the project's existing
 * I18nProvider + A11yProvider so language and accessibility state stay in sync
 * with the rest of the app (Showroom, Garage). Reduce-motion is a homepage-only
 * addition (not present in the shared a11y provider).
 */
export function SiteProvider({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useI18n();
  const a = useA11y();

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("a11y-reduce-motion", reduceMotion);
  }, [reduceMotion]);

  // Mirror shared a11y flags to the html-scoped classes the homepage CSS uses.
  useEffect(() => {
    document.documentElement.classList.toggle("a11y-contrast", a.highContrast);
    document.documentElement.classList.toggle("a11y-grayscale", a.grayscale);
    document.documentElement.classList.toggle("lang-he", locale === "he");
    document.documentElement.classList.toggle("lang-en", locale === "en");
  }, [a.highContrast, a.grayscale, locale]);

  const toggleLang = useCallback(
    () => setLocale(locale === "he" ? "en" : "he"),
    [locale, setLocale],
  );

  const value = useMemo<SiteContextValue>(
    () => ({
      lang: locale,
      dir: locale === "he" ? "rtl" : "ltr",
      t: CONTENT[locale],
      toggleLang,
      a11y: {
        fontScale: a.scale / 100,
        highContrast: a.highContrast,
        grayscale: a.grayscale,
        reduceMotion,
      },
      increaseFont: a.increase,
      decreaseFont: a.decrease,
      toggleContrast: a.toggleHighContrast,
      toggleGrayscale: a.toggleGrayscale,
      toggleReduceMotion: () => setReduceMotion((v) => !v),
      resetA11y: () => {
        a.reset();
        setReduceMotion(false);
      },
    }),
    [locale, toggleLang, a, reduceMotion],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}
