export type Bucket = "love" | "wantAdded" | "dontNeed";

/** A parsed review row from an uploaded CSV. */
export interface ParsedReview {
  rating?: number;
  text: string;
  app?: string;
  store?: string;
  country?: string;
}

/** One clustered insight within a bucket. */
export interface Insight {
  title: string;
  detail: string;
  frequency: "low" | "medium" | "high";
  examples: string[];
}

/** The full analysis: three columns of insights. */
export interface AnalysisResult {
  love: Insight[];
  wantAdded: Insight[];
  dontNeed: Insight[];
}

export const BUCKET_META: Record<
  Bucket,
  { label: string; blurb: string; accent: string }
> = {
  love: {
    label: "Love",
    blurb: "Keep these — users value them",
    accent: "emerald",
  },
  wantAdded: {
    label: "Want Added",
    blurb: "Build these — requested & unmet",
    accent: "blue",
  },
  dontNeed: {
    label: "Don't Need",
    blurb: "Cut / avoid these",
    accent: "slate",
  },
};
