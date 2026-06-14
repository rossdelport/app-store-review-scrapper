"use client";

import { useState } from "react";
import type { AppResult, Review, Store } from "@/lib/types";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/countries";
import { parseStoreUrl } from "@/lib/parseUrl";
import { reviewsToCsv, csvFilename } from "@/lib/csv";
import { SAMPLE_APP, SAMPLE_REVIEWS } from "@/lib/sample";
import { AppleIcon, PlayIcon, SearchIcon, SpinnerIcon } from "./icons";
import AppCard from "./AppCard";
import ReviewsTable from "./ReviewsTable";

type Phase = "idle" | "results" | "reviews";

const STORES: { id: Store; label: string; Icon: typeof AppleIcon }[] = [
  { id: "appstore", label: "App Store", Icon: AppleIcon },
  { id: "googleplay", label: "Google Play", Icon: PlayIcon },
];

/** Build a readable app name from a pasted store URL. */
function titleFromUrl(store: Store, id: string, raw: string): string {
  if (store === "appstore") {
    const m = raw.match(/\/app\/([^/]+)\/id\d+/i);
    if (m) {
      return decodeURIComponent(m[1])
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return id;
}

export default function Scraper() {
  const [store, setStore] = useState<Store>("appstore");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [query, setQuery] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<AppResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [scrapingId, setScrapingId] = useState<string | null>(null);

  const [app, setApp] = useState<AppResult | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [source, setSource] = useState<"live" | "sample">("live");

  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPhase("idle");
    setResults([]);
    setApp(null);
    setReviews([]);
    setError(null);
  }

  async function scrapeApp(target: AppResult) {
    setScrapingId(target.id);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store: target.store,
          appId: target.id,
          country,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch reviews.");
      setApp(target);
      setReviews(data.reviews);
      setSource("live");
      setPhase("reviews");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch reviews.");
    } finally {
      setScrapingId(null);
    }
  }

  async function handleSearch() {
    const term = query.trim();
    if (!term) return;
    setError(null);

    // Pasted a store URL? Skip search and scrape that app directly.
    const parsed = parseStoreUrl(term);
    if (parsed) {
      const target: AppResult = {
        id: parsed.id,
        title: titleFromUrl(parsed.store, parsed.id, term),
        developer: "",
        icon: "",
        url: term,
        store: parsed.store,
      };
      setStore(parsed.store);
      if (parsed.country) setCountry(parsed.country);
      await scrapeApp(target);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, term, country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setResults(data.results);
      setPhase("results");
      if (data.results.length === 0) {
        setError("No apps matched that search. Try a different name.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
      setResults([]);
      setPhase("results");
    } finally {
      setSearching(false);
    }
  }

  function loadSample() {
    setError(null);
    setApp(SAMPLE_APP);
    setReviews(SAMPLE_REVIEWS);
    setSource("sample");
    setPhase("reviews");
  }

  function handleDownload() {
    if (!app) return;
    const csv = reviewsToCsv(reviews);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename(app.title, app.store);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Control card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        {/* Store toggle */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Store
          </label>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {STORES.map(({ id, label, Icon }) => {
              const active = store === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setStore(id);
                    if (phase === "results") reset();
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search + country */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="App name (e.g. Instagram) or a store URL"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? (
              <>
                <SpinnerIcon className="h-5 w-5" />
                Searching
              </>
            ) : (
              "Search"
            )}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Tip: paste a full App Store or Google Play link to skip straight to its
          reviews. Or{" "}
          <button
            onClick={loadSample}
            className="font-medium text-brand-600 underline-offset-2 hover:underline"
          >
            load sample data
          </button>{" "}
          to see how it works.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="animate-fade-up rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* Search results */}
      {phase === "results" && results.length > 0 && (
        <div className="animate-fade-up space-y-3">
          <p className="text-sm font-medium text-slate-500">
            {results.length} result{results.length === 1 ? "" : "s"} — pick an app
            to scrape its reviews
          </p>
          <div className="grid gap-3">
            {results.map((r) => (
              <AppCard
                key={r.id}
                app={r}
                loading={scrapingId === r.id}
                onSelect={scrapeApp}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {phase === "reviews" && app && (
        <div className="space-y-3">
          <button
            onClick={reset}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← New search
          </button>
          <ReviewsTable
            reviews={reviews}
            appTitle={app.title}
            store={app.store}
            source={source}
            onDownload={handleDownload}
          />
        </div>
      )}
    </div>
  );
}
