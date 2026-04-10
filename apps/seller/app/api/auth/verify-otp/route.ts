import {
  AUTH_SESSION_COOKIE_NAME,
  AuthError,
  createSessionCookieOptions,
  issueSessionToken,
  readAuthConfig,
  verifyOtpLogin,
} from "@khmercart/core/auth";
import { createAuthStore } from "@khmercart/db/auth-store";
import { ensureSellerAccountForUser } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getClientIpAddress,
  jsonErrorResponse,
  readJsonBody,
} from "../../_lib/route";

export const runtime = "nodejs";

type VerifyOtpBody = {
  code?: string;
  identifier?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody<VerifyOtpBody>(request);

    if (!body.identifier || !body.code) {
      throw new AuthError(
        "BAD_REQUEST",
        "Identifier and code are required.",
        400,
      );
    }

    const config = readAuthConfig(process.env);
    const result = await verifyOtpLogin(createAuthStore(), config, {
      code: body.code,
      identifier: body.identifier,
      ipAddress: getClientIpAddress(request),
    });
    const sellerUser = await ensureSellerAccountForUser(result.session.user.id);
    const issuedAt = new Date(result.session.issuedAt);
    const expiresAt = new Date(result.session.expiresAt);
    const sellerResult = {
      session: {
        ...result.session,
        user: sellerUser,
      },
      token: await issueSessionToken(
        sellerUser,
        config.jwtSecret,
        issuedAt,
        expiresAt,
      ),
    };
    const response = NextResponse.json(sellerResult);

    response.cookies.set(
      AUTH_SESSION_COOKIE_NAME,
      sellerResult.token,
      createSessionCookieOptions(config.sessionTtlSeconds),
    );

    return response;
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
