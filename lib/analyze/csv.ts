import type { ParsedReview } from "./types";

/** RFC 4180-ish CSV parser: handles quoted fields, escaped quotes, and newlines
 *  inside quotes. Returns an array of rows (each an array of cell strings). */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Strip a leading UTF-8 BOM if present.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      // Handle \r\n as a single break.
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  // Flush trailing field/row.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const TEXT_HEADERS = ["review", "text", "body", "content", "comment", "feedback"];
const RATING_HEADERS = ["rating", "score", "stars", "star"];
const APP_HEADERS = ["app", "title", "appname", "app_name"];
const STORE_HEADERS = ["store", "platform"];
const COUNTRY_HEADERS = ["country", "market", "region", "locale"];

function findCol(headers: string[], names: string[]): number {
  const norm = headers.map((h) => h.trim().toLowerCase().replace(/[\s_-]/g, ""));
  for (const n of names) {
    const idx = norm.indexOf(n.replace(/[\s_-]/g, ""));
    if (idx !== -1) return idx;
  }
  // Fallback: a header that *contains* one of the names.
  for (let i = 0; i < norm.length; i++) {
    if (names.some((n) => norm[i].includes(n.replace(/[\s_-]/g, "")))) return i;
  }
  return -1;
}

/** Turn raw CSV text into review rows. Auto-detects the review-text and rating
 *  columns, tolerating different export formats (e.g. ReviewMaxxing or ours). */
export function parseReviewsCsv(text: string): ParsedReview[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const header = rows[0];
  let textCol = findCol(header, TEXT_HEADERS);
  let ratingCol = findCol(header, RATING_HEADERS);
  let appCol = findCol(header, APP_HEADERS);
  let storeCol = findCol(header, STORE_HEADERS);
  let countryCol = findCol(header, COUNTRY_HEADERS);

  // If we can't find a text column, assume there's no header row and take the
  // widest text column heuristically (the longest average cell).
  let dataStart = 1;
  if (textCol === -1) {
    dataStart = 0;
    // Header-matched metadata columns are meaningless without a header row.
    ratingCol = appCol = storeCol = countryCol = -1;
    let best = -1;
    let bestLen = 0;
    const sample = rows.slice(0, 30);
    const cols = Math.max(...rows.map((r) => r.length));
    for (let c = 0; c < cols; c++) {
      const avg =
        sample.reduce((s, r) => s + (r[c]?.length || 0), 0) / sample.length;
      if (avg > bestLen) {
        bestLen = avg;
        best = c;
      }
    }
    textCol = best;
  }

  const out: ParsedReview[] = [];
  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i];
    const t = (r[textCol] ?? "").trim();
    if (!t) continue;
    const ratingRaw = ratingCol !== -1 ? r[ratingCol] : undefined;
    const ratingNum = ratingRaw ? parseFloat(ratingRaw) : NaN;
    out.push({
      text: t,
      rating: isNaN(ratingNum) ? undefined : ratingNum,
      app: appCol !== -1 ? r[appCol]?.trim() || undefined : undefined,
      store: storeCol !== -1 ? r[storeCol]?.trim() || undefined : undefined,
      country: countryCol !== -1 ? r[countryCol]?.trim() || undefined : undefined,
    });
  }
  return out;
}
