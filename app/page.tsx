import Scraper from "@/components/Scraper";

function Logo() {
  return (
    <a href="/" aria-label="Review Scout home" className="flex items-center gap-2 rounded-lg transition hover:opacity-80">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2l2.9 6.26L21.5 9l-5 4.6L18 21l-6-3.5L6 21l1.5-7.4-5-4.6 6.6-.74L12 2z" />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-slate-900">Review Scout</span>
    </a>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-500">
            <a href="/projects" className="hover:text-slate-900">
              Projects
            </a>
            <a href="/analyze" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800">
              Analyze reviews
            </a>
            <a href="https://github.com/rossdelport/app-store-review-scrapper" target="_blank" rel="noreferrer" className="hidden hover:text-slate-900 sm:inline">
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-4 pt-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Scrape App Store &amp; Google Play reviews into one CSV
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-500 sm:text-base">
          Search a title, pick apps from both stores, choose your markets, and batch-scrape every
          rating + review into a single download.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <Scraper />
      </section>
    </main>
  );
}
