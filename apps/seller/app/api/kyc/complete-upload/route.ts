import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { markSellerDocumentUploaded, SellerServiceError } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../../_lib/route";

export const runtime = "nodejs";

type CompleteUploadBody = {
  documentId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const body = await readJsonBody<CompleteUploadBody>(request);

    if (!body.documentId) {
      throw new SellerServiceError("BAD_REQUEST", "Document id is required.", 400);
    }

    return NextResponse.json(
      await markSellerDocumentUploaded({
        actorUserId: session.user.id,
        documentId: body.documentId,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
