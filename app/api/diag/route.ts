import { NextResponse } from "next/server";
import { fetchDispatcher, gotProxyAgent, proxyEnabled } from "@/lib/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Temporary diagnostic endpoint. Open it in a browser, e.g.:
 *   /api/diag                                   (App Store, Instagram, US)
 *   /api/diag?store=googleplay
 *   /api/diag?store=appstore&appId=389801252&country=gb
 *
 * It performs the raw upstream request and reports exactly what the store
 * returned, so we can tell an IP block / soft-throttle apart from a genuine
 * "no reviews" result. Safe to delete once we've diagnosed the deployment.
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
    const url = `https://itunes.apple.com/${country}/rss/customerreviews/page=1/id=${appId}/sortby=mostrecent/json`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": SAFARI_UA,
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
        cache: "no-store",
        dispatcher: fetchDispatcher(),
      } as any);
      const text = await res.text();

      let entryCount: number | string = "n/a";
      let jsonParsed = false;
      try {
        const json = JSON.parse(text);
        const entry = json?.feed?.entry;
        entryCount = entry ? (Array.isArray(entry) ? entry.length : 1) : 0;
        jsonParsed = true;
      } catch {
        /* body wasn't JSON */
      }

      return NextResponse.json({
        store,
        appId,
        country,
        proxy: proxyEnabled(),
        url,
        upstreamStatus: res.status,
        ok: res.ok,
        contentType: res.headers.get("content-type"),
        bodyLength: text.length,
        jsonParsed,
        feedEntryCount: entryCount,
        bodySnippet: text.slice(0, 900),
      });
    } catch (e) {
      return NextResponse.json({
        store,
        appId,
        country,
        url,
        fetchError: e instanceof Error ? e.message : String(e),
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
          ? "google-play-scraper returned 0 reviews with no error — this is what a blocked/throttled datacenter IP looks like."
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
