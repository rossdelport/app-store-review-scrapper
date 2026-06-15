import type { AnalysisResult, Bucket } from "@/lib/analyze/types";
import { BUCKET_META } from "@/lib/analyze/types";

const ACCENT: Record<string, { head: string; chip: string; card: string }> = {
  emerald: {
    head: "text-emerald-700",
    chip: "bg-emerald-100 text-emerald-700",
    card: "border-emerald-200",
  },
  blue: {
    head: "text-blue-700",
    chip: "bg-blue-100 text-blue-700",
    card: "border-blue-200",
  },
  slate: {
    head: "text-slate-600",
    chip: "bg-slate-200 text-slate-600",
    card: "border-slate-200",
  },
};

/** The Love / Want Added / Don't Need three-column analysis view, shared by the
 *  standalone /analyze page and the persisted project detail page. */
export default function AnalysisColumns({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {(Object.keys(BUCKET_META) as Bucket[]).map((bucket) => {
        const meta = BUCKET_META[bucket];
        const accent = ACCENT[meta.accent];
        const items = analysis[bucket] || [];
        return (
          <section key={bucket} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h3 className={`text-sm font-bold uppercase tracking-wide ${accent.head}`}>{meta.label}</h3>
              <p className="text-xs text-slate-400">{meta.blurb}</p>
            </div>
            <div className="space-y-3">
              {items.length === 0 && <p className="text-sm text-slate-400">Nothing notable.</p>}
              {items.map((it, i) => (
                <div key={i} className={`rounded-xl border bg-white p-3 ${accent.card}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{it.title}</p>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${accent.chip}`}>
                      {it.frequency}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{it.detail}</p>
                  {it.examples?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {it.examples.slice(0, 3).map((ex, j) => (
                        <li key={j} className="border-l-2 border-slate-200 pl-2 text-xs italic text-slate-500">
                          “{ex}”
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
