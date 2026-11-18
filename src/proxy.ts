import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * proxy.ts (not middleware.ts, per Next.js 16) protecting
 * /admin/*. This is only an OPTIMISTIC check: getSessionCookie reads cookie
 * presence without validating it. The real gate is the server-side
 * auth.api.getSession() call in src/app/admin/layout.tsx; this proxy only avoids
 * a flash of admin UI for obviously signed-out visitors.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
