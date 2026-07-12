import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTE_ACCESS, routeKey, canView, landingFor } from "@/lib/permissions";
import type { Role } from "@/lib/types";

// Duplicated from auth.ts so this file stays Edge-safe (no bcryptjs / pg import).
const SESSION_COOKIE = "session";

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function updateSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Verify the JWT session token (Edge-safe via jose).
  let user: { id: string; email: string; role: Role } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secretKey());
      if (payload.sub) {
        user = {
          id: payload.sub,
          email: String(payload.email ?? ""),
          role: payload.role as Role,
        };
      }
    } catch {
      // invalid or expired token — treat as unauthenticated
    }
  }

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup");
  // The marketing landing page ("/") is open to everyone, logged in or not.
  const isPublic = isAuthRoute || path === "/" || path.startsWith("/auth");

  // Unauthenticated visitors get bounced to login for protected pages.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated users on login/signup get sent to the dashboard.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // RBAC route guard: block direct navigation to pages this role can't view.
  // The role is embedded in the JWT, so no database query is needed.
  if (user && !isPublic && ROUTE_ACCESS[routeKey(path)]) {
    if (!canView(user.role, path)) {
      const url = request.nextUrl.clone();
      url.pathname = landingFor(user.role);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request });
}
