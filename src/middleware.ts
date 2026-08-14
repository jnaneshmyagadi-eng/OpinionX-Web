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
  return response;
}

/**
 * When creating a NEW response (e.g. redirect), Supabase auth cookies from
 * supabaseResponse MUST be copied over. Dropping them causes the browser and
 * server to go out of sync and the session appears lost on the next request.
 * @see https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */
function copyAuthCookies(
  from: NextResponse,
  to: NextResponse
): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  return to;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

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
  // getUser() validates the JWT and triggers token refresh via setAll.
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

  // IMPORTANT: return supabaseResponse so refreshed auth cookies reach the browser
  return applyRobotsHeader(supabaseResponse, path);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
