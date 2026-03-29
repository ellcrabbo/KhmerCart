import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { decideSellerApproval } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../../../_lib/route";

export const runtime = "nodejs";

type DecisionBody = {
  decision?: "APPROVE" | "REJECT";
  note?: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sellerId: string }> }
) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "ADMIN"
    );
    const body = await readJsonBody<DecisionBody>(request);
    const { sellerId } = await context.params;

    if (body.decision !== "APPROVE" && body.decision !== "REJECT") {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "Decision must be APPROVE or REJECT."
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      await decideSellerApproval({
        actorUserId: session.user.id,
        decision: body.decision,
        ipAddress: getClientIpAddress(request),
        note: body.note,
        sellerId,
        userAgent: request.headers.get("user-agent")
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
