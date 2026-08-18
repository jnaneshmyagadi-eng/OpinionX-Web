import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any;
};

function isPrivatePath(path: string): boolean {
  return (
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/create") ||
    path.startsWith("/chat") ||
    path.startsWith("/notifications") ||
    path.startsWith("/profile") ||
    path.startsWith("/settings") ||
    path.startsWith("/ai") ||
    path.startsWith("/api/")
  );
}

function applyRobotsHeader(
  response: NextResponse,
  path: string
): NextResponse {
  if (isPrivatePath(path)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else {
    response.headers.set("X-Robots-Tag", "index, follow");
  }
  // Never let CDNs cache auth-refreshed responses
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Copy every Set-Cookie from the Supabase response onto a new response
 * (e.g. redirect). Dropping these is the #1 cause of "logged in then logged out".
 */
function copyAuthCookies(
  from: NextResponse,
  to: NextResponse
): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  // Preserve cache headers from setAll when present
  const cacheControl = from.headers.get("Cache-Control");
  if (cacheControl) to.headers.set("Cache-Control", cacheControl);
  return to;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail closed if production env is missing — do not use placeholders at runtime
  if (!url || !key) {
    console.error(
      "[OpinionX] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
    return applyRobotsHeader(supabaseResponse, request.nextUrl.pathname);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[], headers?: Record<string, string>) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        if (headers) {
          Object.entries(headers).forEach(([k, v]) => {
            supabaseResponse.headers.set(k, v);
          });
        }
      },
    },
  });

  // Do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password");
  const isProtected =
    path.startsWith("/create") ||
    path.startsWith("/chat") ||
    path.startsWith("/notifications") ||
    path.startsWith("/profile") ||
    path.startsWith("/settings") ||
    path.startsWith("/ai");

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", path);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyAuthCookies(supabaseResponse, redirectResponse);
    return applyRobotsHeader(redirectResponse, path);
  }

  if (user && isAuthPage && !path.startsWith("/reset-password")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyAuthCookies(supabaseResponse, redirectResponse);
    return applyRobotsHeader(redirectResponse, "/");
  }

  return applyRobotsHeader(supabaseResponse, path);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and the service worker.
     * SW must not go through middleware or cookie logic can interfere.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
