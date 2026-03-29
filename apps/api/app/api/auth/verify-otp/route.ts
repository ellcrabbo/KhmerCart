import {
  AUTH_SESSION_COOKIE_NAME,
  AuthError,
  createSessionCookieOptions,
  verifyOtpLogin
} from "@khmercart/core/auth";
import { createAuthStore } from "@khmercart/db/auth-store";
import { NextResponse } from "next/server";
import { getAuthConfig, jsonErrorResponse, readJsonBody } from "../_lib/auth-route";

export const runtime = "nodejs";

type VerifyOtpBody = {
  code?: string;
  identifier?: string;
};

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<VerifyOtpBody>(request);

    if (!body.identifier || !body.code) {
      throw new AuthError("BAD_REQUEST", "Identifier and code are required.", 400);
    }

    const config = getAuthConfig();
    const result = await verifyOtpLogin(createAuthStore(), config, {
      code: body.code,
      identifier: body.identifier
    });
    const response = NextResponse.json(result);

    response.cookies.set(
      AUTH_SESSION_COOKIE_NAME,
      result.token,
      createSessionCookieOptions(config.sessionTtlSeconds)
    );

    return response;
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
