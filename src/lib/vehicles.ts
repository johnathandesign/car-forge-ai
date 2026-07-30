export type VehicleId = "bmw-m3" | "byd-seal" | "porsche-manthey";

export type CapabilityState =
  | "available"
  | "selected"
  | "loading"
  | "disabled"
  | "unsupported"
  | "validation_gated"
  | "error";

export type VehicleSummary = {
  id: VehicleId;
  name: string;
  subtitleHe: string;
  subtitleEn: string;
  descriptionHe: string;
  descriptionEn: string;
  personality: "sport" | "electric" | "track";
  availability: "available" | "loading" | "blocked" | "error";
  supportedCategories: string[];
};

export const VEHICLES: VehicleSummary[] = [
  {
    id: "bmw-m3",
    name: "BMW M3",
    subtitleHe: "סדאן ביצועים",
    subtitleEn: "Performance Sedan",
    descriptionHe: "סדאן ביצועים עם נוכחות חדה וקווים דינמיים.",
    descriptionEn: "A performance sedan with a sharp presence and dynamic lines.",
    personality: "sport",
    availability: "available",
    supportedCategories: ["body-color", "rim-color", "caliper-color", "window-tint", "seats"],
  },
  {
    id: "byd-seal",
    name: "BYD Seal",
    subtitleHe: "סדאן חשמלית",
    subtitleEn: "Electric Sedan",
    descriptionHe: "סדאן חשמלית בעיצוב נקי, מודרני ואווירודינמי.",
    descriptionEn: "An electric sedan with a clean, modern, and aerodynamic design.",
    personality: "electric",
    availability: "available",
    supportedCategories: ["body-color", "rim-color", "window-tint"],
  },
  {
    id: "porsche-manthey",
    name: "Porsche Manthey 911 GT3 RS",
    subtitleHe: "מכונית מסלול",
    subtitleEn: "Track Car",
    descriptionHe: "מכונית מסלול אייקונית עם אופי טכני ואגרסיבי.",
    descriptionEn: "An iconic track-focused car with a technical and aggressive character.",
    personality: "track",
    availability: "available",
    supportedCategories: ["body-color", "rim-color", "caliper-color", "hood-color", "window-tint"],
  },
];

export function getVehicle(id: string): VehicleSummary | undefined {
  return VEHICLES.find((v) => v.id === id);
}

export const EXTERIOR_CATEGORIES = [
  { id: "body-color", he: "צבע מרכב", en: "Body Color" },
  { id: "rim-color", he: "צבע חישוקים", en: "Rim Color" },
  { id: "caliper-color", he: "צבע קליפרים", en: "Brake Caliper Color" },
  { id: "hood-color", he: "צבע מכסה מנוע", en: "Hood Color" },
  { id: "window-tint", he: "הכהיית חלונות", en: "Window Tint" },
  { id: "rim-style", he: "עיצוב חישוקים", en: "Rim Style" },
  { id: "spoilers", he: "כנפיים / ספוילרים", en: "Wings / Spoilers" },
  { id: "bumpers", he: "פגושים", en: "Bumpers" },
  { id: "trim", he: "גימור חיצוני", en: "Exterior Trim" },
] as const;

export const INTERIOR_CATEGORIES = [
  { id: "interior-color", he: "צבע פנים", en: "Interior Color" },
  { id: "seats", he: "מושבים", en: "Seats" },
  { id: "dashboard", he: "דשבורד / תא ראשי", en: "Dashboard / Main Cabin" },
  { id: "door-trim", he: "גימור דלתות", en: "Door Trim" },
  { id: "interior-accent", he: "אקסנט פנים", en: "Interior Accent" },
  { id: "interior-trim", he: "גימור פנים", en: "Interior Trim" },
] as const;
