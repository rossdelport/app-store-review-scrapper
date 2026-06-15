// Supabase connection config, read from public env vars. Kept in one place so
// the rest of the app can cheaply check whether the backend is configured and
// degrade gracefully (the legacy scraper + /analyze must keep working even when
// Supabase env vars aren't set, e.g. before they're added to Vercel).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True only when both the URL and the publishable/anon key are present. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
