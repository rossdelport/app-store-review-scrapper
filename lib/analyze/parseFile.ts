import { parseReviewsCsv, rowsToReviews } from "./csv";
import type { ParsedReview } from "./types";

// Excel (.xlsx). The legacy binary .xls format isn't supported by the parser.
const EXCEL_RE = /\.xlsx$/i;

/** Read one uploaded file into review rows — CSV/TXT directly, or .xlsx by
 *  pulling the first sheet's rows through the same column-detection logic.
 *  The Excel parser is loaded on demand so it stays out of the initial bundle. */
export async function parseFile(file: File): Promise<ParsedReview[]> {
  if (EXCEL_RE.test(file.name)) {
    const { default: readXlsxFile } = await import("read-excel-file");
    const rows = await readXlsxFile(file);
    const asStrings = rows.map((row) =>
      row.map((cell) => (cell == null ? "" : String(cell))),
    );
    return rowsToReviews(asStrings);
  }
  return parseReviewsCsv(await file.text());
}

/** True when a dropped/selected file looks like something we can parse. */
export function isSupportedReviewFile(f: File): boolean {
  return /\.(csv|txt|xlsx)$/i.test(f.name) || /(csv|excel|spreadsheet)/i.test(f.type);
}
