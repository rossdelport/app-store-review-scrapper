"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppResult, Store } from "@/lib/types";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/countries";
import { createClient } from "@/lib/supabase/client";
import { AppleIcon, PlayIcon, SearchIcon, SpinnerIcon, CloseIcon } from "@/components/icons";
import AppCard from "@/components/AppCard";

const selKey = (a: AppResult) => `${a.store}:${a.id}`;

export default function NewProjectForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");

  const [term, setTerm] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [appStore, setAppStore] = useState<AppResult[]>([]);
  const [googlePlay, setGooglePlay] = useState<AppResult[]>([]);

  const [selected, setSelected] = useState<Map<string, AppResult>>(new Map());
  const [targetKey, setTargetKey] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalResults = appStore.length + googlePlay.length;
  const selectedArr = Array.from(selected.values());
  const effectiveTarget = targetKey ?? (selectedArr[0] ? selKey(selectedArr[0]) : null);

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
    setSearching(true);
    setSearchError(null);
    setAppStore([]);
    setGooglePlay([]);
    const [as, gp] = await Promise.allSettled([searchStore("appstore", q), searchStore("googleplay", q)]);
    if (as.status === "fulfilled") setAppStore(as.value);
    if (gp.status === "fulfilled") setGooglePlay(gp.value);
    if (as.status === "rejected" && gp.status === "rejected") {
      setSearchError((as.reason as Error)?.message || "Search failed — check the server's network access.");
    }
    setSearching(false);
  }

  function toggle(a: AppResult) {
    setSelected((prev) => {
      const next = new Map(prev);
      const k = selKey(a);
      if (next.has(k)) {
        next.delete(k);
        if (targetKey === k) setTargetKey(null);
      } else {
        next.set(k, a);
      }
      return next;
    });
  }

  async function create() {
    setError(null);
    if (!name.trim()) {
      setError("Give your project a name.");
      return;
    }
    if (selected.size === 0) {
      setError("Select at least the target app.");
      return;
    }
    setCreating(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You're not signed in.");

      const { data: project, error: e1 } = await supabase
        .from("projects")
        .insert({ user_id: user.id, name: name.trim(), niche: niche.trim() || null })
        .select("id")
        .single();
      if (e1) throw e1;

      const rows = selectedArr.map((a) => ({
        project_id: project.id,
        store: a.store,
        app_id: a.id,
        title: a.title,
        developer: a.developer ?? null,
        icon: a.icon ?? null,
        url: a.url ?? null,
        score: a.score ?? null,
        rating_count: a.ratingCount ?? null,
        is_target: selKey(a) === effectiveTarget,
      }));
      const { error: e2 } = await supabase.from("project_apps").insert(rows);
      if (e2) throw e2;

      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the project.");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Project meta */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">Project name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Habit trackers"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">
            Niche / notes <span className="text-slate-400">(optional)</span>
          </label>
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. minimalist daily habit apps"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search an app title (e.g. Streaks)"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            disabled={searching || !term.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {searching ? (
              <>
                <SpinnerIcon className="h-5 w-5" /> Searching
              </>
            ) : (
              "Search"
            )}
          </button>
        </div>

        {searchError && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{searchError}</div>
        )}

        {totalResults > 0 && (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <StoreColumn store="appstore" results={appStore} selected={selected} onToggle={toggle} />
            <StoreColumn store="googleplay" results={googlePlay} selected={selected} onToggle={toggle} />
          </div>
        )}
      </div>

      {/* Sticky selected bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Selected ({selected.size}) — pick the target (the app you want to beat)
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedArr.map((a) => {
                    const k = selKey(a);
                    const isTarget = k === effectiveTarget;
                    return (
                      <span
                        key={k}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                          isTarget ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <button
                          onClick={() => setTargetKey(k)}
                          title="Set as target"
                          className={isTarget ? "font-semibold" : "hover:underline"}
                        >
                          {isTarget ? "★ " : "☆ "}
                          {a.title}
                        </button>
                        <button onClick={() => toggle(a)} className="opacity-60 hover:opacity-100">
                          <CloseIcon className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {error && <span className="text-sm text-red-600">{error}</span>}
                <button
                  onClick={create}
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  {creating ? (
                    <>
                      <SpinnerIcon className="h-4 w-4" /> Creating…
                    </>
                  ) : (
                    "Create project"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StoreColumn({
  store,
  results,
  selected,
  onToggle,
}: {
  store: Store;
  results: AppResult[];
  selected: Map<string, AppResult>;
  onToggle: (a: AppResult) => void;
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
        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
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
