import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth"
import { getBuyerOrderTrackingData } from "@khmercart/db"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { jsonErrorResponse } from "../../../auth/_lib/auth-route"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{
    orderId: string
  }>
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
