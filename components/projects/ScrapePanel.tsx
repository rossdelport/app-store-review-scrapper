"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES } from "@/lib/countries";
import type { ProjectApp } from "@/lib/db/types";
import { SpinnerIcon } from "@/components/icons";

const DEPTH = 2000; // target reviews per app per country
const PAGE = 200; // page window per request (keeps each call under the timeout)

const PICKABLE = COUNTRIES.filter((c) => c.tier === 1); // 15 developed storefronts

export default function ScrapePanel({
  projectId,
  apps,
  onChange,
}: {
  projectId: string;
  apps: ProjectApp[];
  onChange: () => void;
}) {
  const [countries, setCountries] = useState<string[]>(["us"]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ app: string; country: string; collected: number } | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function toggleCountry(code: string) {
    setCountries((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function appleToken(): Promise<string | undefined> {
    const appleApp = apps.find((a) => a.store === "appstore");
    if (!appleApp) return undefined;
    try {
      const r = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: "us", appId: appleApp.app_id }),
      });
      const d = await r.json();
      return r.ok && d.token ? (d.token as string) : undefined;
    } catch {
      return undefined;
    }
  }

  async function scrape() {
    if (apps.length === 0 || countries.length === 0 || running) return;
    setRunning(true);
    setError(null);
    setTotal(0);
    const supabase = createClient();
    const token = await appleToken();
    let grand = 0;

    try {
      for (const app of apps) {
        for (const country of countries) {
          setProgress({ app: app.title, country, collected: 0 });
          // Idempotent: clear any previous scrape for this app+country, then refill.
          await supabase
            .from("reviews")
            .delete()
            .eq("project_id", projectId)
            .eq("app_id", app.app_id)
            .eq("country", country)
            .eq("source", "scrape");

          let cursor: string | null = null;
          let collected = 0;
          do {
            const res: Response = await fetch("/api/reviews", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                store: app.store,
                appId: app.app_id,
                country,
                max: PAGE,
                token: app.store === "appstore" ? token : undefined,
                cursor,
              }),
            });
            if (res.status === 404) break; // no reviews for this storefront — fine
            if (!res.ok) {
              const d: { error?: string } = await res.json().catch(() => ({}));
              setError(`${app.title} (${country.toUpperCase()}): ${d.error || `HTTP ${res.status}`}`);
              break;
            }
            const data: { reviews?: { rating: number; text: string }[]; nextCursor?: string | null } =
              await res.json();
            const reviews = data.reviews || [];
            if (reviews.length > 0) {
              const rows = reviews.map((rv) => ({
                project_id: projectId,
                store: app.store,
                app_id: app.app_id,
                app_title: app.title,
                country,
                rating: rv.rating ?? null,
                text: rv.text,
                source: "scrape",
              }));
              const { error: e } = await supabase.from("reviews").insert(rows);
              if (e) {
                setError(e.message);
                break;
              }
              collected += reviews.length;
              grand += reviews.length;
              setProgress({ app: app.title, country, collected });
              setTotal(grand);
            }
            cursor = data.nextCursor ?? null;
          } while (cursor && collected < DEPTH);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scrape failed.");
    } finally {
      setProgress(null);
      setRunning(false);
      onChange();
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Scrape reviews</h3>
          <p className="text-xs text-slate-500">Pull up to {DEPTH.toLocaleString()} reviews per app, per storefront.</p>
        </div>
        <button
          onClick={scrape}
          disabled={running || apps.length === 0 || countries.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          {running ? (
            <>
              <SpinnerIcon className="h-4 w-4" /> Scraping…
            </>
          ) : (
            "Scrape now"
          )}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PICKABLE.map((c) => {
          const on = countries.includes(c.code);
          return (
            <button
              key={c.code}
              onClick={() => toggleCountry(c.code)}
              disabled={running}
              className={`rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-50 ${
                on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {c.code.toUpperCase()}
            </button>
          );
        })}
      </div>

      {running && progress && (
        <p className="mt-3 text-xs text-slate-500">
          {progress.app} · {progress.country.toUpperCase()} — {progress.collected.toLocaleString()} pulled
          {total > 0 && <span className="text-slate-400"> · {total.toLocaleString()} total this run</span>}
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {error}
          <p className="mt-1 text-amber-700">
            On the deployed site, stores block datacenter IPs — set <code className="rounded bg-amber-100 px-1">SCRAPER_PROXY_URL</code> on Vercel.
          </p>
        </div>
      )}
    </div>
  );
}
