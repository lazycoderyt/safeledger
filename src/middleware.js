import { NextResponse } from "next/server";

/**
 * middleware.js
 *
 * This intentionally does ONLY the low-risk direction:
 *   already-logged-in (per the `session` cookie) -> skip the marketing
 *   page / auth forms, go straight to /dashboard.
 *
 * It deliberately does NOT redirect people AWAY from /dashboard when the
 * cookie is missing. That used to happen here, but the cookie is written
 * by client JS (see src/utils/session.js) right as a login/token-refresh
 * resolves, and different browsers commit that write to the network
 * stack on different timing relative to the next navigation's request
 * (Safari/iOS in particular can lag Chrome/Android here). Depending on
 * that timing to gate access produced real bounce loops on iOS.
 *
 * Real protection for /dashboard/** now lives in React, reading
 * Firebase's own client-side auth truth directly — see
 * src/app/dashboard/admin/layout.js and src/app/dashboard/user/layout.js.
 * That's slower by a frame or two (loading spinner) but it's correct
 * everywhere, because it never depends on cookie propagation timing.
 *
 * The `session` cookie itself is still not cryptographically verified —
 * Firestore Security Rules remain the actual authorization boundary.
 */

const SESSION_COOKIE = "session";
const AUTH_PATHS = ["/auth/sign-in", "/auth/sign-up"];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isAuthRoute = AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isHomeRoute = pathname === "/";

  if (hasSession && (isHomeRoute || isAuthRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth/:path*"],
};
