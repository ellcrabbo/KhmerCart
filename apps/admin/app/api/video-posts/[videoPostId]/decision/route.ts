import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { decideVideoPostModeration } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../../../_lib/route";

export const runtime = "nodejs";

type DecisionBody = {
  decision?: "APPROVE" | "REJECT" | "HIDE";
  note?: string;
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
      "ADMIN"
    );
    const { videoPostId } = await context.params;
    const body = await readJsonBody<DecisionBody>(request);

    if (!body.decision) {
      return NextResponse.json(
        {
          message: "Decision is required."
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      await decideVideoPostModeration({
        actorUserId: session.user.id,
        decision: body.decision,
        ipAddress: getClientIpAddress(request),
        note: body.note,
        userAgent: request.headers.get("user-agent"),
        videoPostId
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
