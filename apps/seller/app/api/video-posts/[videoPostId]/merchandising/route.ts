import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { updateSellerVideoPostMerchandising } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse, readJsonBody } from "../../../_lib/route";

export const runtime = "nodejs";

type MerchandisingBody = {
  featuredScore?: number | null;
  isPinned?: boolean;
  manualBoost?: number | null;
};

type RouteContext = {
  params: Promise<{
    videoPostId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const { videoPostId } = await context.params;
    const body = await readJsonBody<MerchandisingBody>(request);

    return NextResponse.json(
      await updateSellerVideoPostMerchandising({
        featuredScore: body.featuredScore,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        isPinned: body.isPinned,
        manualBoost: body.manualBoost,
        postId: videoPostId,
        userId: session.user.id,
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
