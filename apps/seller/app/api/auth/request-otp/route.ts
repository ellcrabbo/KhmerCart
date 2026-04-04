import {
  AuthError,
  createOtpDeliveryService,
  requestOtpLogin,
  readAuthConfig
} from "@khmercart/core/auth";
import { createAuthStore } from "@khmercart/db/auth-store";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../../_lib/route";

export const runtime = "nodejs";

type RequestOtpBody = {
  identifier?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody<RequestOtpBody>(request);

    if (!body.identifier) {
      throw new AuthError("BAD_REQUEST", "Identifier is required.", 400);
    }

    const result = await requestOtpLogin(
      createAuthStore(),
      readAuthConfig(process.env),
      {
        identifier: body.identifier,
        ipAddress: getClientIpAddress(request)
      },
      createOtpDeliveryService(process.env)
    );

    return NextResponse.json({
      channel: result.channel,
      challengeId: result.challengeId,
      devCode: result.devCode,
      expiresAt: result.expiresAt,
      identifier: result.identifier,
      provider: result.provider
    });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
