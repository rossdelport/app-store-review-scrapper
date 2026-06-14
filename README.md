# Review Scout

Scrape **App Store** and **Google Play** reviews into a clean CSV — or browse
them right in the app. Search any app by name (or paste a store URL), pick the
country storefront, and export the **star rating + review text** for every
review.

![Review Scout](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## What it does

- 🔎 **Search** the App Store or Google Play by app name, or paste a store URL.
- ⭐ **Scrape** each review's star rating and full text.
- 📊 **View** the results in a sortable, scrollable table with a rating summary.
- 📥 **Export** to CSV (two columns: `rating`, `review`) with one click.
- 🌍 **Per-country** storefronts (US, UK, DE, JP, …).
- 🧪 **Sample mode** — load demo data to try the UI with no network access.

## Tech stack

- [Next.js 14](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS for the UI
- [`google-play-scraper`](https://www.npmjs.com/package/google-play-scraper) for Google Play
- Apple's public **iTunes Search API** + **customer-reviews RSS feed** for the App Store

The scraping runs server-side in Node route handlers (`app/api/*`), so the
store endpoints are never called from the browser.

## Getting started

```bash
npm install
npm run dev
# open http://localhost:3000
```

Build for production:

```bash
npm run build
npm start
```

## How scraping works

| Store | Search | Reviews |
| ----- | ------ | ------- |
| App Store | iTunes Search API (`/search`) | Customer-reviews RSS feed (JSON), pages 1–5 |
| Google Play | `google-play-scraper` `search()` | `google-play-scraper` `reviews()` (newest, up to ~150) |

Only the **star rating** and **review text** are kept — that's all that lands
in the table and the CSV.

## Deploying & the "No reviews found" gotcha

The store endpoints must be reachable from wherever the app runs, **and the
host's IP must not be blocked by the store.** This is the #1 source of
confusion when deploying to a shared cloud platform.

**Why "No reviews found" can happen on Vercel/serverless even though it works
locally:** Apple and Google aggressively rate-limit and block requests coming
from datacenter IP ranges. The App Store *search* and Google Play *search*
endpoints usually still respond, but the **review** endpoints often don't:

- **Google Play** review data comes from a `batchexecute` RPC. When that IP is
  throttled, Google returns an empty body and `google-play-scraper` resolves to
  an **empty array** (it doesn't throw). The app reports "No reviews found".
- **Apple's** review RSS feed may return `403`/empty from datacenter IPs.

This is **not** a bug in the parser — it's the store declining to serve a
flagged IP.

### How to confirm what's happening

- Add `?debug=1` to the request, or check your host's function logs. Each call
  logs `[reviews] store=… appId=… country=… -> N reviews`. `N = 0` with no
  error means the store returned nothing (an IP block/throttle), not a crash.
- Try the **App Store** tab — its RSS feed is often reachable from clouds even
  when Google Play isn't.

### Ways to make it work in production

1. **Run from a non-datacenter IP** — your own machine or a VPS whose IP isn't
   flagged. This is the simplest reliable option.
2. **Route store requests through a residential/rotating proxy.** (Hook this in
   at the `fetch` call in `lib/scrapers/appStore.ts` and via `requestOptions`
   in `lib/scrapers/googlePlay.ts`.)
3. Use **Load sample data** to demo the UI with no network at all.

Be mindful of each store's terms of service and rate limits, and scrape
responsibly.

## Project layout

```
app/
  page.tsx              landing + scraper UI
  api/search/route.ts   POST { store, term, country } -> matching apps
  api/reviews/route.ts  POST { store, appId, country } -> reviews
components/             React UI (Scraper, ReviewsTable, AppCard, …)
lib/
  scrapers/             appStore.ts, googlePlay.ts
  csv.ts                rating,review CSV export
  parseUrl.ts           store-URL detection
  sample.ts             demo data
  countries.ts          supported storefronts
```

## Roadmap

This is the core scraper tool. Designed so the next steps slot in cleanly:

- User accounts + saved scrape history (Supabase)
- Background jobs for large apps (full pagination)
- Billing / usage tiers (Stripe)
