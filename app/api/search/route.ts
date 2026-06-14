import { NextResponse } from "next/server";
import { searchGooglePlay } from "@/lib/scrapers/googlePlay";
import { searchAppStore } from "@/lib/scrapers/appStore";
import { friendlyError } from "@/lib/errors";
import { DEFAULT_COUNTRY, isValidCountry } from "@/lib/countries";
import type { Store } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") === "1";

  try {
    const body = await req.json();
    const store = body.store as Store;
    const term = String(body.term ?? "").trim();
    const country = isValidCountry(body.country) ? body.country : DEFAULT_COUNTRY;

    if (!term) {
      return NextResponse.json(
        { error: "Enter an app name to search." },
        { status: 400 },
      );
    }
    if (store !== "appstore" && store !== "googleplay") {
      return NextResponse.json({ error: "Unknown store." }, { status: 400 });
    }

    const results =
      store === "appstore"
        ? await searchAppStore(term, country)
        : await searchGooglePlay(term, country);

    console.log(
      `[search] store=${store} term="${term}" country=${country} -> ${results.length} results`,
    );

    return NextResponse.json({
      results,
      ...(debug ? { debug: { store, term, country, count: results.length } } : {}),
    });
  } catch (e) {
    console.error("[search] error:", e);
    return NextResponse.json(
      {
        error: friendlyError(e),
        ...(debug ? { debug: { raw: e instanceof Error ? e.message : String(e) } } : {}),
      },
      { status: 502 },
    );
  }
}
