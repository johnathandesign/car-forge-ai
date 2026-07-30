import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "he" | "en";

type Dict = {
  nav: { home: string; showroom: string; garage: string };
  cta: { launchStudio: string; viewShowroom: string; openInGarage: string };
  hero: { eyebrow: string; headline: string; supporting: string; imageAlt: string };
  features: {
    viz: { t: string; s: string };
    ext: { t: string; s: string };
    intr: { t: string; s: string };
    hist: { t: string; s: string };
  };
  showroom: { title: string; subtitle: string; note: string };
  closing: { eyebrow: string; headline: string; supporting: string; cta: string };
  preview: {
    availability: string;
    categoriesLabel: string;
    exterior: string;
    interior: string;
    open: string;
  };
  garage: {
    back: string;
    exterior: string;
    interior: string;
    review: string;
    undo: string;
    redo: string;
    returnOriginal: string;
    reset: string;
    compare: string;
    loading: string;
    categoryLoading: string;
    unsupported: string;
    disabled: string;
    validationGated: string;
    noChangesTitle: string;
    noChangesBody: string;
    noOptionsTitle: string;
    noOptionsBody: string;
    errorTitle: string;
    errorBody: string;
    tryAgain: string;
    invalidVehicle: string;
    placeholderNote: string;
    selectCategory: string;
    resetTitle: string;
    resetBody: string;
    resetPrimary: string;
    cancel: string;
    cameraExterior: string;
    cameraInterior: string;
    cameraFocusWheels: string;
    downloadDesign: string;
    downloadingDesign: string;
  };
  a11y: {
    trigger: string;
    increase: string;
    decrease: string;
    highContrast: string;
    grayscale: string;
    reset: string;
    on: string;
    off: string;
  };
  lang: { switchTo: string; he: string; en: string };
  footer: { student: string; noAffiliation: string; copyright: string };
  loading: string;
};

