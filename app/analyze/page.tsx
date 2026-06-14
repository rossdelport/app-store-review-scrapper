import type { Metadata } from "next";
import AnalyzeApp from "@/components/analyze/AnalyzeApp";

export const metadata: Metadata = {
  title: "Analyze reviews — Review Scout",
  description:
    "Upload downloaded reviews, cluster them into Love / Want Added / Don't Need with Claude, and generate a full build spec for your v1.0 iOS app.",
};

function Logo() {
  return (
    <a href="/" aria-label="Review Scout home" className="flex items-center gap-2 transition hover:opacity-80">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2l2.9 6.26L21.5 9l-5 4.6L18 21l-6-3.5L6 21l1.5-7.4-5-4.6 6.6-.74L12 2z" />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-slate-900">Review Scout</span>
    </a>
  );
}

export default function AnalyzePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-500">
            <a href="/" className="hover:text-slate-900">
              ← Scraper
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-4 pt-8 sm:px-6">
        <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          Powered by Claude
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Turn reviews into a build spec
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-500 sm:text-base">
          Add your downloaded review files, let Claude sort them into{" "}
          <span className="font-medium text-emerald-700">Love</span>,{" "}
          <span className="font-medium text-blue-700">Want Added</span> and{" "}
          <span className="font-medium text-slate-600">Don&apos;t Need</span>, then generate a complete,
          copy-paste prompt to build your v1.0 iOS app.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <AnalyzeApp />
      </section>
    </main>
  );
}
