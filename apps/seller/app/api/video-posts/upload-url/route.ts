import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { requestSellerVideoPostUpload } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse, readJsonBody } from "../../_lib/route";

export const runtime = "nodejs";

type UploadRequestBody = {
  contentType?: string;
  fileName?: string;
  fileRole?: string;
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
      await requestSellerVideoPostUpload({
        contentType: body.contentType,
        fileName: body.fileName,
        fileRole: body.fileRole,
        userId: session.user.id
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
