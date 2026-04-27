import { AuthError, readAuthConfig } from "@khmercart/core/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isApiErrorLike(
  error: unknown
): error is { code: string; message: string; status: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "status" in error &&
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    typeof error.status === "number"
  );
}

export function jsonErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    const response = NextResponse.json(
      {
        error: error.code,
        message: error.message
      },
      { status: error.status }
    );

    if (typeof error.retryAfterSeconds === "number") {
      response.headers.set("retry-after", String(error.retryAfterSeconds));
    }

    return response;
  }

  if (isApiErrorLike(error)) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message
      },
      { status: error.status }
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong."
    },
    { status: 500 }
  );
}

export function getClientIpAddress(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (!forwardedFor) {
    return null;
  }

  return forwardedFor.split(",")[0]?.trim() ?? null;
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AuthError("BAD_REQUEST", "Request body must be valid JSON.", 400);
  }
}

export function getAuthConfig() {
  return readAuthConfig(process.env);
}
