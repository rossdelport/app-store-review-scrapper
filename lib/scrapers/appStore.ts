import type { AppResult, Review } from "../types";

// A desktop UA + language keeps Apple's public endpoints from rejecting the request.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/16.0 Safari/605.1.15";

const baseHeaders = {
  "User-Agent": UA,
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Search the App Store via the public iTunes Search API. */
export async function searchAppStore(
  term: string,
  country: string,
): Promise<AppResult[]> {
  const url =
    `https://itunes.apple.com/search?media=software&entity=software&limit=8` +
    `&country=${encodeURIComponent(country.toLowerCase())}&term=${encodeURIComponent(term)}`;

  const res = await fetch(url, { headers: baseHeaders, cache: "no-store" });
  if (!res.ok) throw new Error(`App Store search failed (HTTP ${res.status})`);

  const json = await res.json();
  return (json.results ?? []).map(
    (a: any): AppResult => ({
      id: String(a.trackId),
      title: a.trackName,
      developer: a.artistName,
      icon: a.artworkUrl100 || a.artworkUrl60 || "",
      url: a.trackViewUrl,
      score: a.averageUserRating,
      store: "appstore",
    }),
  );
}

/**
 * Parse one page of Apple's customer-reviews JSON feed into Review objects.
 * Pure (no I/O) so it can be unit-tested. Skips the app-info entry Apple
 * sometimes prepends (it has no `im:rating`).
 */
export function parseAppStoreFeed(json: any): Review[] {
  const entry = json?.feed?.entry;
  if (!entry) return [];
  const list: any[] = Array.isArray(entry) ? entry : [entry];

  const reviews: Review[] = [];
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const rating = e?.["im:rating"]?.label;

    // `content` is usually { label }, but can be an array of typed contents.
    let content: string | undefined = e?.content?.label;
    if (content == null && Array.isArray(e?.content)) {
      content = e.content.find((c: any) => c?.label)?.label;
    }

    if (rating == null || content == null) continue;

    reviews.push({
      id: String(e?.id?.label ?? `${i}`),
      rating: Number(rating) || 0,
      text: String(content).trim(),
    });
  }
  return reviews;
}

/**
 * Pull reviews from Apple's public customer-reviews RSS feed (JSON variant).
 * The feed is paginated (1..10, ~50 reviews per page); we read a handful of
 * pages so we get a solid sample without hammering the endpoint.
 */
export async function reviewsAppStore(
  appId: string,
  country: string,
  maxPages = 5,
): Promise<Review[]> {
  const cc = country.toLowerCase();
  const reviews: Review[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    const url =
      `https://itunes.apple.com/${cc}/rss/customerreviews/` +
      `page=${page}/id=${appId}/sortby=mostrecent/json`;

    const res = await fetch(url, { headers: baseHeaders, cache: "no-store" });
    if (!res.ok) {
      // Surface a block/rate-limit on the first page instead of returning empty.
      if (page === 1) {
        throw new Error(`App Store reviews request failed (HTTP ${res.status})`);
      }
      break; // later pages can 404 once we run out of reviews
    }

    const json = await res.json();
    let added = 0;
    for (const r of parseAppStoreFeed(json)) {
      const id = `${page}:${r.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      reviews.push(r);
      added++;
    }
    if (added === 0) break;
  }

  return reviews;
}
