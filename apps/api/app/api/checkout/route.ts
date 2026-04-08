import { readCheckoutConfig } from "@khmercart/core"
import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth"
import { CheckoutServiceError, checkoutBuyerCart } from "@khmercart/db"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { jsonErrorResponse, readJsonBody } from "../auth/_lib/auth-route"

export const runtime = "nodejs"

type CheckoutBody = {
  billingAddress?: {
    city?: string
    country?: string
    deliveryNotes?: string
    fullName?: string
    line1?: string
    line2?: string
    phone?: string
    postalCode?: string
    stateProvince?: string
  } | null
  notes?: string
  paymentMethod?: string
  shippingAddress?: {
    city?: string
    country?: string
    deliveryNotes?: string
    fullName?: string
    line1?: string
    line2?: string
    phone?: string
    postalCode?: string
    stateProvince?: string
  }
}

export async function GET() {
  try {
    const checkoutConfig = readCheckoutConfig(process.env)

    return NextResponse.json({
      paymentMethods: checkoutConfig.paymentMethods
    })
  } catch (error) {
    return jsonErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const idempotencyKey = request.headers.get("Idempotency-Key")

    if (!idempotencyKey?.trim()) {
      throw new CheckoutServiceError("MISSING_KEY", "Idempotency key is required.", 400)
    }

    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "BUYER"
    )
    const body = await readJsonBody<CheckoutBody>(request)

    if (!body.shippingAddress) {
      throw new CheckoutServiceError("BAD_REQUEST", "Shipping address is required.", 400)
    }

    const checkout = await checkoutBuyerCart({
      billingAddress: body.billingAddress,
      idempotencyKey,
      notes: body.notes,
      paymentMethod: body.paymentMethod,
      shippingAddress: body.shippingAddress,
      userId: session.user.id
    })

    return NextResponse.json(checkout)
  } catch (error) {
    return jsonErrorResponse(error)
  }
}
