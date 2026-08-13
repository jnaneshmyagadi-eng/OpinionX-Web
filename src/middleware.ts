import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any;
};

/** Paths that must stay out of search indexes */
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

/** Apply robots headers so public pages are indexable */
function applyRobotsHeader(
  response: NextResponse,
  path: string
): NextResponse {
  if (isPrivatePath(path)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else {
    // Explicitly allow indexing — overrides accidental noindex where possible
    response.headers.set("X-Robots-Tag", "index, follow");
  }
  return response;
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
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

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
    return applyRobotsHeader(NextResponse.redirect(redirectUrl), path);
  }

  if (user && isAuthPage && !path.startsWith("/reset-password")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return applyRobotsHeader(NextResponse.redirect(redirectUrl), "/");
  }

  return applyRobotsHeader(supabaseResponse, path);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
