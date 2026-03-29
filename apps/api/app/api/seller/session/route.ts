import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { NextResponse } from "next/server";
import { jsonErrorResponse } from "../../auth/_lib/auth-route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );

    return NextResponse.json(session);
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
