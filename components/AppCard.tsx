/* eslint-disable @next/next/no-img-element */
import type { AppResult } from "@/lib/types";
import { compactNumber, relativeAge } from "@/lib/format";
import { CheckIcon, InfoIcon } from "./icons";

interface AppCardProps {
  app: AppResult;
  rank: number;
  selected: boolean;
  onToggle: (app: AppResult) => void;
}

export default function AppCard({ app, rank, selected, onToggle }: AppCardProps) {
  const age = relativeAge(app.released);
  return (
    <button
      onClick={() => onToggle(app)}
      aria-pressed={selected}
      className={`group relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
        selected
          ? "border-slate-900 bg-slate-900/[0.04] ring-1 ring-slate-900"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {/* selection check */}
      <span
        className={`absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-md border transition ${
          selected
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-300 bg-white text-transparent group-hover:border-slate-400"
        }`}
      >
        <CheckIcon className="h-3 w-3" />
      </span>

      {app.icon ? (
        <img src={app.icon} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" />
      ) : (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-base font-semibold text-slate-400">
          {app.title.charAt(0)}
        </div>
      )}

      <div className="min-w-0 flex-1 pr-5">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-slate-900">{app.title}</p>
          <span className="shrink-0 text-[11px] font-medium text-slate-400">#{rank}</span>
          <InfoIcon className="h-3.5 w-3.5 shrink-0 text-slate-300" />
        </div>
        <p className="truncate text-xs text-slate-500">{app.developer}</p>
        {app.genre && <p className="truncate text-xs text-slate-400">{app.genre}</p>}

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          {typeof app.score === "number" && app.score > 0 && (
            <span className="inline-flex items-center gap-0.5 font-medium text-slate-700">
              <span className="text-amber-500">★</span>
              {app.score.toFixed(1)}
              {app.ratingCount ? (
                <span className="font-normal text-slate-400">({compactNumber(app.ratingCount)})</span>
              ) : null}
            </span>
          )}
          {app.installs && <span className="text-slate-400">↓ {app.installs}</span>}
          {(app.free ?? app.price === "Free") ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">Free</span>
          ) : app.price ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{app.price}</span>
          ) : null}
          {age && <span className="text-slate-400">{age}</span>}
        </div>
      </div>
    </button>
  );
}
