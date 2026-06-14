import type { AppResult, Review } from "../types";
import { fetchDispatcher } from "../proxy";

const SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/16.0 Safari/605.1.15";

/** Build fetch() options incl. headers and the optional proxy dispatcher
 *  (typed loosely because `dispatcher` isn't in the lib DOM RequestInit). */
function fetchOpts(extraHeaders: Record<string, string> = {}): any {
  return {
    headers: {
      "User-Agent": SAFARI_UA,
      "Accept-Language": "en-US,en;q=0.9",
      ...extraHeaders,
    },
    cache: "no-store",
    dispatcher: fetchDispatcher(),
  };
}

/** Search the App Store via the public iTunes Search API. */
export async function searchAppStore(
  term: string,
  country: string,
): Promise<AppResult[]> {
  const url =
    `https://itunes.apple.com/search?media=software&entity=software&limit=8` +
    `&country=${encodeURIComponent(country.toLowerCase())}&term=${encodeURIComponent(term)}`;

  const res = await fetch(url, fetchOpts({ Accept: "application/json" }));
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
 * The App Store website calls a private "AMP" API for reviews, authenticated
 * with a bearer token embedded in every apps.apple.com page. Fetch an app's
 * page and pull that token out. (The old itunes.apple.com RSS reviews feed now
 * returns an empty feed, so this is the reliable path.)
 */
export async function getStorefrontToken(
  country: string,
  appId: string,
): Promise<string> {
  const pageUrl = `https://apps.apple.com/${country.toLowerCase()}/app/id${appId}`;
  const res = await fetch(pageUrl, fetchOpts({ Accept: "text/html" }));
  if (!res.ok) {
    throw new Error(`Couldn't load the App Store page (HTTP ${res.status})`);
  }
  const html = await res.text();

  // Preferred: token sits in a URL-encoded JSON meta tag.
  const meta = html.match(
    /<meta[^>]+name="web-experience-app\/config\/environment"[^>]+content="([^"]+)"/,
  );
  if (meta) {
    const decoded = decodeURIComponent(meta[1]);
    const t = decoded.match(/"token"\s*:\s*"([^"]+)"/);
    if (t) return t[1];
  }

  // Fallback: grab any JWT-looking string from the page.
  const jwt = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (jwt) return jwt[0];

  throw new Error("Couldn't find the App Store API token on the page.");
}

/** One page of the AMP reviews API. Returns the raw `data` array + a `next` flag. */
export async function fetchAmpReviews(
  appId: string,
  country: string,
  token: string,
  offset: number,
  limit = 20,
): Promise<{ status: number; data: any[]; hasNext: boolean }> {
  const cc = country.toLowerCase();
  const url =
    `https://amp-api.apps.apple.com/v1/catalog/${cc}/apps/${appId}/reviews` +
    `?l=en-US&offset=${offset}&limit=${limit}&platform=web` +
    `&additionalPlatforms=appletv,ipad,iphone,mac&sort=mostRecent`;

  const res = await fetch(
    url,
    fetchOpts({
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      Origin: "https://apps.apple.com",
      Referer: "https://apps.apple.com/",
    }),
  );

  if (!res.ok) return { status: res.status, data: [], hasNext: false };
  const json = await res.json();
  return {
    status: res.status,
    data: Array.isArray(json?.data) ? json.data : [],
    hasNext: Boolean(json?.next),
  };
}

/** Pull reviews (star rating + text) from the App Store's AMP API. */
export async function reviewsAppStore(
  appId: string,
  country: string,
  max = 120,
): Promise<Review[]> {
  const cc = country.toLowerCase();
  const token = await getStorefrontToken(cc, appId);

  const reviews: Review[] = [];
  const seen = new Set<string>();
  const limit = 20;

  for (let offset = 0; offset < max + limit && reviews.length < max; offset += limit) {
    const page = await fetchAmpReviews(appId, cc, token, offset, limit);

    if (page.status !== 200) {
      if (offset === 0) {
        throw new Error(`App Store reviews API failed (HTTP ${page.status})`);
      }
      break;
    }
    if (page.data.length === 0) break;

    let added = 0;
    for (const r of page.data) {
      const id = String(r?.id ?? `${offset}-${added}`);
      const text = String(r?.attributes?.review ?? "").trim();
      const rating = Number(r?.attributes?.rating) || 0;
      if (!text || seen.has(id)) continue;
      seen.add(id);
      reviews.push({ id, rating, text });
      added++;
    }

    if (!page.hasNext || added === 0) break;
  }

  return reviews;
}
