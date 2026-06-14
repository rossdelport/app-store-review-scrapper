import { NextResponse } from "next/server";
import { getStorefrontToken } from "@/lib/scrapers/appStore";
import { friendlyError } from "@/lib/errors";
import { DEFAULT_COUNTRY, isValidCountry } from "@/lib/countries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Fetch the App Store AMP bearer token ONCE per batch. It's the same token for
 * every app/country, so the client grabs it here and passes it into each fast
 * /api/reviews call — avoiding re-downloading Apple's ~2.3 MB token JS bundle
 * for every cell (which is what stalled scraping on a cloud host).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const country = isValidCountry(body.country) ? body.country : DEFAULT_COUNTRY;
    const appId = String(body.appId ?? "").trim() || "389801252"; // default: Instagram

    const token = await getStorefrontToken(country, appId);
    return NextResponse.json({ token });
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 502 });
  }
}

/**
 * Convenience: open this in a browser (locally, where the direct fetch is fast)
 * to copy the token, then paste it into the APPLE_AMP_TOKEN env var on Vercel.
 */
export async function GET() {
  try {
    const token = await getStorefrontToken(DEFAULT_COUNTRY, "389801252");
    return NextResponse.json({
      token,
      fromEnv: Boolean(process.env.APPLE_AMP_TOKEN?.trim()),
      note: "Set this value as APPLE_AMP_TOKEN in your host's env vars (it lasts ~a month).",
    });
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 502 });
  }
}
