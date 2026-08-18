import { createBrowserClient } from "@supabase/ssr";

/**
 * Singleton browser Supabase client.
 * Reusing one instance avoids competing cookie writers across components.
 * Runtime on Vercel must have NEXT_PUBLIC_* set; placeholders are build-only.
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  browserClient = createBrowserClient(url, key, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      // secure is set automatically by @supabase/ssr on https
    },
  });

  return browserClient;
}
