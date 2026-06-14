export type Tier = 1 | 2 | 3;

export interface Country {
  code: string; // 2-letter, valid for both iTunes and google-play-scraper
  name: string;
  tier: Tier;
}

// 50 storefronts grouped into three tiers (15 / 19 / 16).
export const COUNTRIES: Country[] = [
  // Tier 1 — Developed Markets (15)
  { code: "us", name: "United States", tier: 1 },
  { code: "gb", name: "United Kingdom", tier: 1 },
  { code: "au", name: "Australia", tier: 1 },
  { code: "ca", name: "Canada", tier: 1 },
  { code: "de", name: "Germany", tier: 1 },
  { code: "fr", name: "France", tier: 1 },
  { code: "jp", name: "Japan", tier: 1 },
  { code: "kr", name: "South Korea", tier: 1 },
  { code: "it", name: "Italy", tier: 1 },
  { code: "es", name: "Spain", tier: 1 },
  { code: "nl", name: "Netherlands", tier: 1 },
  { code: "se", name: "Sweden", tier: 1 },
  { code: "no", name: "Norway", tier: 1 },
  { code: "dk", name: "Denmark", tier: 1 },
  { code: "ch", name: "Switzerland", tier: 1 },
  // Tier 2 — Emerging Markets (19)
  { code: "cn", name: "China", tier: 2 },
  { code: "in", name: "India", tier: 2 },
  { code: "br", name: "Brazil", tier: 2 },
  { code: "mx", name: "Mexico", tier: 2 },
  { code: "ru", name: "Russia", tier: 2 },
  { code: "at", name: "Austria", tier: 2 },
  { code: "be", name: "Belgium", tier: 2 },
  { code: "pl", name: "Poland", tier: 2 },
  { code: "tr", name: "Turkey", tier: 2 },
  { code: "sa", name: "Saudi Arabia", tier: 2 },
  { code: "ae", name: "United Arab Emirates", tier: 2 },
  { code: "sg", name: "Singapore", tier: 2 },
  { code: "hk", name: "Hong Kong", tier: 2 },
  { code: "tw", name: "Taiwan", tier: 2 },
  { code: "nz", name: "New Zealand", tier: 2 },
  { code: "ie", name: "Ireland", tier: 2 },
  { code: "pt", name: "Portugal", tier: 2 },
  { code: "cz", name: "Czechia", tier: 2 },
  { code: "hu", name: "Hungary", tier: 2 },
  // Tier 3 — Rest of World (16)
  { code: "gr", name: "Greece", tier: 3 },
  { code: "il", name: "Israel", tier: 3 },
  { code: "za", name: "South Africa", tier: 3 },
  { code: "ar", name: "Argentina", tier: 3 },
  { code: "cl", name: "Chile", tier: 3 },
  { code: "co", name: "Colombia", tier: 3 },
  { code: "th", name: "Thailand", tier: 3 },
  { code: "id", name: "Indonesia", tier: 3 },
  { code: "my", name: "Malaysia", tier: 3 },
  { code: "ph", name: "Philippines", tier: 3 },
  { code: "vn", name: "Vietnam", tier: 3 },
  { code: "pk", name: "Pakistan", tier: 3 },
  { code: "ng", name: "Nigeria", tier: 3 },
  { code: "eg", name: "Egypt", tier: 3 },
  { code: "ro", name: "Romania", tier: 3 },
  { code: "fi", name: "Finland", tier: 3 },
];

export const TIERS: { tier: Tier; label: string; desc: string }[] = [
  { tier: 1, label: "Tier 1", desc: "Developed Markets" },
  { tier: 2, label: "Tier 2", desc: "Emerging Markets" },
  { tier: 3, label: "Tier 3", desc: "Rest of World" },
];

export const DEFAULT_COUNTRY = "us";

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function isValidCountry(code: string): boolean {
  return byCode.has(code);
}

export function countryName(code: string): string {
  return byCode.get(code)?.name ?? code.toUpperCase();
}

export function countryTier(code: string): Tier | undefined {
  return byCode.get(code)?.tier;
}

export function countriesInTier(tier: Tier): Country[] {
  return COUNTRIES.filter((c) => c.tier === tier);
}

/** Turn a 2-letter country code into its flag emoji. */
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}
