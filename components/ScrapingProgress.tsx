/* eslint-disable @next/next/no-img-element */
import type { AppResult, Store } from "@/lib/types";
import { STORE_LABELS } from "@/lib/types";
import { countryName, flagEmoji } from "@/lib/countries";
import { compactNumber, formatDuration } from "@/lib/format";
import { AppleIcon, PlayIcon, SpinnerIcon, CheckIcon, PauseIcon, PlayTriangleIcon } from "./icons";

export type CellStatus = "pending" | "running" | "done" | "error";

export interface ScrapeState {
  apps: AppResult[];
  countries: string[];
  cells: Record<string, { status: CellStatus; count: number }>;
  done: number;
  total: number;
  reviews: number;
  estimated: number;
  startedAt: number;
  elapsedMs: number;
  status: "running" | "paused" | "done" | "cancelled";
}

export function cellKey(store: Store, id: string, country: string): string {
  return `${store}:${id}:${country}`;
}

function FlagCell({ flag, status, count, label }: { flag: string; status: CellStatus; count: number; label: string }) {
  return (
    <span
      title={`${label}${status === "done" ? ` — ${count} reviews` : status === "error" ? " — failed" : ""}`}
      className={`relative grid h-9 w-9 place-items-center rounded-lg border text-base ${
        status === "pending"
          ? "border-slate-200 opacity-40"
          : status === "running"
            ? "border-slate-300 bg-slate-50"
            : status === "done"
              ? "border-emerald-200 bg-emerald-50"
              : "border-rose-200 bg-rose-50"
      }`}
    >
      <span className={status === "running" ? "opacity-40" : ""}>{flag}</span>
      {status === "running" && <SpinnerIcon className="absolute h-4 w-4 text-slate-500" />}
      {status === "done" && (
        <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
          <CheckIcon className="h-2.5 w-2.5" />
        </span>
      )}
      {status === "error" && (
        <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
          !
        </span>
      )}
    </span>
  );
}

function AppRow({ app, countries, cells }: { app: AppResult; countries: string[]; cells: ScrapeState["cells"] }) {
  let appDone = 0;
  let appReviews = 0;
  for (const c of countries) {
    const cell = cells[cellKey(app.store, app.id, c)];
    if (cell && (cell.status === "done" || cell.status === "error")) appDone++;
    if (cell) appReviews += cell.count;
  }
  const pct = countries.length ? Math.round((appDone / countries.length) * 100) : 0;

  return (
    <div className="border-t border-slate-100 py-4 first:border-t-0">
      <div className="mb-3 flex items-center gap-3">
        {app.icon ? (
          <img src={app.icon} alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200" />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 font-semibold text-slate-400">
            {app.title.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{app.title}</p>
          <p className="truncate text-xs text-slate-400">{app.id}</p>
        </div>
        <div className="w-40 shrink-0">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>{pct}%</span>
            <span>{compactNumber(appReviews)} reviews</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {countries.map((c) => {
          const cell = cells[cellKey(app.store, app.id, c)];
          return (
            <FlagCell
              key={c}
              flag={flagEmoji(c)}
              status={cell?.status ?? "pending"}
              count={cell?.count ?? 0}
              label={countryName(c)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function ScrapingProgress({
  state,
  onPause,
  onResume,
  onCancel,
}: {
  state: ScrapeState;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}) {
  const { apps, countries, cells, done, total, reviews, estimated, elapsedMs, status } = state;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const secs = elapsedMs / 1000;
  const rate = secs > 0 ? done / secs : 0;
  const etaSecs = rate > 0 && done < total ? (total - done) / rate : 0;

  const stores = Array.from(new Set(apps.map((a) => a.store)));
  const storeLabel = stores.map((s) => STORE_LABELS[s as Store]).join(" & ");

  return (
    <div className="mx-auto max-w-3xl">
      {/* header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {status === "done" ? "Scrape Complete" : status === "cancelled" ? "Scrape Cancelled" : "Scraping Reviews"}
          </h2>
          <p className="text-sm text-slate-500">
            {apps.length} app{apps.length === 1 ? "" : "s"} across {storeLabel}
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-slate-900">{compactNumber(reviews) || 0}</span>
          <span className="text-sm text-slate-400"> / ~{compactNumber(estimated)} estimated</span>
        </div>
      </div>

      {/* summary card */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-slate-200">
              {status === "running" ? (
                <SpinnerIcon className="h-6 w-6 text-slate-700" />
              ) : status === "done" ? (
                <CheckIcon className="h-6 w-6 text-emerald-600" />
              ) : (
                <PauseIcon className="h-5 w-5 text-slate-500" />
              )}
            </span>
            <div>
              <p className="font-semibold text-slate-900">
                {status === "paused" ? "Paused" : status === "done" ? "Done" : status === "cancelled" ? "Cancelled" : "Scraping Reviews"}
              </p>
              <p className="text-sm text-slate-500">
                {done} of {total} requests
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{compactNumber(reviews) || 0}</p>
            <p className="text-sm text-slate-400">reviews</p>
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span className="flex items-center gap-3">
            <span>⏱ {formatDuration(secs)}</span>
            <span>⚡ {rate.toFixed(1)} req/s</span>
          </span>
          <span>{pct}%</span>
        </div>
      </div>

      {/* per-app */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {apps.length} app{apps.length === 1 ? "" : "s"} × {countries.length} countr{countries.length === 1 ? "y" : "ies"}
        </p>
        {status === "running" && etaSecs > 0 && (
          <p className="text-sm text-slate-400">~{formatDuration(etaSecs)} remaining</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-5 shadow-sm">
        {apps.map((app) => (
          <AppRow key={`${app.store}:${app.id}`} app={app} countries={countries} cells={cells} />
        ))}
      </div>

      {(status === "running" || status === "paused") && (
        <div className="sticky bottom-4 mt-5 flex items-center justify-end gap-3">
          {status === "running" ? (
            <button onClick={onPause} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <PauseIcon className="h-4 w-4" /> Pause
            </button>
          ) : (
            <button onClick={onResume} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <PlayTriangleIcon className="h-4 w-4" /> Resume
            </button>
          )}
          <button onClick={onCancel} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 shadow-sm hover:bg-rose-50">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
