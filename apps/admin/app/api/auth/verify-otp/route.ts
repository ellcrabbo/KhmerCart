import {
  AUTH_SESSION_COOKIE_NAME,
  AuthError,
  createSessionCookieOptions,
  readAuthConfig,
  verifyOtpLogin
} from "@khmercart/core/auth";
import { createAuthStore } from "@khmercart/db/auth-store";
import { NextResponse } from "next/server";
import { jsonErrorResponse, readJsonBody } from "../../_lib/route";

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

    const config = readAuthConfig(process.env);
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
