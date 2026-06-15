"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { parseFile, isSupportedReviewFile } from "@/lib/analyze/parseFile";
import type { AnalysisResult, ParsedReview } from "@/lib/analyze/types";
import type { AnalysisRow, Project, ProjectApp } from "@/lib/db/types";
import AnalysisColumns from "@/components/analyze/AnalysisColumns";
import PromptModal from "@/components/analyze/PromptModal";
import ScrapePanel from "@/components/projects/ScrapePanel";
import { AppleIcon, PlayIcon, SpinnerIcon } from "@/components/icons";

const REVIEW_PAGE = 1000;
const REVIEW_CAP = 12000; // analysis samples down to ~9.6k anyway
const INSERT_BATCH = 500;

export default function ProjectDetail({
  project,
  apps,
  initialReviewCount,
  initialAnalysis,
  initialPrompt,
}: {
  project: Project;
  apps: ProjectApp[];
  initialReviewCount: number;
  initialAnalysis: AnalysisRow | null;
  initialPrompt: string | null;
}) {
  const [reviewCount, setReviewCount] = useState(initialReviewCount);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(initialAnalysis?.result ?? null);
  const [analyzedCount, setAnalyzedCount] = useState(initialAnalysis?.analyzed_count ?? 0);
  const [prompt, setPrompt] = useState<string | null>(initialPrompt);
  const [showPrompt, setShowPrompt] = useState(false);

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const target = apps.find((a) => a.is_target) ?? apps[0];
  const competitors = apps.filter((a) => a !== target);

  function touch(supabase: ReturnType<typeof createClient>) {
    return supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", project.id);
  }

  async function refreshReviewCount() {
    const supabase = createClient();
    const { count } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id);
    if (typeof count === "number") setReviewCount(count);
  }

  // ---- populate reviews via upload -----------------------------------------
  async function addFiles(list: FileList | File[]) {
    setError(null);
    const incoming = Array.from(list).filter(isSupportedReviewFile);
    if (incoming.length === 0) return;
    setUploading(true);
    try {
      const parsed: ParsedReview[] = [];
      for (const f of incoming) {
        try {
          parsed.push(...(await parseFile(f)));
        } catch {
          /* skip unreadable file */
        }
      }
      if (parsed.length === 0) {
        setError("Couldn't read any reviews from those files. Upload CSV or Excel (.xlsx) exports with a review/text column.");
        return;
      }
      const supabase = createClient();
      for (let i = 0; i < parsed.length; i += INSERT_BATCH) {
        const chunk = parsed.slice(i, i + INSERT_BATCH).map((r) => ({
          project_id: project.id,
          store: r.store ?? null,
          app_title: r.app ?? null,
          country: r.country ?? null,
          rating: r.rating ?? null,
          text: r.text,
          source: "upload",
        }));
        const { error: e } = await supabase.from("reviews").insert(chunk);
        if (e) throw e;
      }
      await touch(supabase);
      setReviewCount((n) => n + parsed.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function fetchAllReviews(supabase: ReturnType<typeof createClient>): Promise<ParsedReview[]> {
    const out: ParsedReview[] = [];
    for (let from = 0; from < REVIEW_CAP; from += REVIEW_PAGE) {
      const { data, error: e } = await supabase
        .from("reviews")
        .select("text,rating,app_title,store,country")
        .eq("project_id", project.id)
        .range(from, from + REVIEW_PAGE - 1);
      if (e) throw e;
      if (!data || data.length === 0) break;
      for (const r of data) {
        out.push({
          text: r.text as string,
          rating: (r.rating as number | null) ?? undefined,
          app: (r.app_title as string | null) ?? undefined,
          store: (r.store as string | null) ?? undefined,
          country: (r.country as string | null) ?? undefined,
        });
      }
      if (data.length < REVIEW_PAGE) break;
    }
    return out;
  }

  // ---- analyze -------------------------------------------------------------
  async function analyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const supabase = createClient();
      const reviews = await fetchAllReviews(supabase);
      if (reviews.length === 0) throw new Error("No reviews yet — upload some first.");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews, appName: project.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      const { error: e } = await supabase.from("analyses").insert({
        project_id: project.id,
        result: data.analysis,
        review_count: data.reviewCount ?? reviews.length,
        analyzed_count: data.analyzed ?? reviews.length,
        model: data.model ?? null,
      });
      if (e) throw e;
      await touch(supabase);
      setAnalysis(data.analysis);
      setAnalyzedCount(data.analyzed ?? reviews.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  // ---- generate build spec -------------------------------------------------
  async function generate() {
    if (!analysis) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, appName: project.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prompt generation failed.");
      const supabase = createClient();
      const { error: e } = await supabase.from("prompts").insert({ project_id: project.id, content: data.prompt });
      if (e) throw e;
      await touch(supabase);
      setPrompt(data.prompt);
      setShowPrompt(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prompt generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-900">
        ← Projects
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{project.name}</h1>
          {project.niche && <p className="mt-0.5 text-sm text-slate-500">{project.niche}</p>}
        </div>
      </div>

      {/* Apps */}
      <div className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Apps in this project</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                a.is_target ? "border-slate-900 bg-slate-900/[0.03]" : "border-slate-200 bg-white"
              }`}
            >
              {a.icon ? (
                <img src={a.icon} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-400">
                  {a.title.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {a.store === "appstore" ? (
                    <AppleIcon className="h-3.5 w-3.5 text-slate-700" />
                  ) : (
                    <PlayIcon className="h-3.5 w-3.5" />
                  )}
                  <p className="truncate text-sm font-medium text-slate-900">{a.title}</p>
                </div>
                <p className="truncate text-xs text-slate-400">{a.developer}</p>
              </div>
              {a.is_target && (
                <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Target
                </span>
              )}
            </div>
          ))}
        </div>
        {competitors.length === 0 && (
          <p className="mt-2 text-xs text-slate-400">Tip: more competitor apps → richer market-gap analysis.</p>
        )}
      </div>

      {/* Reviews */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Reviews</h2>
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{reviewCount.toLocaleString()}</span> reviews collected
            </p>
          </div>
          <button
            onClick={analyze}
            disabled={analyzing || reviewCount === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {analyzing ? (
              <>
                <SpinnerIcon className="h-4 w-4" /> Analyzing…
              </>
            ) : analysis ? (
              "Re-analyze"
            ) : (
              "Analyze reviews"
            )}
          </button>
        </div>

        <div className="mt-4">
          <ScrapePanel projectId={project.id} apps={apps} onChange={refreshReviewCount} />
        </div>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-100" /> or upload exports <span className="h-px flex-1 bg-slate-100" />
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center transition ${
            dragging ? "border-slate-900 bg-slate-50" : "border-slate-200"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <p className="text-sm text-slate-600">Drag &amp; drop review files (CSV or Excel) here, or</p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {uploading ? (
              <>
                <SpinnerIcon className="h-4 w-4" /> Saving…
              </>
            ) : (
              "Upload reviews"
            )}
          </button>
          <p className="mt-2 text-xs text-slate-400">
            Already have exports? Drop in CSV/xlsx (e.g. ReviewMaxxing) to add them to this project.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      {/* Analysis */}
      {analysis && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm text-slate-500">
              Analysis of <span className="font-semibold text-slate-800">{analyzedCount.toLocaleString()}</span> reviews
            </h2>
            <div className="flex items-center gap-2">
              {prompt && (
                <button
                  onClick={() => setShowPrompt(true)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  View build spec
                </button>
              )}
              <button
                onClick={generate}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {generating ? (
                  <>
                    <SpinnerIcon className="h-4 w-4" /> Generating…
                  </>
                ) : prompt ? (
                  "Regenerate build prompt"
                ) : (
                  "Generate app-building prompt"
                )}
              </button>
            </div>
          </div>
          <AnalysisColumns analysis={analysis} />
        </div>
      )}

      {showPrompt && prompt && (
        <PromptModal prompt={prompt} filenameBase={project.name} onClose={() => setShowPrompt(false)} />
      )}
    </section>
  );
}
