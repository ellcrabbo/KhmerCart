import { AuthError, readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const publicPaths = new Set(["/api/health", "/favicon.ico", "/favicon.png", "/health", "/login"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (publicPaths.has(pathname) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  try {
    await requireRoleFromHeaders(request.headers, readAuthConfig(process.env).jwtSecret, "SELLER");

    return NextResponse.next();
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 401;

    if (status === 401) {
      const location = new URL("/login", request.url);

      location.searchParams.set("error", "session");
      location.searchParams.set("next", `${pathname}${search}`);

      return NextResponse.redirect(location);
    }

    if (status === 403) {
      const location = new URL("/login", request.url);

      location.searchParams.set("error", "forbidden");
      location.searchParams.set("next", `${pathname}${search}`);

      return NextResponse.redirect(location);
    }

    return new NextResponse("UNAUTHORIZED", { status });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
