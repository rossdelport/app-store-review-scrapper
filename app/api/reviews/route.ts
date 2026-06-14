import { NextResponse } from "next/server";
import { reviewsGooglePlay } from "@/lib/scrapers/googlePlay";
import { reviewsAppStore } from "@/lib/scrapers/appStore";
import { friendlyError } from "@/lib/errors";
import { DEFAULT_COUNTRY, isValidCountry } from "@/lib/countries";
import type { Store } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const store = body.store as Store;
    const appId = String(body.appId ?? "").trim();
    const country = isValidCountry(body.country) ? body.country : DEFAULT_COUNTRY;

    if (!appId) {
      return NextResponse.json({ error: "Missing app id." }, { status: 400 });
    }
    if (store !== "appstore" && store !== "googleplay") {
      return NextResponse.json({ error: "Unknown store." }, { status: 400 });
    }

    const reviews =
      store === "appstore"
        ? await reviewsAppStore(appId, country)
        : await reviewsGooglePlay(appId, country);

    if (reviews.length === 0) {
      return NextResponse.json(
        {
          error:
            "No reviews found for that app in the selected country. Try another country or app.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ reviews, source: "live" });
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 502 });
  }
}
