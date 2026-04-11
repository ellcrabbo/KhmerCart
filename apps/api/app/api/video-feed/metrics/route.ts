import { recordVideoPostMetric } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse, readJsonBody } from "../../auth/_lib/auth-route";

export const runtime = "nodejs";

type MetricBody = {
  eventType?:
    | "IMPRESSION"
    | "VIEWER_OPEN"
    | "PRODUCT_OPEN"
    | "ADD_TO_CART"
    | "CHECKOUT_START"
    | "ORDER_CONVERSION";
  videoPostId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody<MetricBody>(request);

    return NextResponse.json(
      await recordVideoPostMetric({
        eventType: body.eventType ?? "IMPRESSION",
        videoPostId: body.videoPostId ?? ""
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
