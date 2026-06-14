"use client";

import { useEffect, useRef, useState } from "react";
import type { AppResult, CollectedReview, Review, Store } from "@/lib/types";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/countries";
import { reviewsToCsv, csvFilename } from "@/lib/csv";
import {
  SAMPLE_APPSTORE_APPS,
  SAMPLE_GOOGLEPLAY_APPS,
  mockReviews,
} from "@/lib/sample";
import { AppleIcon, PlayIcon, SearchIcon, SpinnerIcon, DownloadIcon } from "./icons";
import AppCard from "./AppCard";
import ConfigureModal from "./ConfigureModal";
import ScrapingProgress, {
  cellKey,
  type CellStatus,
  type ScrapeState,
} from "./ScrapingProgress";

const PER_CELL_MAX = 50;
const CONCURRENCY = 5;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const selKey = (a: AppResult) => `${a.store}:${a.id}`;

export default function Scraper() {
  const [term, setTerm] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [appStore, setAppStore] = useState<AppResult[]>([]);
  const [googlePlay, setGooglePlay] = useState<AppResult[]>([]);
  const [selected, setSelected] = useState<Map<string, AppResult>>(new Map());

  const [showConfig, setShowConfig] = useState(false);
  const [scrape, setScrape] = useState<ScrapeState | null>(null);
  const [collected, setCollected] = useState<CollectedReview[]>([]);

  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const demoRef = useRef(false);
  const collectedRef = useRef<CollectedReview[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      cancelledRef.current = true; // stop any in-flight workers on unmount
      if (tickRef.current) clearInterval(tickRef.current);
    },
    [],
  );

  const totalResults = appStore.length + googlePlay.length;

  // ---- search ---------------------------------------------------------------
  async function searchStore(store: Store, q: string): Promise<AppResult[]> {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store, term: q, country }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Search failed");
    return data.results || [];
  }

  async function handleSearch() {
    const q = term.trim();
    if (!q) return;
    demoRef.current = false;
    setSearching(true);
    setSearchError(null);
    setAppStore([]);
    setGooglePlay([]);
    setSelected(new Map());

    const [as, gp] = await Promise.allSettled([
      searchStore("appstore", q),
      searchStore("googleplay", q),
    ]);
    if (as.status === "fulfilled") setAppStore(as.value);
    if (gp.status === "fulfilled") setGooglePlay(gp.value);
    if (as.status === "rejected" && gp.status === "rejected") {
      setSearchError(
        (as.reason as Error)?.message ||
          "Search failed — check the server's network access.",
      );
    }
    setSearching(false);
  }

  function loadSample() {
    demoRef.current = true;
    setSearchError(null);
    setTerm(term || "bookshelf");
    setAppStore(SAMPLE_APPSTORE_APPS);
    setGooglePlay(SAMPLE_GOOGLEPLAY_APPS);
    setSelected(new Map());
  }

  // ---- selection ------------------------------------------------------------
  function toggle(a: AppResult) {
    setSelected((prev) => {
      const next = new Map(prev);
      const k = selKey(a);
      next.has(k) ? next.delete(k) : next.set(k, a);
      return next;
    });
  }
  function selectAll() {
    const next = new Map<string, AppResult>();
    [...appStore, ...googlePlay].forEach((a) => next.set(selKey(a), a));
    setSelected(next);
  }
  function deselectAll() {
    setSelected(new Map());
  }

  // ---- scraping -------------------------------------------------------------
  async function fetchCellReviews(task: { app: AppResult; country: string }, seed: number): Promise<Review[]> {
    if (demoRef.current) {
      await sleep(120 + Math.random() * 500);
      return mockReviews(seed + task.country.charCodeAt(0) + task.country.charCodeAt(1));
    }
    // Retry transient failures (proxy timeouts, rotating IPs that get blocked,
    // rate limits) — each attempt gets a fresh proxy IP, so most recover.
    const ATTEMPTS = 4;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      if (cancelledRef.current) return [];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000); // never hang forever
      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store: task.app.store,
            appId: task.app.id,
            country: task.country,
            max: PER_CELL_MAX,
          }),
          signal: controller.signal,
        });
        if (res.status === 404) return []; // no reviews for that storefront — fine
        if (!res.ok) throw new Error(`HTTP ${res.status}`); // 429 / 5xx -> retry
        const data = await res.json();
        return data.reviews || [];
      } catch (e) {
        lastErr = e;
        if (attempt < ATTEMPTS) await sleep(400 * attempt + Math.random() * 300);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr;
  }

  async function startScraping(countries: string[]) {
    const apps = Array.from(selected.values());
    const tasks: { app: AppResult; country: string }[] = [];
    apps.forEach((a) => countries.forEach((c) => tasks.push({ app: a, country: c })));

    const cells: Record<string, { status: CellStatus; count: number }> = {};
    tasks.forEach((t) => {
      cells[cellKey(t.app.store, t.app.id, t.country)] = { status: "pending", count: 0 };
    });

    cancelledRef.current = false;
    pausedRef.current = false;
    collectedRef.current = [];
    setCollected([]);
    setShowConfig(false);

    setScrape({
      apps,
      countries,
      cells,
      done: 0,
      total: tasks.length,
      reviews: 0,
      estimated: tasks.length * 35,
      startedAt: Date.now(),
      elapsedMs: 0,
      status: "running",
    });

    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setScrape((prev) =>
        prev && prev.status === "running" ? { ...prev, elapsedMs: Date.now() - prev.startedAt } : prev,
      );
    }, 500);

    let idx = 0;
    const worker = async () => {
      while (true) {
        if (cancelledRef.current) return;
        while (pausedRef.current && !cancelledRef.current) await sleep(200);
        if (cancelledRef.current) return;
        const my = idx++;
        if (my >= tasks.length) return;
        const task = tasks[my];
        const key = cellKey(task.app.store, task.app.id, task.country);

        setScrape((prev) =>
          prev ? { ...prev, cells: { ...prev.cells, [key]: { status: "running", count: 0 } } } : prev,
        );

        let count = 0;
        let status: CellStatus = "done";
        try {
          const reviews = await fetchCellReviews(task, my * 13 + 1);
          count = reviews.length;
          for (const r of reviews) {
            collectedRef.current.push({
              store: task.app.store,
              app: task.app.title,
              appId: task.app.id,
              country: task.country,
              rating: r.rating,
              text: r.text,
            });
          }
        } catch {
          status = "error";
        }
        if (cancelledRef.current) return;
        setScrape((prev) =>
          prev
            ? {
                ...prev,
                cells: { ...prev.cells, [key]: { status, count } },
                done: prev.done + 1,
                reviews: prev.reviews + count,
              }
            : prev,
        );
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker));

    if (tickRef.current) clearInterval(tickRef.current);
    if (cancelledRef.current) {
      setScrape((prev) => (prev ? { ...prev, status: "cancelled", elapsedMs: Date.now() - prev.startedAt } : prev));
    } else {
      setCollected(collectedRef.current.slice());
      setScrape((prev) => (prev ? { ...prev, status: "done", elapsedMs: Date.now() - prev.startedAt } : prev));
    }
  }

  function pause() {
    pausedRef.current = true;
    setScrape((prev) => (prev ? { ...prev, status: "paused" } : prev));
  }
  function resume() {
    pausedRef.current = false;
    setScrape((prev) => (prev && prev.status === "paused" ? { ...prev, status: "running" } : prev));
  }
  function cancel() {
    cancelledRef.current = true;
    pausedRef.current = false;
  }
  function backToResults() {
    setScrape(null);
    setCollected([]);
  }

  function downloadCsv() {
    if (collected.length === 0) return;
    const csv = reviewsToCsv(collected);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename(term || "app");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---- render: scraping / done ---------------------------------------------
  if (scrape) {
    const finished = scrape.status === "done" || scrape.status === "cancelled";
    const errorCount = Object.values(scrape.cells).filter((c) => c.status === "error").length;
    const allFailed = finished && collected.length === 0 && errorCount > 0;
    return (
      <div className="space-y-5">
        <ScrapingProgress state={scrape} onPause={pause} onResume={resume} onCancel={cancel} />
        {allFailed && (
          <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-semibold">Every request was blocked, so no reviews came back.</p>
            <p className="mt-1 text-amber-800">
              App stores block requests from shared cloud IPs (like Vercel&apos;s). This works from a
              home/residential IP — run it locally with <code className="rounded bg-amber-100 px-1">npm run dev</code> — or route
              traffic through a proxy by setting <code className="rounded bg-amber-100 px-1">SCRAPER_PROXY_URL</code> in your
              Vercel environment variables. (Tip: use <span className="font-medium">load sample data</span> to demo the full flow anywhere.)
            </p>
          </div>
        )}
        {finished && (
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="font-semibold text-slate-900">
                {collected.length.toLocaleString()} reviews collected
              </p>
              <p className="text-sm text-slate-500">
                across {scrape.apps.length} app{scrape.apps.length === 1 ? "" : "s"} and {scrape.countries.length} countr
                {scrape.countries.length === 1 ? "y" : "ies"}, combined into one CSV.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button onClick={backToResults} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Back to results
              </button>
              <button
                onClick={downloadCsv}
                disabled={collected.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                <DownloadIcon className="h-4 w-4" /> Download CSV
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- render: search -------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* control bar */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5 sm:shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search an app title (e.g. Instagram)"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            disabled={searching || !term.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {searching ? <><SpinnerIcon className="h-5 w-5" /> Searching</> : "Search"}
          </button>
        </div>

        {totalResults > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <button onClick={selectAll} className="font-medium text-slate-600 hover:text-slate-900">
              Select all ({totalResults})
            </button>
            <button onClick={deselectAll} className="font-medium text-slate-500 hover:text-slate-700">
              Deselect all
            </button>
            <div className="ml-auto">
              <button
                onClick={() => setShowConfig(true)}
                disabled={selected.size === 0}
                className="relative inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                Get Reviews
                {selected.size > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white/20 px-1.5 text-xs">
                    {selected.size}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {searchError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {searchError}
        </div>
      )}

      {totalResults === 0 && !searching && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <p className="text-slate-500">Search a title to see App Store and Google Play results side by side.</p>
          <button onClick={loadSample} className="mt-2 text-sm font-medium text-slate-900 underline-offset-2 hover:underline">
            or load sample data
          </button>
        </div>
      )}

      {(totalResults > 0 || searching) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <StoreColumn store="appstore" results={appStore} selected={selected} onToggle={toggle} searching={searching} />
          <StoreColumn store="googleplay" results={googlePlay} selected={selected} onToggle={toggle} searching={searching} />
        </div>
      )}

      {showConfig && (
        <ConfigureModal
          apps={Array.from(selected.values())}
          onCancel={() => setShowConfig(false)}
          onStart={startScraping}
        />
      )}
    </div>
  );
}

function StoreColumn({
  store,
  results,
  selected,
  onToggle,
  searching,
}: {
  store: Store;
  results: AppResult[];
  selected: Map<string, AppResult>;
  onToggle: (a: AppResult) => void;
  searching: boolean;
}) {
  const isApple = store === "appstore";
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        {isApple ? <AppleIcon className="h-5 w-5 text-slate-900" /> : <PlayIcon className="h-5 w-5" />}
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
          {isApple ? "App Store" : "Google Play"}
        </h3>
        <span className="text-xs text-slate-400">({results.length} results)</span>
      </div>
      <div className="space-y-2">
        {searching && results.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-10 text-sm text-slate-400">
            <SpinnerIcon className="h-4 w-4" /> Searching…
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
            No results
          </div>
        ) : (
          results.map((a, i) => (
            <AppCard key={selKey(a)} app={a} rank={i + 1} selected={selected.has(selKey(a))} onToggle={onToggle} />
          ))
        )}
      </div>
    </section>
  );
}
