import { NextResponse } from "next/server";
import { gotProxyAgent, proxyEnabled } from "@/lib/proxy";
import {
  getStorefrontToken,
  fetchAmpReviews,
} from "@/lib/scrapers/appStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Temporary diagnostic endpoint. Open it in a browser, e.g.:
 *   /api/diag                                   (App Store, Instagram, US)
 *   /api/diag?store=googleplay
 *   /api/diag?store=appstore&appId=389801252&country=gb
 *
 * It exercises the real review path and reports exactly what came back, so we
 * can tell a token/API problem apart from an empty result. Safe to delete.
 */

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const store = sp.get("store") || "appstore";
  const country = (sp.get("country") || "us").toLowerCase();

  if (store === "appstore") {
    const appId = sp.get("appId") || "389801252"; // Instagram
    try {
      // Step 1: get the AMP API bearer token from the App Store page.
      let token = "";
      let tokenOk = false;
      try {
        token = await getStorefrontToken(country, appId);
        tokenOk = true;
      } catch (e) {
        return NextResponse.json({
          store,
          appId,
          country,
          proxy: proxyEnabled(),
          tokenOk: false,
          tokenError: e instanceof Error ? e.message : String(e),
        });
      }

      // Step 2: hit the reviews API with that token.
      const page = await fetchAmpReviews(appId, country, token, 0, 20);
      const sample = page.data.slice(0, 2).map((r: any) => ({
        rating: r?.attributes?.rating,
        text: String(r?.attributes?.review ?? "").slice(0, 120),
      }));

      return NextResponse.json({
        store,
        appId,
        country,
        proxy: proxyEnabled(),
        tokenOk,
        tokenPreview: token.slice(0, 16) + "…",
        ampApiStatus: page.status,
        reviewsOnFirstPage: page.data.length,
        hasNextPage: page.hasNext,
        sample,
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

