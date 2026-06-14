/** Storefronts we expose in the UI. Codes are the two-letter codes that
 *  both the iTunes APIs and google-play-scraper accept. */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "us", name: "United States" },
  { code: "gb", name: "United Kingdom" },
  { code: "ca", name: "Canada" },
  { code: "au", name: "Australia" },
  { code: "ie", name: "Ireland" },
  { code: "nz", name: "New Zealand" },
  { code: "za", name: "South Africa" },
  { code: "in", name: "India" },
  { code: "de", name: "Germany" },
  { code: "fr", name: "France" },
  { code: "es", name: "Spain" },
  { code: "it", name: "Italy" },
  { code: "nl", name: "Netherlands" },
  { code: "se", name: "Sweden" },
  { code: "br", name: "Brazil" },
  { code: "mx", name: "Mexico" },
  { code: "jp", name: "Japan" },
];

export const DEFAULT_COUNTRY = "us";

export function isValidCountry(code: string): boolean {
  return COUNTRIES.some((c) => c.code === code);
}
