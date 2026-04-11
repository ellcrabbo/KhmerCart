import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import {
  createProductReview,
  listProductReviews,
  MarketplaceServiceError,
  prisma
} from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse, readJsonBody } from "../../../auth/_lib/auth-route";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

type CreateReviewBody = {
  body?: string;
  headline?: string;
  orderId?: string;
  rating?: number;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const product = await prisma.product.findFirst({
      select: {
        id: true
      },
      where: {
        slug
      }
    });

    if (!product) {
      throw new MarketplaceServiceError("NOT_FOUND", "Product not found.", 404);
    }

    return NextResponse.json(await listProductReviews(product.id));
  } catch (error) {
    return jsonErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "BUYER"
    );
    const { slug } = await context.params;
    const body = await readJsonBody<CreateReviewBody>(request);
    const product = await prisma.product.findFirst({
      select: {
        id: true
      },
      where: {
        slug
      }
    });

    if (!product) {
      throw new MarketplaceServiceError("NOT_FOUND", "Product not found.", 404);
    }

    return NextResponse.json(
      await createProductReview({
        body: body.body,
        buyerId: session.user.id,
        headline: body.headline,
        orderId: body.orderId ?? "",
        productId: product.id,
        rating: body.rating ?? 0
      }),
      { status: 201 }
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
