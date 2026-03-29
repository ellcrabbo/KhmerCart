import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { listSellerApprovalQueue } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse } from "../../_lib/route";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireRoleFromHeaders(request.headers, readAuthConfig(process.env).jwtSecret, "ADMIN");

    return NextResponse.json(await listSellerApprovalQueue());
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
