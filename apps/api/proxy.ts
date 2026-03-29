import { AuthError, readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const publicPaths = new Set(["/api/health", "/health"]);

function getRequiredRole(pathname: string) {
  if (pathname.startsWith("/api/admin")) {
    return "ADMIN" as const;
  }

  if (pathname === "/api/checkout" || pathname.startsWith("/api/cart")) {
    return "BUYER" as const;
  }

  if (pathname.startsWith("/api/seller")) {
    return "SELLER" as const;
  }

  if (pathname.startsWith("/api/buyer")) {
    return "BUYER" as const;
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.has(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks/")
  ) {
    return NextResponse.next();
  }

  const requiredRole = getRequiredRole(pathname);

  if (!requiredRole) {
    return NextResponse.next();
  }

  try {
    await requireRoleFromHeaders(request.headers, readAuthConfig(process.env).jwtSecret, requiredRole);

    return NextResponse.next();
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 401;

    return NextResponse.json(
      {
        error: status === 403 ? "FORBIDDEN" : "UNAUTHORIZED"
      },
      { status }
    );
  }
}

export const config = {
  matcher: ["/api/:path*"]
};
