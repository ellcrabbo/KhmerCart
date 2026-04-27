import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth"
import { getBuyerCart } from "@khmercart/db"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { jsonErrorResponse } from "../auth/_lib/auth-route"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "BUYER"
    )
    const cart = await getBuyerCart({
      userId: session.user.id
    })

    return NextResponse.json(cart)
  } catch (error) {
    return jsonErrorResponse(error)
  }
}
