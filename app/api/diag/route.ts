import { NextResponse } from "next/server";
import { fetchDispatcher, gotProxyAgent, proxyEnabled } from "@/lib/proxy";
import {
  fetchAmpReviews,
  collectAssetUrls,
  extractTokenFromHtml,
  getStorefrontToken,
} from "@/lib/scrapers/appStore";

const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Temporary diagnostic endpoint. Open it in a browser, e.g.:
 *   /api/diag                                   (App Store, Instagram, US)
 *   /api/diag?store=googleplay
 *   /api/diag?store=appstore&appId=389801252&country=gb
 *
 * For the App Store it probes the apps.apple.com page so we can locate the
 * AMP API token, then tries the reviews API. Safe to delete.
 */

const SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/16.0 Safari/605.1.15";
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const store = sp.get("store") || "appstore";
  const country = (sp.get("country") || "us").toLowerCase();

  if (store === "appstore") {
    const appId = sp.get("appId") || "389801252"; // Instagram
    const deep = sp.get("deep") === "1";
    const pageUrl = `https://apps.apple.com/${country}/app/id${appId}`;
    try {
      // Probe the App Store page so we can see where (or whether) the token is.
      const pageRes = await fetch(pageUrl, {
        headers: {
          "User-Agent": SAFARI_UA,
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
        cache: "no-store",
        dispatcher: fetchDispatcher(),
      } as any);
      const html = await pageRes.text();

      const assetUrls = collectAssetUrls(html);

      // When ?deep=1, scan the JS bundles for the token and report each file.
      let assets: any = null;
      if (deep) {
        const results: any[] = [];
        for (const url of assetUrls.slice(0, 8)) {
          try {
            const r = await fetch(url, {
              headers: { "User-Agent": SAFARI_UA, Accept: "*/*" },
              cache: "no-store",
              dispatcher: fetchDispatcher(),
            } as any);
            const body = r.ok ? await r.text() : "";
            const jwt = body.match(JWT_RE);
            results.push({
              url,
              status: r.status,
              length: body.length,
              hasJwt: Boolean(jwt),
              jwtPreview: jwt ? jwt[0].slice(0, 18) + "…" : null,
            });
          } catch (e) {
            results.push({ url, error: e instanceof Error ? e.message : String(e) });
          }
        }
        assets = { count: assetUrls.length, scanned: results };
      }

      // Run the real token logic (HTML, then JS-asset scan) + reviews.
      let token = "";
      let tokenError: string | null = null;
      try {
        token = await getStorefrontToken(country, appId);
      } catch (e) {
        tokenError = e instanceof Error ? e.message : String(e);
      }

      let amp: any = null;
      if (token) {
        const page = await fetchAmpReviews(appId, country, token, 0, 20);
        amp = {
          status: page.status,
          reviews: page.data.length,
          hasNext: page.hasNext,
          sample: page.data.slice(0, 2).map((r: any) => ({
            rating: r?.attributes?.rating,
            text: String(r?.attributes?.review ?? "").slice(0, 100),
          })),
        };
      }

      return NextResponse.json({
        store,
        appId,
        country,
        proxy: proxyEnabled(),
        page: {
          status: pageRes.status,
          finalUrl: pageRes.url,
          contentType: pageRes.headers.get("content-type"),
          length: html.length,
          jsAssetCount: assetUrls.length,
          firstAssets: assetUrls.slice(0, 5),
          hasInlineToken: Boolean(extractTokenFromHtml(html)),
        },
        assets,
        tokenFound: Boolean(token),
        tokenPreview: token ? token.slice(0, 16) + "…" : null,
        tokenError,
        amp,
      });
    } catch (e) {
      return NextResponse.json({
        store,
        appId,
        country,
        proxy: proxyEnabled(),
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Google Play
  const appId = sp.get("appId") || "com.instagram.android";
  try {
    const mod: any = await import("google-play-scraper");
    const gp = mod.default ?? mod;
    const res = await gp.reviews({
      appId,
      sort: gp.sort.NEWEST,
      num: 50,
      country,
      lang: "en",
      throttle: 5,
      requestOptions: {
        headers: { "User-Agent": CHROME_UA, "Accept-Language": "en-US,en;q=0.9" },
        agent: gotProxyAgent(),
      },
    });
    const data: any[] = Array.isArray(res) ? res : (res?.data ?? []);
    return NextResponse.json({
      store,
      appId,
      country,
      proxy: proxyEnabled(),
      reviewCount: data.length,
      note:
        data.length === 0
          ? "google-play-scraper returned 0 reviews with no error — this is what a blocked/throttled IP looks like."
          : "ok",
      sample: data.slice(0, 1).map((r) => ({ score: r.score, text: r.text })),
    });
  } catch (e) {
    return NextResponse.json({
      store,
      appId,
      country,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

