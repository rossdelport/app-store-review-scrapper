import type { AnalysisResult } from "@/lib/analyze/types";

/** A research project: target app + competitors + reviews + analysis + prompt. */
export interface Project {
  id: string;
  user_id: string;
  name: string;
  niche: string | null;
  created_at: string;
  updated_at: string;
}

/** One selected app within a project (the target or a competitor). */
export interface ProjectApp {
  id: string;
  project_id: string;
  store: "appstore" | "googleplay";
  app_id: string;
  title: string;
  developer: string | null;
  icon: string | null;
  url: string | null;
  score: number | null;
  rating_count: number | null;
  is_target: boolean;
  created_at: string;
}

/** A persisted review row (from scraping or an upload). */
export interface ReviewRow {
  id: string;
  project_id: string;
  store: string | null;
  app_id: string | null;
  app_title: string | null;
  country: string | null;
  rating: number | null;
  text: string;
  source: string | null;
  created_at: string;
}

/** A saved Claude analysis for a project. */
export interface AnalysisRow {
  id: string;
  project_id: string;
  result: AnalysisResult;
  review_count: number | null;
  analyzed_count: number | null;
  model: string | null;
  created_at: string;
}

/** A saved generated build-spec prompt. */
export interface PromptRow {
  id: string;
  project_id: string;
  content: string;
  created_at: string;
}
