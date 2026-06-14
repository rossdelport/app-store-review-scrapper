import type { CollectedReview } from "./types";
import { STORE_LABELS } from "./types";
import { countryName } from "./countries";

/** Quote a CSV field per RFC 4180 when it contains a comma, quote or newline. */
function escapeField(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a combined CSV across every selected app and country.
 * Columns: store, app, country, rating, review.
 */
export function reviewsToCsv(rows: CollectedReview[]): string {
  const header = ["store", "app", "country", "rating", "review"].join(",");
  const lines = rows.map((r) =>
    [
      STORE_LABELS[r.store],
      r.app,
      countryName(r.country),
      r.rating,
      r.text,
    ]
      .map(escapeField)
      .join(","),
  );
  // Prepend a UTF-8 BOM so Excel opens emoji / accents correctly.
  return "﻿" + [header, ...lines].join("\r\n");
}

/** A filesystem-safe download name, e.g. instagram-reviews-2026-06-14.csv */
export function csvFilename(term: string): string {
  const slug =
    term
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "app";
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}-reviews-${date}.csv`;
}
