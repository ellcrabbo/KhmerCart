import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { getSellerShippingQueueData } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse } from "../_lib/route";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );

    return NextResponse.json(await getSellerShippingQueueData(session.user.id));
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
