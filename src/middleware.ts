import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware: gate every route behind session cookie PRESENCE.
 * The cookie is HMAC-signed; real verification runs server-side on each
 * request via `@/lib/auth#verifySessionToken`. Edge runtime cannot use
 * node:crypto so we cannot fully verify here — a missing cookie is the
 * only signal needed to decide whether to redirect to /unlock.
 *
 * This two-layer check is safe because:
 *   1. The signed cookie is generated with a server-only key.
 *   2. Every server page / action that reads the cookie re-verifies the HMAC.
 *   3. Edge middleware's job is only to redirect anonymous users, not
 *      to authorize sensitive operations.
 */
const SESSION_COOKIE = "brain-session";
const PUBLIC_PATHS = new Set(["/unlock", "/setup"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/unlock";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static asset paths and the app manifest.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
