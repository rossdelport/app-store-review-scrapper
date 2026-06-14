import type { Store } from "./types";

export interface ParsedStoreUrl {
  store: Store;
  id: string;
  country?: string;
}

/**
 * If the input is a store URL, pull out the store and app id so we can
 * skip the search step. Returns null for plain search terms.
 *
 *   App Store:    https://apps.apple.com/us/app/instagram/id389801252
 *   Google Play:  https://play.google.com/store/apps/details?id=com.instagram.android
 */
export function parseStoreUrl(input: string): ParsedStoreUrl | null {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (host.includes("apps.apple.com") || host.includes("itunes.apple.com")) {
    const idMatch = url.pathname.match(/id(\d+)/);
    if (idMatch) {
      const segments = url.pathname.split("/").filter(Boolean);
      const country = segments[0]?.length === 2 ? segments[0] : undefined;
      return { store: "appstore", id: idMatch[1], country };
    }
  }

  if (host.includes("play.google.com")) {
    const id = url.searchParams.get("id");
    if (id) {
      const country = url.searchParams.get("gl")?.toLowerCase() || undefined;
      return { store: "googleplay", id, country };
    }
  }

  return null;
}
