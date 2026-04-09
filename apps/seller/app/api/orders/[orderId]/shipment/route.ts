import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { saveSellerShipment } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse, readJsonBody } from "../../../_lib/route";

export const runtime = "nodejs";

type SaveShipmentBody = {
  carrier?: string;
  carrierLabel?: string;
  message?: string;
  status?: string;
  trackingNumber?: string;
  trackingUrl?: string;
};

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const body = await readJsonBody<SaveShipmentBody>(request);
    const { orderId } = await context.params;

    return NextResponse.json(
      await saveSellerShipment({
        carrier: body.carrier,
        carrierLabel: body.carrierLabel,
        message: body.message,
        orderId,
        status: body.status,
        trackingNumber: body.trackingNumber,
        trackingUrl: body.trackingUrl,
        userId: session.user.id
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
