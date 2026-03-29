import { isSupportedCurrency, type SupportedCurrency } from "./catalog"

export const PAYMENT_METHOD_VALUES = [
  "COD",
  "KHQR",
  "PAYWAY",
  "TOANCHET",
  "WING"
] as const

export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number]

export type CheckoutPaymentProvider =
  | "COD"
  | "BAKONG"
  | "PAYWAY"
  | "TOANCHET"
  | "WING"

export type CheckoutAddressInput = {
  city?: string | null
  country?: string | null
  deliveryNotes?: string | null
  fullName?: string | null
  line1?: string | null
  line2?: string | null
  phone?: string | null
  postalCode?: string | null
  stateProvince?: string | null
}

export type CheckoutAddress = {
  city: string
  country: string
  deliveryNotes: string
  fullName: string
  line1: string
  line2: string
  phone: string
  postalCode: string
  stateProvince: string
}

export type CheckoutConfig = {
  idempotencyTtlSeconds: number
  paymentMethods: PaymentMethod[]
}

export type CheckoutValidationIssue = {
  field: string
  message: string
}

export type CheckoutPaymentResult = {
  checkoutUrl: string | null
  details: Record<string, unknown>
  displayName: string
  instructions: string
  method: PaymentMethod
  provider: CheckoutPaymentProvider
  qrPayload: string | null
  reference: string
  status:
    | "NOT_REQUIRED"
    | "PENDING"
    | "PROCESSING"
    | "AUTHORIZED"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
}

export type PaymentStubResult = CheckoutPaymentResult

type PaymentStubInput = {
  amountMinor: number
  currency: SupportedCurrency
  orderId: string
  orderNumber: string
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function isPaymentMethod(value: string | null | undefined): value is PaymentMethod {
  return (
    value === "COD" ||
    value === "KHQR" ||
    value === "PAYWAY" ||
    value === "TOANCHET" ||
    value === "WING"
  )
}

export function isPrepaidPaymentMethod(method: PaymentMethod): boolean {
  return method !== "COD"
}

export function readCheckoutConfig(env: NodeJS.ProcessEnv = process.env): CheckoutConfig {
  const configuredMethods = env.PAYMENT_METHODS?.trim()

  if (!configuredMethods) {
    return {
      idempotencyTtlSeconds: parsePositiveInteger(
        env.CHECKOUT_IDEMPOTENCY_TTL_SECONDS,
        300
      ),
      paymentMethods: [...PAYMENT_METHOD_VALUES]
    }
  }

  const parsedMethods = configuredMethods
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is PaymentMethod => isPaymentMethod(value))

  return {
    idempotencyTtlSeconds: parsePositiveInteger(
      env.CHECKOUT_IDEMPOTENCY_TTL_SECONDS,
      300
    ),
    paymentMethods:
      parsedMethods.length > 0
        ? Array.from(new Set(parsedMethods))
        : [...PAYMENT_METHOD_VALUES]
  }
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? ""
}

export function normalizeCheckoutAddress(input: CheckoutAddressInput): CheckoutAddress {
  const country = normalizeText(input.country) || "Cambodia"

  return {
    city: normalizeText(input.city),
    country,
    deliveryNotes: normalizeText(input.deliveryNotes),
    fullName: normalizeText(input.fullName),
    line1: normalizeText(input.line1),
    line2: normalizeText(input.line2),
    phone: normalizeText(input.phone),
    postalCode: normalizeText(input.postalCode),
    stateProvince: normalizeText(input.stateProvince)
  }
}

export function validateCheckoutAddress(
  input: CheckoutAddressInput
): CheckoutValidationIssue[] {
  const normalized = normalizeCheckoutAddress(input)
  const issues: CheckoutValidationIssue[] = []

  if (normalized.fullName.length < 2) {
    issues.push({
      field: "fullName",
      message: "Recipient name must be at least 2 characters."
    })
  }

  if (normalized.phone.length < 8) {
    issues.push({
      field: "phone",
      message: "Phone number is required for delivery."
    })
  }

  if (normalized.line1.length < 5) {
    issues.push({
      field: "line1",
      message: "Street address is required."
    })
  }

  if (normalized.city.length < 2) {
    issues.push({
      field: "city",
      message: "City or province is required."
    })
  }

  return issues
}

