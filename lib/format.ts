/** 78000 -> "78.0K", 1500000 -> "1.5M" */
export function compactNumber(n?: number): string {
  if (n == null || !isFinite(n)) return "";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
}

/** ISO date / year -> "Over 7 years", "Under 6 months", "Over 1 year" */
export function relativeAge(released?: string): string {
  if (!released) return "";
  const then = new Date(released).getTime();
  if (isNaN(then)) return "";
  const years = (Date.now() - then) / (365.25 * 24 * 3600 * 1000);
  if (years < 0.5) return "Under 6 months";
  if (years < 1) return "Under 1 year";
  const whole = Math.floor(years);
  return `Over ${whole} year${whole === 1 ? "" : "s"}`;
}

/** Seconds -> "53s", "2m 04s" */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}
