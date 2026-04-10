import { getBuyerVideoFeed } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse } from "../auth/_lib/auth-route";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitValue = searchParams.get("limit");

    return NextResponse.json(
      await getBuyerVideoFeed({
        cursor: searchParams.get("cursor") ?? undefined,
        limit: limitValue ? Number(limitValue) : undefined
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
