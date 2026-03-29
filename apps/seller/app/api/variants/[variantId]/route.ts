import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { archiveSellerProductVariant, updateSellerProductVariant } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../../_lib/route";

export const runtime = "nodejs";

type UpdateVariantBody = {
  attributes?: Record<string, string>;
  compareAtPriceMinor?: number | null;
  currency?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  name?: string;
  position?: number;
  priceMinor?: number | null;
  reorderPoint?: number | null;
  sku?: string;
  weightGrams?: number | null;
};

type RouteContext = {
  params: Promise<{
    variantId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const body = await readJsonBody<UpdateVariantBody>(request);
    const { variantId } = await context.params;

    return NextResponse.json(
      await updateSellerProductVariant({
        actorUserId: session.user.id,
        attributes: body.attributes,
        compareAtPriceMinor: body.compareAtPriceMinor,
        currency: body.currency,
        ipAddress: getClientIpAddress(request),
        isActive: body.isActive,
        isDefault: body.isDefault,
        name: body.name,
        position: body.position,
        priceMinor: body.priceMinor,
        reorderPoint: body.reorderPoint,
        sku: body.sku,
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id,
        variantId,
        weightGrams: body.weightGrams
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const { variantId } = await context.params;

    return NextResponse.json(
      await archiveSellerProductVariant({
        actorUserId: session.user.id,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id,
        variantId
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
