import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { requestSellerDocumentUpload } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../../_lib/route";

export const runtime = "nodejs";

type UploadRequestBody = {
  contentType?: string;
  documentType?: string;
  fileName?: string;
  sizeBytes?: number;
};

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const body = await readJsonBody<UploadRequestBody>(request);

    return NextResponse.json(
      await requestSellerDocumentUpload({
        actorUserId: session.user.id,
        contentType: body.contentType,
        documentType: body.documentType,
        fileName: body.fileName,
        ipAddress: getClientIpAddress(request),
        sizeBytes: body.sizeBytes,
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
