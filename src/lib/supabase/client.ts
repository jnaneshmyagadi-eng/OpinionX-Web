import { createBrowserClient } from "@supabase/ssr";

/**
 * Singleton browser Supabase client.
 * Cookies are the source of truth (shared with middleware).
 * Login/signup write cookies via /auth/* route handlers for reliability.
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window === "undefined") {
    // Never cache a server-evaluated instance into the singleton
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://placeholder.supabase.co";
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";
    return createBrowserClient(url, key);
  }

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
    },
  });

  return browserClient;
}
