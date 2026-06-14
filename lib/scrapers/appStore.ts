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

const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

/** Pull a token out of the page HTML (older layout: a config meta tag or an
 *  inline JWT). Returns "" if not present. */
export function extractTokenFromHtml(html: string): string {
  const meta = html.match(
    /<meta[^>]+web-experience-app\/config\/environment[^>]+content="([^"]+)"/,
  );
  if (meta) {
    const decoded = decodeURIComponent(meta[1]);
    const t = decoded.match(/"token"\s*:\s*"([^"]+)"/);
    if (t) return t[1];
  }
  const jwt = html.match(JWT_RE);
  return jwt ? jwt[0] : "";
}

/** Collect the JS asset URLs referenced by an apps.apple.com page. */
export function collectAssetUrls(html: string): string[] {
  const urls = new Set<string>();
  const re = /(?:src|href)="([^"]+\.js[^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let u = m[1];
    if (u.startsWith("//")) u = "https:" + u;
    else if (u.startsWith("/")) u = "https://apps.apple.com" + u;
    if (u.startsWith("http")) urls.add(u);
  }
  return Array.from(urls);
}

/** Scan a page's JS bundles for the AMP bearer token (a JWT). */
export async function findTokenInAssets(
  html: string,
  maxFiles = 8,
): Promise<string> {
  for (const url of collectAssetUrls(html).slice(0, maxFiles)) {
    try {
      const res = await fetch(url, fetchOpts({ Accept: "*/*" }));
      if (!res.ok) continue;
      const jwt = (await res.text()).match(JWT_RE);
      if (jwt) return jwt[0];
    } catch {
      /* skip unreachable asset */
    }
  }
  return "";
}

// The token is the same for every app/request, so fetch it once and reuse.
let cachedToken: { value: string; at: number } | null = null;
const TOKEN_TTL_MS = 30 * 60 * 1000;

/**
 * The App Store website calls a private "AMP" API for reviews, authenticated
 * with a bearer token (a JWT). It used to be embedded in the page HTML; it now
 * lives in one of the page's JS bundles, so we read the page, then scan its
 * assets for the token. (The old itunes RSS reviews feed returns empty.)
 */
export async function getStorefrontToken(
  country: string,
  appId: string,
): Promise<string> {
  if (cachedToken && Date.now() - cachedToken.at < TOKEN_TTL_MS) {
    return cachedToken.value;
  }

  const pageUrl = `https://apps.apple.com/${country.toLowerCase()}/app/id${appId}`;
  const res = await fetch(pageUrl, fetchOpts({ Accept: "text/html" }));
  if (!res.ok) {
    throw new Error(`Couldn't load the App Store page (HTTP ${res.status})`);
  }
  const html = await res.text();

  let token = extractTokenFromHtml(html);
  if (!token) token = await findTokenInAssets(html);
  if (!token) {
    throw new Error("Couldn't find the App Store API token (page or assets).");
  }

  cachedToken = { value: token, at: Date.now() };
  return token;
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
