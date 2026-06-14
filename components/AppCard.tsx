/* eslint-disable @next/next/no-img-element */
import type { AppResult } from "@/lib/types";
import StarRating from "./StarRating";
import { SpinnerIcon } from "./icons";

interface AppCardProps {
  app: AppResult;
  loading?: boolean;
  onSelect: (app: AppResult) => void;
}

export default function AppCard({ app, loading, onSelect }: AppCardProps) {
  return (
    <button
      onClick={() => onSelect(app)}
      disabled={loading}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:shadow-card disabled:opacity-60"
    >
      {app.icon ? (
        <img
          src={app.icon}
          alt=""
          className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
        />
      ) : (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400">
          {app.title.charAt(0)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{app.title}</p>
        <p className="truncate text-sm text-slate-500">{app.developer}</p>
        {typeof app.score === "number" && app.score > 0 && (
          <div className="mt-0.5">
            <StarRating rating={app.score} size={12} showValue />
          </div>
        )}
      </div>

      <span className="shrink-0 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 transition group-hover:bg-brand-100">
        {loading ? (
          <SpinnerIcon className="h-4 w-4 text-brand-600" />
        ) : (
          "Get reviews"
        )}
      </span>
    </button>
  );
}
