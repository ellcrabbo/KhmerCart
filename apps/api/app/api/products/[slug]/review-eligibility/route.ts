import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import {
  listEligibleProductReviewOrders,
  MarketplaceServiceError,
  prisma,
} from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse } from "../../../auth/_lib/auth-route";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "BUYER",
    );
    const { slug } = await context.params;
    const product = await prisma.product.findFirst({
      select: {
        id: true,
      },
      where: {
        slug,
      },
    });

    if (!product) {
      throw new MarketplaceServiceError("NOT_FOUND", "Product not found.", 404);
    }

    return NextResponse.json(
      await listEligibleProductReviewOrders({
        buyerId: session.user.id,
        productId: product.id,
      }),
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
