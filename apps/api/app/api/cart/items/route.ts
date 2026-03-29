import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth"
import { CheckoutServiceError, mutateBuyerCartItem } from "@khmercart/db"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { jsonErrorResponse, readJsonBody } from "../../auth/_lib/auth-route"

export const runtime = "nodejs"

type CartItemBody = {
  action?: string
  quantity?: number
  variantId?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "BUYER"
    )
    const body = await readJsonBody<CartItemBody>(request)

    if (!body.variantId?.trim()) {
      throw new CheckoutServiceError("BAD_REQUEST", "Variant id is required.", 400)
    }

    const cart = await mutateBuyerCartItem({
      action: body.action?.trim().toUpperCase() as "ADD" | "REMOVE" | "SET" | undefined,
      quantity: body.quantity,
      userId: session.user.id,
      variantId: body.variantId.trim()
    })

    return NextResponse.json(cart)
  } catch (error) {
    return jsonErrorResponse(error)
  }
}
