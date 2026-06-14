import { NextResponse } from "next/server";
import { request as undiciRequest } from "undici";
import { fetchDispatcher, gotProxyAgent, proxyEnabled } from "@/lib/proxy";
import {
  fetchAmpReviews,
  collectAssetUrls,
  extractTokenFromHtml,
  getStorefrontToken,
} from "@/lib/scrapers/appStore";

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

/** Decode a JWT's payload (alg/iss/exp) without verifying it. */
function decodeJwt(jwt: string): any {
  try {
    const header = JSON.parse(Buffer.from(jwt.split(".")[0], "base64url").toString());
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    return {
      alg: header?.alg,
      iss: payload?.iss,
      exp: payload?.exp,
      expiresInDays: payload?.exp
        ? Math.round((payload.exp * 1000 - Date.now()) / 86400000)
        : null,
    };
  } catch {
    return null;
  }
}

/** Test a token against the reviews API two ways: global fetch (which may drop
 *  the forbidden `Origin` header) vs undici.request (which sends it). */
// US App Store storefront id (143441), with the API version suffix.
const STOREFRONT: Record<string, string> = {
  us: "143441-1,29",
  gb: "143444-2,29",
  ca: "143455-6,29",
  au: "143460,29",
};

/** Echo what headers actually reach a server, to confirm Origin is transmitted. */
async function echoHeaders(token: string) {
  try {
    const r = await undiciRequest("https://httpbin.org/headers", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.slice(0, 10)}…`,
        Origin: "https://apps.apple.com",
        "User-Agent": SAFARI_UA,
      },
      dispatcher: fetchDispatcher(),
    });
    const j: any = await r.body.json();
    return { origin: j?.headers?.Origin ?? null, seen: Object.keys(j?.headers ?? {}) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Try the reviews API several ways to find the combination Apple accepts. */
async function runAmpVariants(
  appId: string,
  country: string,
  token: string,
  cookie: string,
) {
  const base =
    `https://amp-api.apps.apple.com/v1/catalog/${country}/apps/${appId}/reviews` +
    `?l=en-US&offset=0&limit=10&platform=web&additionalPlatforms=appletv,ipad,iphone,mac`;
  const sf = STOREFRONT[country] || "143441-1,29";

  const defs: [string, string, Record<string, string>][] = [
    ["base", base, {}],
    ["storefront", base, { "X-Apple-Store-Front": sf }],
    ["cookies", base, cookie ? { Cookie: cookie } : {}],
    ["cookies+storefront", base, { ...(cookie ? { Cookie: cookie } : {}), "X-Apple-Store-Front": sf }],
    ["edge-host", base.replace("amp-api.apps", "amp-api-edge.apps"), {}],
  ];

  const out: any[] = [];
  for (const [name, url, extra] of defs) {
    try {
      const r = await undiciRequest(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Origin: "https://apps.apple.com",
          Referer: "https://apps.apple.com/",
          "User-Agent": SAFARI_UA,
          Accept: "application/json",
          ...extra,
        },
        dispatcher: fetchDispatcher(),
      });
      const b = await r.body.text();
      let count = 0;
      try {
        count = (JSON.parse(b).data || []).length;
      } catch {
        /* not json */
      }
      out.push({ name, status: r.statusCode, count, body: b.slice(0, 120) });
    } catch (e) {
      out.push({ name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}

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

      // Get the token first (HTML, then JS-asset scan).
      let token = "";
      let tokenError: string | null = null;
      try {
        token = await getStorefrontToken(country, appId);
      } catch (e) {
        tokenError = e instanceof Error ? e.message : String(e);
      }

      // When ?deep=1, verify header transmission and try API request variants.
      let experiment: any = null;
      if (deep && token) {
        // Capture session cookies the App Store page sets.
        let cookie = "";
        try {
          const pg = await undiciRequest(pageUrl, {
            method: "GET",
            headers: { "User-Agent": SAFARI_UA, Accept: "text/html" },
            dispatcher: fetchDispatcher(),
          });
          const sc: any = pg.headers["set-cookie"];
          const arr = Array.isArray(sc) ? sc : sc ? [sc] : [];
          cookie = arr.map((c: string) => c.split(";")[0]).join("; ");
          await pg.body.dump();
        } catch {
          /* ignore */
        }
        experiment = {
          cookieLen: cookie.length,
          echo: await echoHeaders(token),
          variants: await runAmpVariants(appId, country, token, cookie),
        };
      }

      let amp: any = null;
      if (token) {
        const page = await fetchAmpReviews(appId, country, token, 0, 20);
        amp = { status: page.status, reviews: page.data.length, hasNext: page.hasNext };
      }

      return NextResponse.json({
        store,
        appId,
        country,
        proxy: proxyEnabled(),
        page: {
          status: pageRes.status,
          finalUrl: pageRes.url,
          length: html.length,
          jsAssetCount: assetUrls.length,
          hasInlineToken: Boolean(extractTokenFromHtml(html)),
        },
        tokenFound: Boolean(token),
        tokenPreview: token ? token.slice(0, 16) + "…" : null,
        tokenDecoded: token ? decodeJwt(token) : null,
        tokenError,
        experiment,
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

