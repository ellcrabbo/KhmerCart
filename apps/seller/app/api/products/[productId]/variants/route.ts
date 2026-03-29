import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { createSellerProductVariant } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../../../_lib/route";

export const runtime = "nodejs";

type CreateVariantBody = {
  attributes?: Record<string, string>;
  compareAtPriceMinor?: number;
  currency?: string;
  inventoryQuantity?: number;
  isActive?: boolean;
  isDefault?: boolean;
  name?: string;
  position?: number;
  priceMinor?: number;
  reorderPoint?: number;
  sku?: string;
  weightGrams?: number;
};

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
      "SELLER"
    );
    const body = await readJsonBody<CreateVariantBody>(request);
    const { productId } = await context.params;

    return NextResponse.json(
      await createSellerProductVariant({
        actorUserId: session.user.id,
        attributes: body.attributes,
        compareAtPriceMinor: body.compareAtPriceMinor,
        currency: body.currency,
        inventoryQuantity: body.inventoryQuantity,
        ipAddress: getClientIpAddress(request),
        isActive: body.isActive,
        isDefault: body.isDefault,
        name: body.name,
        position: body.position,
        priceMinor: body.priceMinor,
        productId,
        reorderPoint: body.reorderPoint,
        sku: body.sku,
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id,
        weightGrams: body.weightGrams
      }),
      { status: 201 }
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
