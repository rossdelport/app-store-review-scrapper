"use client";

import { useMemo, useState } from "react";
import {
  COUNTRIES,
  TIERS,
  countriesInTier,
  countryName,
  flagEmoji,
  type Tier,
} from "@/lib/countries";
import type { AppResult } from "@/lib/types";
import { STORE_LABELS } from "@/lib/types";
import { AppleIcon, PlayIcon, CloseIcon } from "./icons";

interface ConfigureModalProps {
  apps: AppResult[];
  onCancel: () => void;
  onStart: (countries: string[]) => void;
}

export default function ConfigureModal({ apps, onCancel, onStart }: ConfigureModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(countriesInTier(1).map((c) => c.code)),
  );

  const counts = useMemo(() => {
    const appstore = apps.filter((a) => a.store === "appstore").length;
    const googleplay = apps.filter((a) => a.store === "googleplay").length;
    return { appstore, googleplay };
  }, [apps]);

  function toggleCountry(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function tierFullySelected(tier: Tier) {
    return countriesInTier(tier).every((c) => selected.has(c.code));
  }

  function toggleTier(tier: Tier) {
    const codes = countriesInTier(tier).map((c) => c.code);
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = codes.every((c) => next.has(c));
      codes.forEach((c) => (allIn ? next.delete(c) : next.add(c)));
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Configure Review Scraping</h2>
          <button onClick={onCancel} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {/* selected apps */}
          <div className="mb-5 rounded-xl bg-slate-50 p-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Apps</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
              {counts.appstore > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <AppleIcon className="h-4 w-4" /> {counts.appstore} from {STORE_LABELS.appstore}
                </span>
              )}
              {counts.googleplay > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <PlayIcon className="h-4 w-4" /> {counts.googleplay} from {STORE_LABELS.googleplay}
                </span>
              )}
            </div>
          </div>

          {/* count + legend */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{selected.size}</span> countries selected
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-900" /> Tier</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Custom</span>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
            {/* quick select tiers */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Quick select</p>
              <div className="space-y-2">
                {TIERS.map((t) => {
                  const on = tierFullySelected(t.tier);
                  return (
                    <button
                      key={t.tier}
                      onClick={() => toggleTier(t.tier)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                        on ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                          on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">{t.label}</span>
                        <span className="block text-xs text-slate-500">
                          {t.desc} ({countriesInTier(t.tier).length})
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* all countries */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">All countries</p>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-7">
                {COUNTRIES.map((c) => {
                  const on = selected.has(c.code);
                  const dotTier = tierFullySelected(c.tier);
                  return (
                    <button
                      key={c.code}
                      title={countryName(c.code)}
                      onClick={() => toggleCountry(c.code)}
                      className={`relative grid aspect-square place-items-center rounded-lg border text-xl transition ${
                        on ? "border-slate-900 bg-slate-100" : "border-slate-200 opacity-50 hover:opacity-100"
                      }`}
                    >
                      <span>{flagEmoji(c.code)}</span>
                      {on && (
                        <span
                          className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                            dotTier ? "bg-slate-900" : "bg-blue-500"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onStart(Array.from(selected))}
            disabled={selected.size === 0 || apps.length === 0}
            className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            Start Scraping
          </button>
        </div>
      </div>
    </div>
  );
}
