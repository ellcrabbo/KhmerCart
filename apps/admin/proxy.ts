import { AuthError, readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const publicPaths = new Set(["/api/health", "/health"]);

export async function proxy(request: NextRequest) {
  if (publicPaths.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  try {
    await requireRoleFromHeaders(request.headers, readAuthConfig(process.env).jwtSecret, "ADMIN");

    return NextResponse.next();
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 401;

    return new NextResponse(status === 403 ? "FORBIDDEN" : "UNAUTHORIZED", {
      status
    });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
