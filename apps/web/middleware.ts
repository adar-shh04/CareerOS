import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

import { getApiBaseUrl } from "./lib/config";

const authPaths = ["/login", "/register"];

/**
 * True when Better Auth confirms the request's session is currently valid.
 * Uses the same endpoint as lib/server-session.ts, so middleware and server
 * components agree about who is signed in.
 */
async function hasValidSession(request: NextRequest): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/get-session`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const payload = (await response.json().catch(() => null)) as {
      session?: unknown;
    } | null;
    return Boolean(payload?.session);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Better Auth prefixes the cookie with "__Secure-" on HTTPS / in production;
  // getSessionCookie recognizes both the prefixed and unprefixed names.
  const sessionCookie = getSessionCookie(request);
  const isAuthPage = authPaths.some((path) => pathname.startsWith(path));
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");

  // Optimistic check only: protected pages validate the session server-side.
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Only send signed-in users away from /login, /register and / when the
  // session is actually valid; a stale or revoked cookie must still be able to
  // reach the login page (otherwise /login ⇄ /dashboard would loop).
  if ((isAuthPage || pathname === "/") && sessionCookie) {
    if (await hasValidSession(request)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/onboarding", "/dashboard/:path*"],
};
