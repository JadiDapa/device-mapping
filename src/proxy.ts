import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * proxy.ts (not middleware.ts, per Next.js 16). Only an OPTIMISTIC check:
 * getSessionCookie reads cookie presence without validating it. The real gate
 * is requireUser()/getSession() in src/app/(app)/layout.tsx and in every
 * Server Action; this proxy only avoids a flash of app UI for obviously
 * signed-out visitors.
 *
 * Public: /login, /api/auth, /api/health, /api/uploads and
 * /api/camera-points (their Route Handlers answer 401 JSON themselves), /print (guarded by a signed export
 * token, added in M6), Next internals and static assets.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api/auth|api/health|api/uploads|api/camera-points|print|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml)$).*)",
  ],
};
