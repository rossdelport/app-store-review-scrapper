"use client";

import { useRef, useState } from "react";
import { parseReviewsCsv, rowsToReviews } from "@/lib/analyze/csv";
import type { AnalysisResult, Bucket, ParsedReview } from "@/lib/analyze/types";
import { BUCKET_META } from "@/lib/analyze/types";
import { SpinnerIcon, DownloadIcon, CloseIcon, CheckIcon } from "@/components/icons";

interface UploadedFile {
  name: string;
  reviews: ParsedReview[];
}

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

// Excel (.xlsx). The legacy binary .xls format isn't supported by the parser.
const EXCEL_RE = /\.xlsx$/i;

/** Read one uploaded file into review rows — CSV/TXT directly, or .xlsx by
 *  pulling the first sheet's rows through the same column-detection logic.
 *  The Excel parser is loaded on demand so it stays out of the initial bundle. */
async function parseFile(file: File): Promise<ParsedReview[]> {
  if (EXCEL_RE.test(file.name)) {
    const { default: readXlsxFile } = await import("read-excel-file");
    const rows = await readXlsxFile(file);
    const asStrings = rows.map((row) =>
      row.map((cell) => (cell == null ? "" : String(cell))),
    );
    return rowsToReviews(asStrings);
  }
  return parseReviewsCsv(await file.text());
}

export default function AnalyzeApp() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [appName, setAppName] = useState("");
  const [dragging, setDragging] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const totalReviews = files.reduce((s, f) => s + f.reviews.length, 0);

  async function addFiles(list: FileList | File[]) {
    setError(null);
    const incoming = Array.from(list).filter(
      (f) => /\.(csv|txt|xlsx)$/i.test(f.name) || /(csv|excel|spreadsheet)/i.test(f.type),
    );
    const parsed: UploadedFile[] = [];
    for (const f of incoming) {
      try {
        const reviews = await parseFile(f);
        if (reviews.length > 0) parsed.push({ name: f.name, reviews });
      } catch {
        /* skip unreadable file */
      }
    }
    if (parsed.length === 0) {
      setError("Couldn't read any reviews from those files. Upload CSV or Excel (.xlsx) exports with a review/text column.");
      return;
    }
    setFiles((prev) => {
      const names = new Set(prev.map((p) => p.name));
      return [...prev, ...parsed.filter((p) => !names.has(p.name))];
    });
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function analyze() {
    if (totalReviews === 0) return;
    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setPrompt(null);
    try {
      const reviews = files.flatMap((f) => f.reviews);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews, appName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setAnalysis(data.analysis);
      setAnalyzedCount(data.analyzed ?? reviews.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function generatePrompt() {
    if (!analysis) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, appName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prompt generation failed.");
      setPrompt(data.prompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prompt generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function copyPrompt() {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadPrompt() {
    if (!prompt) return;
    const blob = new Blob([prompt], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(appName || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "app"}-build-spec.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function startOver() {
    setFiles([]);
    setAnalysis(null);
    setPrompt(null);
    setError(null);
    setAnalyzedCount(0);
  }

  return (
    <div className="space-y-6">
      {/* App name */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-sm font-medium text-slate-600 sm:w-44">
          App name / concept <span className="text-slate-400">(optional)</span>
        </label>
        <input
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="e.g. a clean book-tracking app"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      {/* Upload zone */}
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
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
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
        <p className="text-sm text-slate-600">
          Drag &amp; drop your downloaded review files (CSV or Excel) here, or
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {files.length ? "Add more files" : "Choose files"}
        </button>
        <p className="mt-2 text-xs text-slate-400">
          Works with ReviewMaxxing exports, our CSV, Excel (.xlsx), or any CSV with a review/rating column.
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{f.name}</p>
                <p className="text-xs text-slate-400">{f.reviews.length.toLocaleString()} reviews</p>
              </div>
              <button
                onClick={() => removeFile(f.name)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{totalReviews.toLocaleString()}</span> reviews across{" "}
              {files.length} file{files.length === 1 ? "" : "s"}
            </p>
            <button
              onClick={analyze}
              disabled={analyzing || totalReviews === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {analyzing ? (
                <>
                  <SpinnerIcon className="h-4 w-4" /> Analyzing…
                </>
              ) : (
                "Analyze now"
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      {analyzing && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          <SpinnerIcon className="mx-auto mb-2 h-6 w-6 text-slate-400" />
          Reading the reviews and clustering them into Love / Want Added / Don&apos;t Need…
          <p className="mt-1 text-xs text-slate-400">This can take up to a minute for large sets.</p>
        </div>
      )}

      {/* Columns */}
      {analysis && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Analysis of <span className="font-semibold text-slate-800">{analyzedCount.toLocaleString()}</span> reviews
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={startOver}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Start over
              </button>
              <button
                onClick={generatePrompt}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {generating ? (
                  <>
                    <SpinnerIcon className="h-4 w-4" /> Generating…
                  </>
                ) : (
                  "Generate prompt + context"
                )}
              </button>
            </div>
          </div>

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
        </div>
      )}

      {/* Generated prompt modal */}
      {prompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setPrompt(null)} />
          <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Build spec for Claude Code</h2>
                <p className="text-xs text-slate-400">{prompt.length.toLocaleString()} characters — paste this into Claude Code</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyPrompt}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {copied ? <CheckIcon className="h-4 w-4" /> : null}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={downloadPrompt}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <DownloadIcon className="h-4 w-4" /> .md
                </button>
                <button onClick={() => setPrompt(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <pre className="scroll-thin overflow-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-slate-800">
              {prompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
