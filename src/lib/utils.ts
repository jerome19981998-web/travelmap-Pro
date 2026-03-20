import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CONTINENTS = [
  "Europe", "Asia", "Americas", "Africa", "Oceania", "Antarctica",
] as const;

export const CONTINENT_COUNTRY_COUNTS: Record<string, number> = {
  Europe: 44,
  Asia: 48,
  Americas: 35,
  Africa: 54,
  Oceania: 14,
  Antarctica: 2,
};

export const TOTAL_COUNTRIES = 195;
export const TOTAL_CONTINENTS = 7;

export function worldPercent(countries: number): number {
  return Math.round((countries / TOTAL_COUNTRIES) * 100);
}

export function continentPercent(continent: string, visited: number): number {
  const total = CONTINENT_COUNTRY_COUNTS[continent] || 1;
  return Math.round((visited / total) * 100);
}

export function formatDate(dateStr: string | null | undefined, format: "short" | "long" | "year" = "short"): string {
  if (!dateStr) return "Unknown date";
  const date = new Date(dateStr);
  if (format === "year") return date.getFullYear().toString();
  if (format === "long") return date.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });
  return date.toLocaleDateString("en", { year: "numeric", month: "short" });
}

export function getContinent(countryCode: string): string {
  const map: Record<string, string> = {
    FR: "Europe", DE: "Europe", ES: "Europe", IT: "Europe", GB: "Europe",
    PT: "Europe", NL: "Europe", BE: "Europe", CH: "Europe", AT: "Europe",
    SE: "Europe", NO: "Europe", DK: "Europe", FI: "Europe", PL: "Europe",
    CZ: "Europe", HU: "Europe", RO: "Europe", GR: "Europe", HR: "Europe",
    US: "Americas", CA: "Americas", MX: "Americas", BR: "Americas",
    AR: "Americas", CL: "Americas", CO: "Americas", PE: "Americas",
    CN: "Asia", JP: "Asia", KR: "Asia", IN: "Asia", TH: "Asia",
    VN: "Asia", ID: "Asia", PH: "Asia", MY: "Asia", SG: "Asia",
    AE: "Asia", SA: "Asia", IL: "Asia", TR: "Asia", IR: "Asia",
    EG: "Africa", ZA: "Africa", MA: "Africa", NG: "Africa",
    ET: "Africa", KE: "Africa", GH: "Africa", TZ: "Africa",
    AU: "Oceania", NZ: "Oceania", FJ: "Oceania", PG: "Oceania",
  };
  return map[countryCode.toUpperCase()] || "Unknown";
}

export function getFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🏳️";
  const base = 0x1F1E6 - 0x41;
  return String.fromCodePoint(
    base + countryCode.toUpperCase().charCodeAt(0),
    base + countryCode.toUpperCase().charCodeAt(1)
  );
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