const DICT: Record<Locale, Dict> = {
  he: {
    nav: { home: "בית", showroom: "אולם תצוגה", garage: "Garage" },
    cta: {
      launchStudio: "לפתיחת הסטודיו",
      viewShowroom: "לצפייה באולם התצוגה",
      openInGarage: "פתיחה ב־Garage",
    },
    hero: {
      eyebrow: "סטודיו תלת־ממדי חכם לעיצוב רכבים",
      headline: "עיצוב בלי גבולות.\nדיוק בלי ניחושים.",
      supporting:
        "CarForge AI הוא סטודיו דיגיטלי להתאמה אישית של רכבים, עם תצוגה תלת־ממדית, שליטה מדויקת וחוויית מוסך מקצועית.",
      imageAlt: "CarForge AI — רכב שעובר ממרכב בנוי לסריקה דיגיטלית בזמן אמת",
    },
    features: {
      viz: { t: "תצוגת רכב תלת־ממדית", s: "בחינה אינטראקטיבית של הרכב מכל זווית." },
      ext: { t: "עיצוב חיצוני", s: "צבעים, חישוקים, ספוילרים, פגושים וגימורים." },
      intr: { t: "עיצוב פנים", s: "מושבים, צבעים, דשבורד, דלתות וגימורים פנימיים." },
      hist: { t: "היסטוריית שינויים", s: "ביטול, שחזור והשוואה למצב המקורי." },
    },
    showroom: {
      title: "אולם התצוגה",
      subtitle: "בחרו את הרכב שברצונכם לעצב ופתחו אותו בסביבת ה־Garage.",
      note: "אפשרויות ההתאמה משתנות בין הרכבים. אפשרויות שאינן זמינות יוצגו באופן ברור ולא ייראו כפעילות.",
    },
    closing: {
      eyebrow: "התחילו לעצב",
      headline: "מוכנים להתחיל לעצב?",
      supporting: "בחרו רכב, פתחו את סביבת ה־Garage והתחילו לבנות את העיצוב שלכם.",
      cta: "לאולם התצוגה",
    },
    preview: {
      availability: "זמין",
      categoriesLabel: "התאמות נתמכות",
      exterior: "חוץ",
      interior: "פנים",
      open: "פתיחה ב־Garage",
    },
    garage: {
      back: "חזרה לאולם התצוגה",
      exterior: "חוץ",
      interior: "פנים",
      review: "סיכום השינויים",
      undo: "ביטול",
      redo: "ביצוע מחדש",
      returnOriginal: "חזרה למצב המקורי",
      reset: "איפוס העיצוב",
      compare: "השוואה למקור",
      loading: "טוען את הרכב…",
      categoryLoading: "טוען את אפשרויות ההתאמה…",
      unsupported: "האפשרות אינה נתמכת ברכב הזה",
      disabled: "האפשרות אינה זמינה כעת",
      validationGated: "בבדיקה טכנית",
      noChangesTitle: "עדיין לא בוצעו שינויים",
      noChangesBody: "בחרו קטגוריה והתחילו לעצב את הרכב.",
      noOptionsTitle: "אין אפשרויות זמינות בקטגוריה הזו",
      noOptionsBody: "אפשר לבחור קטגוריה אחרת או רכב אחר.",
      errorTitle: "לא הצלחנו לטעון את הרכב",
      errorBody: "אפשר לנסות שוב או לחזור לאולם התצוגה.",
      tryAgain: "ניסיון חוזר",
      invalidVehicle: "הרכב המבוקש אינו קיים באולם התצוגה",
      placeholderNote: "מרחב המוסך מוכן לחיבור מנוע התלת־ממד.",
      selectCategory: "בחרו קטגוריה",
      resetTitle: "לאפס את כל העיצוב?",
      resetBody: "כל השינויים שבוצעו יחזרו למצב המקורי.",
      resetPrimary: "איפוס העיצוב",
      cancel: "ביטול",
      cameraExterior: "מבט חיצוני",
      cameraInterior: "מבט פנימי",
      cameraFocusWheels: "התמקדות בחישוקים",
      downloadDesign: "הורדת העיצוב",
      downloadingDesign: "מייצר תמונה…",
    },
    a11y: {
      trigger: "אפשרויות נגישות",
      increase: "הגדלת טקסט",
      decrease: "הקטנת טקסט",
      highContrast: "ניגודיות גבוהה",
      grayscale: "גווני אפור",
      reset: "איפוס הגדרות נגישות",
      on: "פעיל",
      off: "כבוי",
    },
    lang: { switchTo: "החלפת שפה", he: "עברית", en: "English" },
    footer: {
      student: "CarForge AI הוא פרויקט לימודי והדגמתי.",
      noAffiliation: "הפרויקט אינו קשור, מאושר או נתמך על ידי BMW, BYD, Porsche או יצרן רכב אחר.",
      copyright: "© CarForge AI. כל הזכויות שמורות.",
    },
    loading: "טוען את העמוד…",
  },
  en: {
    nav: { home: "Home", showroom: "Showroom", garage: "Garage" },
    cta: {
      launchStudio: "Launch Studio",
      viewShowroom: "View Showroom",
      openInGarage: "Open in Garage",
    },
    hero: {
      eyebrow: "AI-Powered 3D Car Studio",
      headline: "Design Without Limits.\nRefine Without Guesswork.",
      supporting:
        "CarForge AI is a digital vehicle customization studio with immersive 3D visualization, precise controls, and a professional garage experience.",
      imageAlt:
        "CarForge AI — vehicle transitioning from a finished body into a real-time digital scan",
    },
    features: {
      viz: {
        t: "3D Vehicle Visualization",
        s: "Explore the vehicle interactively from every angle.",
      },
      ext: {
        t: "Exterior Customization",
        s: "Colors, rims, spoilers, bumpers, and exterior trim.",
      },
      intr: {
        t: "Interior Customization",
        s: "Seats, colors, dashboard, door trim, and interior accents.",
      },
      hist: {
        t: "Reversible Design History",
        s: "Undo, restore, and compare with the original design.",
      },
    },
    showroom: {
      title: "Showroom",
      subtitle: "Choose the vehicle you want to customize and open it in the Garage.",
      note: "Customization options vary by vehicle. Unavailable capabilities are shown clearly and never appear interactive.",
    },
    closing: {
      eyebrow: "Start Designing",
      headline: "Ready to start designing?",
      supporting: "Choose a vehicle, open the Garage, and start building your design.",
      cta: "Go to Showroom",
    },
    preview: {
      availability: "Available",
      categoriesLabel: "Supported customization",
      exterior: "Exterior",
      interior: "Interior",
      open: "Open in Garage",
    },
    garage: {
      back: "Back to Showroom",
      exterior: "Exterior",
      interior: "Interior",
      review: "Change Summary",
      undo: "Undo",
      redo: "Redo",
      returnOriginal: "Return to Original",
      reset: "Reset Design",
      compare: "Compare with Original",
      loading: "Loading vehicle…",
      categoryLoading: "Loading customization options…",
      unsupported: "This option is not supported for this vehicle.",
      disabled: "This option is currently unavailable.",
      validationGated: "Under technical review",
      noChangesTitle: "No changes yet",
      noChangesBody: "Choose a category and start customizing the vehicle.",
      noOptionsTitle: "No options are available in this category",
      noOptionsBody: "Choose another category or a different vehicle.",
      errorTitle: "We could not load the vehicle",
      errorBody: "Try again or return to the Showroom.",
      tryAgain: "Try Again",
      invalidVehicle: "The requested vehicle is not available in the Showroom.",
      placeholderNote: "The Garage stage is ready for the 3D engine to mount.",
      selectCategory: "Select a category",
      resetTitle: "Reset the entire design?",
      resetBody: "All changes will return to the original state.",
      resetPrimary: "Reset Design",
      cancel: "Cancel",
      cameraExterior: "Exterior View",
      cameraInterior: "Interior View",
      cameraFocusWheels: "Focus Wheels",
      downloadDesign: "Download Design",
      downloadingDesign: "Generating…",
    },
    a11y: {
      trigger: "Accessibility Options",
      increase: "Increase Text Size",
      decrease: "Decrease Text Size",
      highContrast: "High Contrast",
      grayscale: "Grayscale",
      reset: "Reset Accessibility Settings",
      on: "On",
      off: "Off",
    },
    lang: { switchTo: "Switch language", he: "עברית", en: "English" },
    footer: {
      student: "CarForge AI is an educational demonstration project.",
      noAffiliation:
        "This project is not affiliated with, endorsed by, or supported by BMW, BYD, Porsche, or any other vehicle manufacturer.",
      copyright: "© CarForge AI. All rights reserved.",
    },
    loading: "Loading page…",
  },
};

type I18nCtx = { locale: Locale; dir: "rtl" | "ltr"; t: Dict; setLocale: (l: Locale) => void };
const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("he");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("carforge:locale") as Locale | null;
      if (saved === "he" || saved === "en") setLocaleState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const dir = locale === "he" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem("carforge:locale", locale);
    } catch {}
  }, [locale]);

  const value: I18nCtx = {
    locale,
    dir: locale === "he" ? "rtl" : "ltr",
    t: DICT[locale],
    setLocale: setLocaleState,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used inside I18nProvider");
  return c;
}
