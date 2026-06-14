import type { AppResult, Review } from "../types";

// A desktop UA keeps Apple's public endpoints from rejecting the request.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/16.0 Safari/605.1.15";

const headers = { "User-Agent": UA, Accept: "application/json" };

/** Search the App Store via the public iTunes Search API. */
export async function searchAppStore(
  term: string,
  country: string,
): Promise<AppResult[]> {
  const url =
    `https://itunes.apple.com/search?media=software&entity=software&limit=8` +
    `&country=${encodeURIComponent(country)}&term=${encodeURIComponent(term)}`;

  const res = await fetch(url, { headers, cache: "no-store" });
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
 * Pull reviews from Apple's public customer-reviews RSS feed (JSON variant).
 * The feed is paginated (1..10, ~50 reviews per page); we read a handful of
 * pages so we get a solid sample without hammering the endpoint.
 */
export async function reviewsAppStore(
  appId: string,
  country: string,
  maxPages = 5,
): Promise<Review[]> {
  const reviews: Review[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    const url =
      `https://itunes.apple.com/${country}/rss/customerreviews/` +
      `page=${page}/id=${appId}/sortby=mostrecent/json`;

    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      if (page === 1) {
        throw new Error(`App Store reviews failed (HTTP ${res.status})`);
      }
      break; // later pages can 404 once we run out of reviews
    }

    const json = await res.json();
    const entry = json?.feed?.entry;
    if (!entry) break;
    const list: any[] = Array.isArray(entry) ? entry : [entry];

    let added = 0;
    for (const e of list) {
      const rating = e?.["im:rating"]?.label;
      const content = e?.content?.label;
      // The app-info entry that Apple sometimes prepends has no rating/content.
      if (rating == null || content == null) continue;

      const id = String(e?.id?.label ?? `${appId}-${page}-${added}`);
      if (seen.has(id)) continue;
      seen.add(id);

      reviews.push({
        id,
        rating: Number(rating) || 0,
        text: String(content).trim(),
      });
      added++;
    }
    if (added === 0) break;
  }

  return reviews;
}
