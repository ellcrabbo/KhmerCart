import { AuthError, createOtpDeliveryService, requestOtpLogin } from "@khmercart/core/auth";
import { createAuthStore } from "@khmercart/db/auth-store";
import { NextResponse } from "next/server";
import { getAuthConfig, jsonErrorResponse, readJsonBody } from "../_lib/auth-route";

export const runtime = "nodejs";

type RequestOtpBody = {
  identifier?: string;
};

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<RequestOtpBody>(request);

    if (!body.identifier) {
      throw new AuthError("BAD_REQUEST", "Identifier is required.", 400);
    }

    const result = await requestOtpLogin(
      createAuthStore(),
      getAuthConfig(),
      {
        identifier: body.identifier
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
