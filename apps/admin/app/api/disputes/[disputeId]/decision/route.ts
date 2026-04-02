import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { decideDispute } from "@khmercart/db";
import { DisputeStatus } from "@khmercart/db/prisma-client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../../../_lib/route";

export const runtime = "nodejs";

type DecisionBody = {
  adminNote?: string;
  resolvedRefundMinor?: number | null;
  resolutionNote?: string;
  status?: DisputeStatus;
};

const allowedStatuses = new Set<string>([
  DisputeStatus.UNDER_REVIEW,
  DisputeStatus.REFUND_APPROVED,
  DisputeStatus.REJECTED,
  DisputeStatus.CLOSED
]);

function isAllowedStatus(
  status: DisputeStatus | undefined
): status is Exclude<DisputeStatus, "OPEN"> {
  return typeof status === "string" && allowedStatuses.has(status);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ disputeId: string }> }
) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "ADMIN"
    );
    const body = await readJsonBody<DecisionBody>(request);
    const { disputeId } = await context.params;

    if (!isAllowedStatus(body.status)) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "Status must be UNDER_REVIEW, REFUND_APPROVED, REJECTED, or CLOSED."
        },
        { status: 400 }
      );
    }

    const status = body.status;

    return NextResponse.json(
      await decideDispute({
        actorUserId: session.user.id,
        adminNote: body.adminNote,
        disputeId,
        ipAddress: getClientIpAddress(request),
        resolvedRefundMinor: body.resolvedRefundMinor,
        resolutionNote: body.resolutionNote,
        status,
        userAgent: request.headers.get("user-agent")
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
