import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { listNotificationInbox, markNotificationRead } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse, readJsonBody } from "../auth/_lib/auth-route";

export const runtime = "nodejs";

type NotificationBody = {
  notificationId?: string;
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "BUYER"
    );

    return NextResponse.json(await listNotificationInbox(session.user.id));
  } catch (error) {
    return jsonErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "BUYER"
    );
    const body = await readJsonBody<NotificationBody>(request);

    return NextResponse.json(
      await markNotificationRead({
        notificationId: body.notificationId ?? "",
        userId: session.user.id
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
