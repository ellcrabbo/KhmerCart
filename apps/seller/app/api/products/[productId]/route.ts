import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { archiveSellerProduct, updateSellerProduct } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../../_lib/route";

export const runtime = "nodejs";

type UpdateProductBody = {
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
};

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const body = await readJsonBody<UpdateProductBody>(request);
    const { productId } = await context.params;

    return NextResponse.json(
      await updateSellerProduct({
        actorUserId: session.user.id,
        category: body.category,
        description: body.description,
        images: body.images,
        ipAddress: getClientIpAddress(request),
        moderationNotes: body.moderationNotes,
        name: body.name,
        productId,
        returnPolicy: body.returnPolicy,
        sellerAddress: body.sellerAddress,
        sellerContact: body.sellerContact,
        slug: body.slug,
        status: body.status,
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id
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
    const { productId } = await context.params;

    return NextResponse.json(
      await archiveSellerProduct({
        actorUserId: session.user.id,
        ipAddress: getClientIpAddress(request),
        productId,
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
