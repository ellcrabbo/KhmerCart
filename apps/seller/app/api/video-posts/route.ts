import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import {
  createSellerVideoPost,
  getSellerVideoPostsData
} from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getClientIpAddress,
  jsonErrorResponse,
  readJsonBody
} from "../_lib/route";

export const runtime = "nodejs";

type CreateVideoPostBody = {
  aspectRatio?: number;
  caption?: string;
  durationSec?: number;
  posterKey?: string;
  productId?: string;
  status?: string;
  videoKey?: string;
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );

    return NextResponse.json(await getSellerVideoPostsData(session.user.id));
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
    const body = await readJsonBody<CreateVideoPostBody>(request);

    return NextResponse.json(
      await createSellerVideoPost({
        actorUserId: session.user.id,
        aspectRatio: body.aspectRatio,
        caption: body.caption,
        durationSec: body.durationSec,
        ipAddress: getClientIpAddress(request),
        posterKey: body.posterKey,
        productId: body.productId,
        status: body.status,
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id,
        videoKey: body.videoKey
      }),
      { status: 201 }
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
