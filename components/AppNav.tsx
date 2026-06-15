import Link from "next/link";

function Logo() {
  return (
    <Link href="/projects" aria-label="Review Scout" className="flex items-center gap-2 rounded-lg transition hover:opacity-80">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2l2.9 6.26L21.5 9l-5 4.6L18 21l-6-3.5L6 21l1.5-7.4-5-4.6 6.6-.74L12 2z" />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-slate-900">Review Scout</span>
    </Link>
  );
}

/** Shared header for the signed-in SaaS area. Pass the user's email to show the
 *  account + sign-out control; omit it for signed-out pages. */
export default function AppNav({ email }: { email?: string | null }) {
  return (
    <header className="border-b border-slate-200/70 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <Link href="/projects" className="hover:text-slate-900">Projects</Link>
          <Link href="/" className="hidden hover:text-slate-900 sm:inline">Scraper</Link>
          {email ? (
            <form action="/auth/signout" method="post" className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-400 sm:inline">{email}</span>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
