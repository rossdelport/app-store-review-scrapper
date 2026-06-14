export type Store = "appstore" | "googleplay";

/** A candidate app returned by a store search. */
export interface AppResult {
  id: string; // numeric trackId (App Store) or package name (Google Play)
  title: string;
  developer: string;
  icon: string;
  url: string;
  score?: number; // overall store rating, if known
  store: Store;
}

/** A single review. We only keep the star rating and the review text. */
export interface Review {
  id: string;
  rating: number; // 1–5
  text: string;
}

export interface SearchResponse {
  results: AppResult[];
}

export interface ReviewsResponse {
  reviews: Review[];
  source: "live" | "sample";
}

export const STORE_LABELS: Record<Store, string> = {
  appstore: "App Store",
  googleplay: "Google Play",
};
