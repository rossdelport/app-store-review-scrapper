import type { AppResult, Review } from "../types";

// google-play-scraper@10 is ESM-only, so it's loaded with a dynamic import at
// runtime (and kept out of the webpack bundle via next.config serverComponentsExternalPackages).
async function gplay(): Promise<any> {
  const mod: any = await import("google-play-scraper");
  return mod.default ?? mod;
}

// Passed through to google-play-scraper's underlying `got` requests. A real
// browser UA + language reduces the chance Google serves an empty/blocked body.
const REQUEST_OPTIONS = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  },
};

export async function searchGooglePlay(
  term: string,
  country: string,
): Promise<AppResult[]> {
  const gp = await gplay();
  const results = await gp.search({
    term,
    num: 8,
    country,
    lang: "en",
    requestOptions: REQUEST_OPTIONS,
  });
  return (results ?? []).map(
    (a: any): AppResult => ({
      id: a.appId,
      title: a.title,
      developer: a.developer,
      icon: a.icon,
      url: a.url,
      score: a.score,
      store: "googleplay",
    }),
  );
}

export async function reviewsGooglePlay(
  appId: string,
  country: string,
  max = 150,
): Promise<Review[]> {
  const gp = await gplay();
  const res = await gp.reviews({
    appId,
    sort: gp.sort.NEWEST,
    num: max,
    country,
    lang: "en",
    throttle: 5,
    requestOptions: REQUEST_OPTIONS,
  });

  const data: any[] = Array.isArray(res) ? res : (res?.data ?? []);
  return data
    .filter((r) => r && typeof r.text === "string" && r.text.trim().length > 0)
    .map(
      (r): Review => ({
        id: String(r.id ?? `${appId}-${Math.random()}`),
        rating: Number(r.score) || 0,
        text: String(r.text).trim(),
      }),
    );
}
