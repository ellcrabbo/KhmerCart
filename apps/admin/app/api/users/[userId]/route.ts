import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { updateUserAccess } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../../_lib/route";

export const runtime = "nodejs";

type UpdateUserBody = {
  email?: string;
  roles?: string[];
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "ADMIN"
    );
    const body = await readJsonBody<UpdateUserBody>(request);
    const { userId } = await context.params;

    if (typeof body.email !== "string") {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "Email is required."
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.roles)) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "Roles must be provided as an array."
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      await updateUserAccess({
        actorUserId: session.user.id,
        email: body.email,
        ipAddress: getClientIpAddress(request),
        roles: body.roles,
        userAgent: request.headers.get("user-agent"),
        userId
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
