"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/** Browser Supabase client. Reads/writes go through the signed-in user's JWT, so
 *  Row Level Security scopes everything to that user. Guard calls behind
 *  `isSupabaseConfigured` — creating this with empty config won't throw, but
 *  using it would. */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
