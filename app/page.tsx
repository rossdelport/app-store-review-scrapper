import Scraper from "@/components/Scraper";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2l2.9 6.26L21.5 9l-5 4.6L18 21l-6-3.5L6 21l1.5-7.4-5-4.6 6.6-.74L12 2z" />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        Review Scout
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <a
            href="https://github.com/rossdelport/app-store-review-scrapper"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            GitHub ↗
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-64 bg-gradient-to-b from-brand-100/60 to-transparent blur-2xl"
        />
        <div className="mx-auto max-w-4xl px-4 pb-6 pt-12 text-center sm:px-6 sm:pt-16">
          <span className="inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            App Store &amp; Google Play
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Scrape app reviews into a clean{" "}
            <span className="bg-gradient-to-r from-brand-600 to-violet-500 bg-clip-text text-transparent">
              CSV
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-500 sm:text-lg">
            Search any app, pull its star ratings and review text, view them
            right here, then export — all in a few seconds.
          </p>
        </div>
      </section>

      {/* App */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <Scraper />
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 py-8">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-slate-400 sm:px-6">
          Review Scout · Reviews are scraped from public store data for the
          country you select.
        </div>
      </footer>
    </main>
  );
}
