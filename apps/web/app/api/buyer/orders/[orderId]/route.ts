import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth"
import { createBuyerOrderDispute, getBuyerOrderTrackingData } from "@khmercart/db"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { jsonErrorResponse, readJsonBody } from "../../../auth/_lib/auth-route"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{
    orderId: string
  }>
}

type CreateDisputeBody = {
  buyerMessage?: string
  reason?: "NOT_RECEIVED" | "DAMAGED" | "NOT_AS_DESCRIBED" | "OTHER"
  requestedRefundMinor?: number | null
}

function resolveDisputeReason(value: CreateDisputeBody["reason"]) {
  return value === "NOT_RECEIVED" ||
    value === "DAMAGED" ||
    value === "NOT_AS_DESCRIBED" ||
    value === "OTHER"
    ? value
    : "OTHER"
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "BUYER"
    )
    const { orderId } = await context.params
    const tracking = await getBuyerOrderTrackingData(session.user.id, orderId)

    return NextResponse.json(tracking)
  } catch (error) {
    return jsonErrorResponse(error)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "BUYER"
    )
    const { orderId } = await context.params
    const body = await readJsonBody<CreateDisputeBody>(request)

    return NextResponse.json(
      await createBuyerOrderDispute({
        buyerMessage: body.buyerMessage ?? "",
        orderId,
        reason: resolveDisputeReason(body.reason),
        requestedRefundMinor:
          typeof body.requestedRefundMinor === "number" ? body.requestedRefundMinor : null,
        userId: session.user.id
      })
    )
  } catch (error) {
    return jsonErrorResponse(error)
  }
}
