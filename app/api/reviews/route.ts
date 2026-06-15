import { NextResponse } from "next/server";
import { reviewsGooglePlay } from "@/lib/scrapers/googlePlay";
import { reviewsAppStore } from "@/lib/scrapers/appStore";
import { friendlyError } from "@/lib/errors";
import { DEFAULT_COUNTRY, isValidCountry } from "@/lib/countries";
import type { Review, Store } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow slower proxied requests to finish

const EMPTY_MESSAGE =
  "No reviews came back for this app in the selected country. If the app is " +
  "hosted on a cloud platform (e.g. Vercel), the store is most likely " +
  "rate-limiting or blocking the server's IP — this is common for Google Play. " +
  "Try the App Store tab, a different country, or 'Load sample data'.";

export async function POST(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") === "1";

  try {
    const body = await req.json();
    const store = body.store as Store;
    const appId = String(body.appId ?? "").trim();
    const country = isValidCountry(body.country) ? body.country : DEFAULT_COUNTRY;
    const max = Math.min(Math.max(Number(body.max) || 100, 1), 500);
    const token = typeof body.token === "string" ? body.token : undefined;
    // Opaque pagination cursor: a numeric offset for the App Store, a
    // continuation token for Google Play. Absent on the first page.
    const cursor = body.cursor;

    if (!appId) {
      return NextResponse.json({ error: "Missing app id." }, { status: 400 });
    }
    if (store !== "appstore" && store !== "googleplay") {
      return NextResponse.json({ error: "Unknown store." }, { status: 400 });
    }

    let reviews: Review[] = [];
    let nextCursor: string | null = null;
    if (store === "appstore") {
      const startOffset = Number(cursor) || 0;
      const r = await reviewsAppStore(appId, country, max, token, startOffset);
      reviews = r.reviews;
      nextCursor = r.nextOffset != null ? String(r.nextOffset) : null;
    } else {
      const pageToken = typeof cursor === "string" ? cursor : undefined;
      const r = await reviewsGooglePlay(appId, country, max, pageToken);
      reviews = r.reviews;
      nextCursor = r.nextToken;
    }

    // Visible in `vercel logs` / the Functions tab to confirm what happened.
    console.log(
      `[reviews] store=${store} appId=${appId} country=${country} -> ${reviews.length} reviews`,
    );

    // Only treat an empty FIRST page as the "blocked / no reviews" case. Empty
    // follow-up pages just mean we reached the end — return 200 with no cursor.
    if (reviews.length === 0 && !cursor) {
      return NextResponse.json(
        {
          error: EMPTY_MESSAGE,
          ...(debug ? { debug: { store, appId, country, count: 0 } } : {}),
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      reviews,
      source: "live",
      nextCursor,
      ...(debug ? { debug: { store, appId, country, count: reviews.length } } : {}),
    });
  } catch (e) {
    console.error("[reviews] error:", e);
    return NextResponse.json(
      {
        error: friendlyError(e),
        ...(debug ? { debug: { raw: e instanceof Error ? e.message : String(e) } } : {}),
      },
      { status: 502 },
    );
  }
}
