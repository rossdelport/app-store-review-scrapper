import type { AppResult, Review } from "../types";
import { gotProxyAgent, gotHttpsOptions } from "../proxy";

// google-play-scraper@10 is ESM-only, so it's loaded with a dynamic import at
// runtime (and kept out of the webpack bundle via next.config serverComponentsExternalPackages).
async function gplay(): Promise<any> {
  const mod: any = await import("google-play-scraper");
  return mod.default ?? mod;
}

// Passed through to google-play-scraper's underlying `got` requests. Only the
// optional proxy agent is set here — NOT custom headers: the library merges
// requestOptions shallowly, so a `headers` object would clobber the
// Content-Type it needs for its POST requests and Google returns HTTP 400.
function requestOptions(): Record<string, unknown> | undefined {
  const agent = gotProxyAgent();
  const https = gotHttpsOptions();
  if (!agent && !https) return undefined;
  return { ...(agent ? { agent } : {}), ...(https ? { https } : {}) };
}

export async function searchGooglePlay(
  term: string,
  country: string,
): Promise<AppResult[]> {
  const gp = await gplay();
  const results = await gp.search({
    term,
    num: 20,
    country,
    lang: "en",
    requestOptions: requestOptions(),
  });
  return (results ?? []).map(
    (a: any): AppResult => ({
      id: a.appId,
      title: a.title,
      developer: a.developer,
      icon: a.icon,
      url: a.url,
      score: a.score,
      price: a.priceText || (a.free ? "Free" : undefined),
      free: a.free,
      genre: a.genre,
      store: "googleplay",
    }),
  );
}

/** Pull a page of Google Play reviews. Pass `paginationToken` to continue from a
 *  previous page; returns the reviews plus the `nextToken` cursor (null when
 *  there are no more), so callers can paginate deep across many requests. */
export async function reviewsGooglePlay(
  appId: string,
  country: string,
  max = 150,
  paginationToken?: string,
): Promise<{ reviews: Review[]; nextToken: string | null }> {
  const gp = await gplay();
  const res = await gp.reviews({
    appId,
    sort: gp.sort.NEWEST,
    num: max,
    country,
    lang: "en",
    throttle: 5,
    paginate: true,
    nextPaginationToken: paginationToken,
    requestOptions: requestOptions(),
  });

  const data: any[] = Array.isArray(res) ? res : (res?.data ?? []);
  const nextToken: string | null =
    (res && !Array.isArray(res) ? (res.nextPaginationToken as string | undefined) : undefined) ?? null;

  const reviews = data
    .filter((r) => r && typeof r.text === "string" && r.text.trim().length > 0)
    .map(
      (r): Review => ({
        id: String(r.id ?? `${appId}-${Math.random()}`),
        rating: Number(r.score) || 0,
        text: String(r.text).trim(),
      }),
    );
  return { reviews, nextToken };
}
