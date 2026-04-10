import { AuthError } from "@khmercart/core/auth";
import {
  SellerServiceError,
  ShippingServiceError,
  VideoPostServiceError
} from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function jsonErrorResponse(error: unknown): NextResponse {
  if (
    error instanceof AuthError ||
    error instanceof SellerServiceError ||
    error instanceof ShippingServiceError ||
    error instanceof VideoPostServiceError
  ) {
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
    throw new SellerServiceError("BAD_REQUEST", "Request body must be valid JSON.", 400);
  }
}
