import type { Review } from "./types";

/** Quote a CSV field per RFC 4180 when it contains a comma, quote or newline. */
function escapeField(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV with exactly two columns: rating and review text. */
export function reviewsToCsv(reviews: Review[]): string {
  const header = "rating,review";
  const rows = reviews.map(
    (r) => `${escapeField(r.rating)},${escapeField(r.text)}`,
  );
  // Prepend a UTF-8 BOM so Excel opens emoji / accents correctly.
  return "﻿" + [header, ...rows].join("\r\n");
}

/** A filesystem-safe download name, e.g. instagram-googleplay-reviews.csv */
export function csvFilename(appTitle: string, store: string): string {
  const slug = appTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "app";
  return `${slug}-${store}-reviews.csv`;
}
