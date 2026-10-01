/**
 * @file src/middleware.ts
 * Next.js Edge Middleware — route protection.
 *
 * Strategy:
 * - /login, /api/auth/** → public (always allow)
 * - /api/** → must be authenticated (returns 401 JSON)
 * - all other paths → redirect to /login if not authenticated
 *
 * Fine-grained permission checks are done INSIDE each route handler
 * using requirePermission() from @/lib/permissions/guard.
 *
 * BR-SEC-001: backend authorization mandatory.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/auth",
  "/api/availability",
  "/api/reservations/lookup",
  "/api/payments/webhook",
  "/api/cron",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  const isPublic =
    PUBLIC_PATHS.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/"))) ||
    (pathname === "/api/reservations" && req.method === "POST");

  if (isPublic) return NextResponse.next();

  // No session → redirect or 401
  if (!req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (png, svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