export function normalizePaymentMethod(
  value: string | null | undefined,
  supportedMethods: PaymentMethod[],
  fallbackMethod = supportedMethods[0] ?? "COD"
): PaymentMethod {
  const normalizedValue = value?.trim().toUpperCase()

  if (normalizedValue && isPaymentMethod(normalizedValue) && supportedMethods.includes(normalizedValue)) {
    return normalizedValue
  }

  return fallbackMethod
}

function encodeKhqrPayload(input: PaymentStubInput) {
  return `khqr://stub/pay?order=${input.orderNumber}&amount=${input.amountMinor}&currency=${input.currency}`
}

export function resolvePaymentProvider(
  method: PaymentMethod
): CheckoutPaymentProvider {
  if (method === "KHQR") {
    return "BAKONG"
  }

  return method
}

export function createPaymentStub(
  method: PaymentMethod,
  input: PaymentStubInput
): PaymentStubResult {
  if (!isSupportedCurrency(input.currency)) {
    throw new Error(`Unsupported checkout currency: ${input.currency}`)
  }

  if (method === "COD") {
    return {
      checkoutUrl: null,
      details: {
        amountMinor: input.amountMinor,
        currency: input.currency
      },
      displayName: "Cash on delivery",
      instructions: "Collect payment from the buyer when the order is delivered.",
      method,
      provider: "COD",
      qrPayload: null,
      reference: `COD-${input.orderNumber}`,
      status: "NOT_REQUIRED"
    }
  }

  if (method === "KHQR") {
    const qrPayload = encodeKhqrPayload(input)

    return {
      checkoutUrl: null,
      details: {
        amountMinor: input.amountMinor,
        currency: input.currency,
        qrPayload
      },
      displayName: "KHQR",
      instructions: "Present this KHQR payload to the buyer and wait for payment confirmation.",
      method,
      provider: "BAKONG",
      qrPayload,
      reference: `KHQR-${input.orderNumber}`,
      status: "PENDING"
    }
  }

  if (method === "TOANCHET") {
    return {
      checkoutUrl: `https://toanchet-stub.khmercart.local/checkout/${input.orderId}`,
      details: {
        amountMinor: input.amountMinor,
        checkoutUrl: `https://toanchet-stub.khmercart.local/checkout/${input.orderId}`,
        currency: input.currency
      },
      displayName: "ACLEDA Toanchet",
      instructions:
        "Redirect the buyer to the ACLEDA Toanchet checkout stub and wait for payment confirmation.",
      method,
      provider: "TOANCHET",
      qrPayload: null,
      reference: `TOANCHET-${input.orderNumber}`,
      status: "PENDING"
    }
  }

  if (method === "WING") {
    return {
      checkoutUrl: `https://wing-stub.khmercart.local/checkout/${input.orderId}`,
      details: {
        amountMinor: input.amountMinor,
        checkoutUrl: `https://wing-stub.khmercart.local/checkout/${input.orderId}`,
        currency: input.currency
      },
      displayName: "Wing",
      instructions: "Redirect the buyer to the Wing checkout stub and wait for payment confirmation.",
      method,
      provider: "WING",
      qrPayload: null,
      reference: `WING-${input.orderNumber}`,
      status: "PENDING"
    }
  }

  return {
    checkoutUrl: `https://payway-stub.khmercart.local/checkout/${input.orderId}`,
    details: {
      amountMinor: input.amountMinor,
      checkoutUrl: `https://payway-stub.khmercart.local/checkout/${input.orderId}`,
      currency: input.currency
    },
    displayName: "PayWay",
    instructions: "Redirect the buyer to the PayWay checkout stub and wait for payment confirmation.",
    method,
    provider: "PAYWAY",
    qrPayload: null,
    reference: `PAYWAY-${input.orderNumber}`,
    status: "PENDING"
  }
}
