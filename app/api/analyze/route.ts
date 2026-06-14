import { NextResponse } from "next/server";
import { getAnthropic, streamJson, ANALYSIS_SCHEMA } from "@/lib/anthropic";
import type { AnalysisResult, ParsedReview } from "@/lib/analyze/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CHUNK_SIZE = 1200;
const MAX_REVIEWS = 9600; // sampled down to this if more are uploaded

const ANALYZE_SYSTEM = `You are a senior product analyst turning app-store reviews into a product build spec.
Read the reviews and cluster them into three buckets:
- love: things users love or that clearly work — features and qualities to KEEP.
- wantAdded: requested features, missing capabilities, friction, and unmet needs — things to BUILD or improve.
- dontNeed: complaints about bloat, confusing or unwanted features, or things users dislike — things to CUT or AVOID.
Group similar points into distinct themes (aim for the most important 4–10 per bucket; merge near-duplicates).
For each theme give: a short title, a 1–2 sentence detail, a frequency ("low" | "medium" | "high") reflecting how often it shows up, and 1–3 short verbatim quote snippets as examples.
Be specific and actionable — a developer should know exactly what to do. Return only JSON matching the schema.`;

const CONSOLIDATE_SYSTEM = `You are merging several partial analyses of the same app's reviews into one clean analysis.
Deduplicate and merge overlapping themes within each bucket (love, wantAdded, dontNeed), keep the strongest example quotes, and re-rank frequency across the whole set.
Keep the most important 4–10 themes per bucket. Return only JSON matching the schema.`;

function sample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const stride = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * stride)]);
  return out;
}

function formatReviews(reviews: ParsedReview[]): string {
  return reviews
    .map((r) => {
      const star = r.rating ? `[${r.rating}★] ` : "";
      const ctx = r.app ? `(${r.app}) ` : "";
      return `- ${star}${ctx}${r.text.replace(/\s+/g, " ").slice(0, 700)}`;
    })
    .join("\n");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const all: ParsedReview[] = Array.isArray(body.reviews) ? body.reviews : [];
    const reviews = all.filter((r) => r && typeof r.text === "string" && r.text.trim());
    if (reviews.length === 0) {
      return NextResponse.json(
        { error: "No reviews found in the uploaded files." },
        { status: 400 },
      );
    }

    const client = getAnthropic();
    const used = sample(reviews, MAX_REVIEWS);
    const chunks = chunk(used, CHUNK_SIZE);

    let result: AnalysisResult;

    if (chunks.length === 1) {
      result = await streamJson<AnalysisResult>(client, {
        system: ANALYZE_SYSTEM,
        user: `Analyze these ${used.length} reviews:\n\n${formatReviews(chunks[0])}`,
        schema: ANALYSIS_SCHEMA,
        schemaName: "analysis",
        maxTokens: 8000,
      });
    } else {
      // Map: analyze each chunk in parallel.
      const partials = await Promise.all(
        chunks.map((c, i) =>
          streamJson<AnalysisResult>(client, {
            system: ANALYZE_SYSTEM,
            user: `Analyze this batch (${i + 1}/${chunks.length}) of ${c.length} reviews:\n\n${formatReviews(c)}`,
            schema: ANALYSIS_SCHEMA,
            schemaName: "analysis",
            maxTokens: 6000,
          }),
        ),
      );
      // Reduce: consolidate the partial analyses.
      result = await streamJson<AnalysisResult>(client, {
        system: CONSOLIDATE_SYSTEM,
        user: `Merge these ${partials.length} partial analyses into one:\n\n${JSON.stringify(partials)}`,
        schema: ANALYSIS_SCHEMA,
        schemaName: "analysis",
        maxTokens: 8000,
      });
    }

    return NextResponse.json({
      analysis: result,
      reviewCount: reviews.length,
      analyzed: used.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed.";
    const status = /ANTHROPIC_API_KEY/.test(msg) ? 400 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
