import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { createSellerCampaign } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse, readJsonBody } from "../_lib/route";

export const runtime = "nodejs";

type CreateCampaignBody = {
  boostScore?: number | null;
  description?: string;
  endsAt?: string | null;
  productId?: string | null;
  slotType?: "FEED_BOOST" | "PINNED_POST" | "FEATURED_DROP" | null;
  startsAt?: string | null;
  title?: string;
  videoPostId?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const body = await readJsonBody<CreateCampaignBody>(request);

    return NextResponse.json(
      await createSellerCampaign({
        boostScore: body.boostScore,
        description: body.description,
        endsAt: body.endsAt,
        productId: body.productId,
        slotType: body.slotType ?? null,
        startsAt: body.startsAt,
        title: body.title,
        userId: session.user.id,
        videoPostId: body.videoPostId,
      }),
      { status: 201 }
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
