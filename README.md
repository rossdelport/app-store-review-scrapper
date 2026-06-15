# Review Scout

Search a title, pick apps from **both the App Store and Google Play** at once,
choose your markets, and **batch-scrape every rating + review across many
countries into one CSV**.

![Review Scout](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## What it does

- 🔎 **Two-column search** — one query returns App Store results on the left and
  Google Play on the right, with ratings, category, price and age.
- ✅ **Multi-select** apps across both stores.
- 🌍 **Country tiers** — pick Tier 1 (Developed), Tier 2 (Emerging), Tier 3
  (Rest of World), or hand-pick from 50 storefronts.
- ⚡ **Batch scrape** — one request per app × country, with a live progress grid
  (a spinner/checkmark per country flag), request rate and ETA. Pause / cancel
  any time.
- 📥 **One combined CSV** — `store, app, country, rating, review` for everything
  you scraped.
- 🧪 **Sample mode** — load demo data to try the whole flow with no network.

### Analyze reviews → build spec (`/analyze`)

- 📤 **Upload** one or many review files — CSV or Excel (`.xlsx`) — (ReviewMaxxing
  exports, this app's CSV, or any sheet with a review/rating column).
- 🧠 **Cluster** them with **Claude (Opus 4.8)** into three columns — **Love**,
  **Want Added**, **Don't Need** — each with themes, frequency, and example quotes.
- 📝 **Generate prompt + context** — produce a massive, copy-paste build
  specification to hand to Claude Code for a v1.0 iOS app aimed at App Store
  acceptance.

Set `ANTHROPIC_API_KEY` (from [console.anthropic.com](https://console.anthropic.com))
in your environment (and on Vercel) to enable it.

## Tech stack

- [Next.js 14](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS for the UI
- [`google-play-scraper`](https://www.npmjs.com/package/google-play-scraper) for Google Play
- Apple's **iTunes Search API** + the **AMP reviews API** for the App Store

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
| App Store | iTunes Search API (`/search`) | Apple's AMP API (`amp-api-edge.apps.apple.com`), authenticated with a bearer token scraped from the App Store page's JS bundle |
| Google Play | `google-play-scraper` `search()` | `google-play-scraper` `reviews()` (newest, up to ~150) |

Only the **star rating** and **review text** are kept — that's all that lands
in the table and the CSV.

> **App Store note:** Apple's old `itunes.apple.com/.../rss/customerreviews`
> feed now returns an empty feed, so reviews come from the same AMP API the App
> Store website uses. We load the app's `apps.apple.com` page, pull the bearer
> token (a JWT) out of its JavaScript bundle, cache it, and call the **`-edge`**
> reviews host with an `Origin` header (sent via `undici.request`, since the
> Fetch API forbids setting `Origin`). The plain `amp-api` host returns 401.

## Deploying & the "No reviews found" gotcha

The store endpoints must be reachable from wherever the app runs, **and the
host's IP must not be blocked by the store.** This is the #1 source of
confusion when deploying to a shared cloud platform.

**Why scraping can come back empty on Vercel/serverless even though it works
locally:** Apple and Google rate-limit and block requests from datacenter IP
ranges. *Search* usually still responds, but the **review** endpoints are
pickier:

- **Google Play** review data comes from a `batchexecute` RPC. When that IP is
  throttled, Google returns an empty body and `google-play-scraper` resolves to
  an **empty array** (it doesn't throw).
- **App Store** reviews need a token scraped from `apps.apple.com` plus the AMP
  reviews API; from flagged datacenter IPs those can be throttled too.

Running locally (a residential IP) sidesteps all of this — which is the simplest
way to use the app.

### How to confirm what's happening

Add `?debug=1` to a reviews request, or check your host's function logs — each
call logs `[reviews] store=… appId=… country=… -> N reviews`. `N = 0` with no
error means the store returned nothing (an IP block/throttle), not a crash.

### Ways to make it work in production

1. **Route store requests through a proxy (built-in).** Set the
   `SCRAPER_PROXY_URL` environment variable to a proxy with a non-flagged
   (ideally residential) IP and both scrapers will use it automatically — no
   code changes. This is what makes it work on Vercel.

   ```bash
   SCRAPER_PROXY_URL=http://USERNAME:PASSWORD@proxy-host:PORT
   ```

   Any HTTP/HTTPS proxy that supports HTTPS `CONNECT` tunneling works. Scraping
   APIs that expose a proxy endpoint (ScraperAPI, ScrapingBee, Zyte, Bright
   Data, Smartproxy, …) are the easiest option and several have free tiers. On
   Vercel, add it under **Project → Settings → Environment Variables**, then
   redeploy. Verify with `/api/diag` — the response includes `"proxy": true`
   and should then show real review counts.

2. **Run from a residential IP** — e.g. your own machine (`npm start`). Note
   that most VPS/cloud IPs are *also* datacenter ranges and get throttled the
   same way Vercel does, so a proxy is usually still needed off-Vercel too.

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
