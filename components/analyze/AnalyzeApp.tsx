"use client";

import { useRef, useState } from "react";
import { parseFile, isSupportedReviewFile } from "@/lib/analyze/parseFile";
import type { AnalysisResult, ParsedReview } from "@/lib/analyze/types";
import { SpinnerIcon, CloseIcon } from "@/components/icons";
import AnalysisColumns from "@/components/analyze/AnalysisColumns";
import PromptModal from "@/components/analyze/PromptModal";

interface UploadedFile {
  name: string;
  reviews: ParsedReview[];
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

  const inputRef = useRef<HTMLInputElement>(null);

  const totalReviews = files.reduce((s, f) => s + f.reviews.length, 0);

  async function addFiles(list: FileList | File[]) {
    setError(null);
    const incoming = Array.from(list).filter(isSupportedReviewFile);
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

          <AnalysisColumns analysis={analysis} />
        </div>
      )}

      {/* Generated prompt modal */}
      {prompt && (
        <PromptModal prompt={prompt} filenameBase={appName || "app"} onClose={() => setPrompt(null)} />
      )}
    </div>
  );
}
