import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { toggleFollowedSeller } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse } from "../../../auth/_lib/auth-route";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    sellerId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "BUYER"
    );
    const { sellerId } = await context.params;

    return NextResponse.json(
      await toggleFollowedSeller({
        buyerId: session.user.id,
        sellerId
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
