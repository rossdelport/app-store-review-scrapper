import type { Review, Store } from "@/lib/types";
import { STORE_LABELS } from "@/lib/types";
import StarRating from "./StarRating";
import { DownloadIcon } from "./icons";

interface ReviewsTableProps {
  reviews: Review[];
  appTitle: string;
  store: Store;
  source: "live" | "sample";
  onDownload: () => void;
}

export default function ReviewsTable({
  reviews,
  appTitle,
  store,
  source,
  onDownload,
}: ReviewsTableProps) {
  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);

  return (
    <section className="animate-fade-up rounded-2xl border border-slate-200 bg-white shadow-card">
      {/* Header / toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-slate-900">
              {appTitle}
            </h2>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {STORE_LABELS[store]}
            </span>
            {source === "sample" && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                sample data
              </span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{reviews.length}</span>{" "}
            reviews
            <span className="text-slate-300">•</span>
            <StarRating rating={avg} showValue />
          </p>
        </div>

        <button
          onClick={onDownload}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <DownloadIcon className="h-4 w-4" />
          Download CSV
        </button>
      </div>

      {/* Table */}
      <div className="scroll-thin max-h-[60vh] overflow-y-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="w-28 px-4 py-3 sm:px-5">Rating</th>
              <th className="px-4 py-3 sm:px-5">Review</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r, i) => (
              <tr
                key={r.id}
                className={i % 2 ? "bg-slate-50/40" : "bg-white"}
              >
                <td className="whitespace-nowrap px-4 py-3 align-top sm:px-5">
                  <StarRating rating={r.rating} />
                  <span className="ml-1 text-xs font-medium text-slate-400">
                    {r.rating}
                  </span>
                </td>
                <td className="px-4 py-3 align-top leading-relaxed text-slate-700 sm:px-5">
                  {r.text}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
