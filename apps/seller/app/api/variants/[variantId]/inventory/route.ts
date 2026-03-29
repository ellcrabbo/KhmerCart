import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { updateVariantInventory } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../../../_lib/route";

export const runtime = "nodejs";

type UpdateInventoryBody = {
  onHandQuantity: number;
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
    const body = await readJsonBody<UpdateInventoryBody>(request);
    const { variantId } = await context.params;

    return NextResponse.json(
      await updateVariantInventory({
        actorUserId: session.user.id,
        ipAddress: getClientIpAddress(request),
        onHandQuantity: body.onHandQuantity,
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id,
        variantId
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
