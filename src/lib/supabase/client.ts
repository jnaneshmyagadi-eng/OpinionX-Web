import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 * During `next build` prerender, env may be unset — use placeholders so the
 * build completes. Runtime on Vercel always has NEXT_PUBLIC_* set.
 */
export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  return createBrowserClient(url, key);
}
