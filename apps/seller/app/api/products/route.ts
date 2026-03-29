import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { createSellerProduct, getSellerCatalogData } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../_lib/route";

export const runtime = "nodejs";

type CreateProductBody = {
  category?: string;
  description?: string;
  images?: Array<{
    altText?: string;
    isPrimary?: boolean;
    url?: string;
  }>;
  moderationNotes?: string;
  name?: string;
  returnPolicy?: string;
  sellerAddress?: string;
  sellerContact?: string;
  slug?: string;
  status?: string;
  variants?: Array<{
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
  }>;
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );

    return NextResponse.json(await getSellerCatalogData(session.user.id));
  } catch (error) {
    return jsonErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const body = await readJsonBody<CreateProductBody>(request);

    return NextResponse.json(
      await createSellerProduct({
        actorUserId: session.user.id,
        category: body.category,
        description: body.description,
        images: body.images,
        ipAddress: getClientIpAddress(request),
        moderationNotes: body.moderationNotes,
        name: body.name,
        returnPolicy: body.returnPolicy,
        sellerAddress: body.sellerAddress,
        sellerContact: body.sellerContact,
        slug: body.slug,
        status: body.status,
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id,
        variants: body.variants
      }),
      { status: 201 }
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
