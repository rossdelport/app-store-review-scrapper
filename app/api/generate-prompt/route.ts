import { NextResponse } from "next/server";
import { getAnthropic, streamText } from "@/lib/anthropic";
import type { AnalysisResult } from "@/lib/analyze/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SYSTEM = `You are a principal product manager and senior iOS engineer. You write an EXHAUSTIVE, copy-paste-ready build specification that a developer will hand directly to Claude Code to build version 1.0 of a native iOS app (Swift + SwiftUI) that will PASS Apple App Store review on first submission.

Derive the product from the provided review analysis:
- "love" = strengths to preserve and lean into.
- "wantAdded" = the feature set and improvements to prioritise (this is the core of the MVP).
- "dontNeed" = explicit non-goals — call these out as things NOT to build.

Write a massive, well-structured Markdown document. Be concrete and opinionated — make real product and technical decisions rather than listing options. Use these sections:

1. Product vision & positioning (one paragraph, then a crisp one-line pitch).
2. Target users & top jobs-to-be-done (grounded in the reviews).
3. Core principles (what to optimise for; pulled from "love").
4. MVP feature list for 1.0 — numbered, each with: what it does, why (cite the review theme), acceptance criteria. Prioritise ruthlessly from "wantAdded" + "love".
5. Explicit NON-goals for 1.0 (from "dontNeed" and anything out of scope) — be specific.
6. Screen-by-screen UX (each screen: purpose, key UI, primary actions, navigation).
7. Information architecture & data model (entities, fields, relationships; local + any sync).
8. Technical architecture (SwiftUI, state management, persistence e.g. SwiftData/Core Data, networking, modules, folder structure).
9. Third-party services & dependencies (only if needed; justify each).
10. App Store Review Guidelines compliance checklist for 1.0 acceptance — concrete items: privacy policy + nutrition labels (App Privacy), account deletion if accounts exist, Sign in with Apple if any third-party social login is offered, no broken links/placeholder content, appropriate age rating, no private APIs, IAP via StoreKit if selling digital goods, permission usage strings (Info.plist) for every capability used, crash-free core flows, support URL, etc. Tailor it to this specific app.
11. Build milestones (a sequenced plan Claude Code can execute step by step).
12. Definition of done for 1.0 (a checklist).

Make it long and thorough — this should be everything a developer needs, with nothing important left implicit. Output only the Markdown document (no preamble, no closing remarks).`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const analysis = body.analysis as AnalysisResult | undefined;
    const appName = typeof body.appName === "string" ? body.appName.trim() : "";
    if (!analysis || !analysis.love) {
      return NextResponse.json({ error: "Run the analysis first." }, { status: 400 });
    }

    const client = getAnthropic();
    const context = [
      appName ? `App name / concept: ${appName}` : "App name: (decide a fitting one)",
      "Target platform: iOS (Swift + SwiftUI), App Store 1.0 submission.",
      "",
      "REVIEW ANALYSIS (JSON):",
      JSON.stringify(analysis, null, 2),
    ].join("\n");

    const prompt = await streamText(client, {
      system: SYSTEM,
      user: `Write the full build specification.\n\n${context}`,
      maxTokens: 32000,
    });

    return NextResponse.json({ prompt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Prompt generation failed.";
    const status = /ANTHROPIC_API_KEY/.test(msg) ? 400 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
