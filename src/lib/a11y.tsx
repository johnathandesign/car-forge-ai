import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Scale = 90 | 100 | 115 | 130;
const SCALES: Scale[] = [90, 100, 115, 130];

type A11yState = {
  scale: Scale;
  highContrast: boolean;
  grayscale: boolean;
  increase: () => void;
  decrease: () => void;
  toggleHighContrast: () => void;
  toggleGrayscale: () => void;
  reset: () => void;
};

const Ctx = createContext<A11yState | null>(null);

export function A11yProvider({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState<Scale>(100);
  const [highContrast, setHC] = useState(false);
  const [grayscale, setGS] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("carforge:a11y");
      if (raw) {
        const p = JSON.parse(raw);
        if (SCALES.includes(p.scale)) setScale(p.scale);
        setHC(!!p.highContrast);
        setGS(!!p.grayscale);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const body = document.body;
    body.classList.remove("text-scale-90", "text-scale-100", "text-scale-115", "text-scale-130");
    body.classList.add(`text-scale-${scale}`);
    body.classList.toggle("hc", highContrast);
    body.classList.toggle("grayscale-mode", grayscale);
    try {
      localStorage.setItem("carforge:a11y", JSON.stringify({ scale, highContrast, grayscale }));
    } catch {}
  }, [scale, highContrast, grayscale]);

  const step = (dir: 1 | -1) => {
    const i = SCALES.indexOf(scale);
    const n = Math.max(0, Math.min(SCALES.length - 1, i + dir));
    setScale(SCALES[n]);
  };

  const value: A11yState = {
    scale,
    highContrast,
    grayscale,
    increase: () => step(1),
    decrease: () => step(-1),
    toggleHighContrast: () => setHC((v) => !v),
    toggleGrayscale: () => setGS((v) => !v),
    reset: () => { setScale(100); setHC(false); setGS(false); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useA11y() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useA11y must be used inside A11yProvider");
  return c;
}
