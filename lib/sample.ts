import type { AppResult, Review } from "./types";

/** Demo apps for both columns so the full flow works without network access. */
export const SAMPLE_APPSTORE_APPS: AppResult[] = [
  { id: "sa1", title: "Bookshelf", developer: "VitalSource Technologies", icon: "", url: "#", score: 4.7, ratingCount: 78000, genre: "Education", price: "Free", free: true, released: "2010-02-03", store: "appstore" },
  { id: "sa2", title: "Bookshelf — Your virtual library", developer: "SquidBit d.o.o.", icon: "", url: "#", score: 4.8, ratingCount: 2800, genre: "Book", price: "Free", free: true, released: "2018-05-01", store: "appstore" },
  { id: "sa3", title: "Bookshelf: Book Tracker & List", developer: "Alexander Gerrese", icon: "", url: "#", score: 4.6, ratingCount: 4000, genre: "Book", price: "Free", free: true, released: "2019-08-12", store: "appstore" },
  { id: "sa4", title: "TBR — Bookshelf", developer: "TBR - Bookshelf, LLC", icon: "", url: "#", score: 4.5, ratingCount: 4300, genre: "Book", price: "Free", free: true, released: "2021-01-20", store: "appstore" },
  { id: "sa5", title: "Goodreads", developer: "Goodreads", icon: "", url: "#", score: 4.8, ratingCount: 730000, genre: "Book", price: "Free", free: true, released: "2010-01-01", store: "appstore" },
  { id: "sa6", title: "Apple Books", developer: "Apple", icon: "", url: "#", score: 4.4, ratingCount: 81700, genre: "Book", price: "Free", free: true, released: "2010-04-02", store: "appstore" },
];

export const SAMPLE_GOOGLEPLAY_APPS: AppResult[] = [
  { id: "com.squidbit.bookshelf", title: "Bookshelf — Your virtual library", developer: "SquidBit", icon: "", url: "#", score: 4.6, ratingCount: 1500, installs: "1M+", genre: "Books & Reference", price: "Free", free: true, store: "googleplay" },
  { id: "com.tcreations.bookshelf", title: "Bookshelf", developer: "T.creations", icon: "", url: "#", score: 4.2, ratingCount: 16, installs: "50K+", genre: "Books & Reference", price: "Free", free: true, store: "googleplay" },
  { id: "com.deseretbook.bookshelf", title: "Deseret Bookshelf", developer: "Deseret Book", icon: "", url: "#", score: 4.8, ratingCount: 1100, installs: "500K+", genre: "Books & Reference", price: "Free", free: true, store: "googleplay" },
  { id: "com.goodreads", title: "Goodreads", developer: "Goodreads", icon: "", url: "#", score: 4.6, ratingCount: 12000, installs: "10M+", genre: "Books & Reference", price: "Free", free: true, store: "googleplay" },
  { id: "com.handylibrary", title: "Handy Library — Book Organizer", developer: "Bookshare Co., Ltd", icon: "", url: "#", score: 4.0, ratingCount: 770, installs: "1M+", genre: "Books & Reference", price: "Free", free: true, store: "googleplay" },
];

const SAMPLE_TEXTS = [
  "Absolutely love this app, syncing across devices is instant.",
  "Great for quick notes but needs a proper dark mode.",
  "Crashes every time I attach a photo since the last update.",
  "Search is lightning fast and the widgets are genuinely useful.",
  "They moved basic features behind a subscription. Uninstalling.",
  "It's fine, does what it says but the interface feels dated.",
  "Customer support replied within an hour and fixed my issue.",
  "Offline mode is rock solid on the train. Highly recommend.",
  "Lost two weeks of notes after a forced logout. Be careful.",
  "Clean, fast, no ads on the free tier. Exactly what I wanted.",
];

/** Deterministic-ish mock reviews for a given app/country in demo mode. */
export function mockReviews(seed: number): Review[] {
  const n = 4 + (seed % 9); // 4–12 reviews
  const out: Review[] = [];
  for (let i = 0; i < n; i++) {
    const idx = (seed * 7 + i * 3) % SAMPLE_TEXTS.length;
    out.push({
      id: `${seed}-${i}`,
      rating: 1 + ((seed + i) % 5),
      text: SAMPLE_TEXTS[idx],
    });
  }
  return out;
}
