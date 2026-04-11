import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { toggleSavedProduct } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse } from "../../../auth/_lib/auth-route";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "BUYER"
    );
    const { productId } = await context.params;

    return NextResponse.json(
      await toggleSavedProduct({
        buyerId: session.user.id,
        productId
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
