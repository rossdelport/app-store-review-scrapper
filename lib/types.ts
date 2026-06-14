export type Store = "appstore" | "googleplay";

/** A candidate app returned by a store search. */
export interface AppResult {
  id: string; // numeric trackId (App Store) or package name (Google Play)
  title: string;
  developer: string;
  icon: string;
  url: string;
  score?: number; // average rating
  ratingCount?: number; // number of ratings
  installs?: string; // Google Play, e.g. "1M+"
  genre?: string; // category
  price?: string; // "Free" or "$1.99"
  free?: boolean;
  released?: string; // ISO date or year, used to show app age
  store: Store;
}

/** A single review — we keep the star rating and the text. */
export interface Review {
  id: string;
  rating: number; // 1–5
  text: string;
}

/** A review tagged with its source, for the combined CSV export. */
export interface CollectedReview {
  store: Store;
  app: string;
  appId: string;
  country: string;
  rating: number;
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
