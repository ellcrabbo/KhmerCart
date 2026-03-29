import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { getSellerDashboardData, saveSellerOnboarding } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getClientIpAddress, jsonErrorResponse, readJsonBody } from "../_lib/route";

export const runtime = "nodejs";

type SaveOnboardingBody = {
  businessDescription?: string;
  defaultCurrency?: string;
  displayName?: string;
  legalName?: string;
  payoutAccountName?: string;
  payoutAccountNumber?: string;
  payoutBankName?: string;
  payoutRoutingNumber?: string;
  slug?: string;
  submitForReview?: boolean;
  supportEmail?: string;
  supportPhone?: string;
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );

    return NextResponse.json(await getSellerDashboardData(session.user.id));
  } catch (error) {
    return jsonErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const body = await readJsonBody<SaveOnboardingBody>(request);

    return NextResponse.json(
      await saveSellerOnboarding({
        actorUserId: session.user.id,
        businessDescription: body.businessDescription,
        defaultCurrency: body.defaultCurrency,
        displayName: body.displayName,
        ipAddress: getClientIpAddress(request),
        legalName: body.legalName,
        payoutAccountName: body.payoutAccountName,
        payoutAccountNumber: body.payoutAccountNumber,
        payoutBankName: body.payoutBankName,
        payoutRoutingNumber: body.payoutRoutingNumber,
        slug: body.slug,
        submitForReview: body.submitForReview,
        supportEmail: body.supportEmail,
        supportPhone: body.supportPhone,
        userAgent: request.headers.get("user-agent"),
        userId: session.user.id
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
