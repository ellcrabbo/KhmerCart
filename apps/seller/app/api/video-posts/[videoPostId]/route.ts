import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { processSellerVideoPost } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getClientIpAddress,
  jsonErrorResponse,
  readJsonBody
} from "../../_lib/route";

export const runtime = "nodejs";

type UpdateVideoPostBody = {
  status?: string;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ videoPostId: string }> }
) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const { videoPostId } = await context.params;
    const body = await readJsonBody<UpdateVideoPostBody>(request);

    return NextResponse.json(
      await processSellerVideoPost({
        actorUserId: session.user.id,
        ipAddress: getClientIpAddress(request),
        postId: videoPostId,
        targetStatus: body.status,
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
