import { createHash } from "node:crypto"
import {
  isPaymentMethod,
  isPrepaidPaymentMethod,
  isSupportedCurrency,
  normalizeCheckoutAddress,
  normalizePaymentMethod,
  readCheckoutConfig,
  validateCheckoutAddress,
  type CheckoutAddress,
  type CheckoutAddressInput,
  type PaymentMethod,
  type PaymentStubResult
} from "@khmercart/core"
import {
  KycStatus,
  OrderState,
  Prisma,
  ProductModerationStatus,
  ProductStatus,
  UserRole
} from "./prisma-client"
import type { Currency } from "./prisma-client"
import { estimateShippingPreview, previewCouponForSeller } from "./marketplace"
import { createCheckoutPaymentRecord } from "./payments"
import { appendOrderEventInTransaction } from "./orders"
import { prisma } from "./prisma"

type DatabaseClient = Prisma.TransactionClient | typeof prisma

const cartItemInclude = {
  product: {
    include: {
      images: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }]
      },
      seller: true
    }
  },
  variant: {
    include: {
      inventory: true
    }
  }
} satisfies Prisma.CartItemInclude

const checkoutCartItemInclude = {
  product: {
    include: {
      seller: true
    }
  },
  variant: {
    include: {
      inventory: true
    }
  }
} satisfies Prisma.CartItemInclude

const buyableVariantInclude = {
  inventory: true,
  product: {
    include: {
      seller: true
    }
  }
} satisfies Prisma.ProductVariantInclude

type CartItemRecord = Prisma.CartItemGetPayload<{
  include: typeof cartItemInclude
}>

type CartRecord = Prisma.CartGetPayload<{
  include: {
    items: {
      include: typeof cartItemInclude
    }
  }
}>

type CheckoutCartItemRecord = Prisma.CartItemGetPayload<{
  include: typeof checkoutCartItemInclude
}>

type CheckoutCartRecord = Prisma.CartGetPayload<{
  include: {
    items: {
      include: typeof checkoutCartItemInclude
    }
  }
}>

type BuyableVariantRecord = Prisma.ProductVariantGetPayload<{
  include: typeof buyableVariantInclude
}>

type CartMutationAction = "ADD" | "REMOVE" | "SET"

type BuyerCartItem = {
  availableQuantity: number
  currency: Currency | null
  id: string
  imageUrl: string | null
  lineSubtotalMinor: number | null
  productId: string
  productName: string
  productSlug: string
  quantity: number
  seller: {
    displayName: string
    id: string
    slug: string
  }
  unitPriceMinor: number | null
  variantId: string
  variantName: string
}

export type BuyerCart = {
  currency: Currency | null
  id: string | null
  itemCount: number
  items: BuyerCartItem[]
  seller: {
    displayName: string
    id: string
    slug: string
  } | null
  subtotalMinor: number
  totalMinor: number
  updatedAt: string | null
}

export type MutateBuyerCartItemInput = {
  action?: CartMutationAction
  quantity?: number
  userId: string
  variantId: string
}

export type CheckoutBuyerCartInput = {
  billingAddress?: CheckoutAddressInput | null
  couponCode?: string | null
  idempotencyKey: string
  notes?: string | null
  paymentMethod?: string | null
  shippingAddress: CheckoutAddressInput
  userId: string
}

export type BuyerCheckoutResult = {
  billingAddress: CheckoutAddress
  coupon: {
    code: string
    discountMinor: number
    id: string
    title: string
  } | null
  currency: Currency
  discountMinor: number
  idempotencyKey: string
  itemCount: number
  orderId: string
  orderNumber: string
  payment: PaymentStubResult
  replayed: boolean
  seller: {
    displayName: string
    id: string
    slug: string
  }
  shippingMinor: number
  shippingAddress: CheckoutAddress
  state: OrderState
  subtotalMinor: number
  totalMinor: number
}

export type CheckoutPreviewResult = {
  coupon: {
    code: string
    discountMinor: number
    id: string
    title: string
  } | null
  currency: Currency
  discountMinor: number
  itemCount: number
  seller: {
    displayName: string
    id: string
    slug: string
  }
  shippingMinor: number
  subtotalMinor: number
  totalMinor: number
}

type CheckoutLineItem = {
  currency: Currency
  productId: string
  productName: string
  quantity: number
  sellerId: string
  subtotalMinor: number
  unitPriceMinor: number
  variantAttributes: Record<string, string> | null
  variantId: string
  variantName: string
  variantSku: string
}

export class CheckoutServiceError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.name = "CheckoutServiceError"
    this.status = status
  }
}

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function assertBuyerUserRole(user: {
  roleAssignments: Array<{ role: UserRole }>
}) {
  if (!user.roleAssignments.some((assignment) => assignment.role === UserRole.BUYER)) {
    throw new CheckoutServiceError("FORBIDDEN", "Buyer access is required.", 403)
  }
}

async function getBuyerUser(
  userId: string
) {
  const user = await prisma.user.findUnique({
    include: {
      roleAssignments: true
    },
    where: {
      id: userId
    }
  })

  if (!user) {
    throw new CheckoutServiceError("NOT_FOUND", "Buyer not found.", 404)
  }

  assertBuyerUserRole(user)

  return user
}

async function ensureBuyerCart(
  tx: Prisma.TransactionClient,
  buyerId: string
) {
  return tx.cart.upsert({
    create: {
      buyerId
    },
    update: {},
    where: {
      buyerId
    }
  })
}

function isPositiveInteger(value: number | undefined): value is number {
  return Number.isInteger(value) && (value ?? 0) > 0
}

function isNonNegativeInteger(value: number | undefined): value is number {
  return Number.isInteger(value) && (value ?? 0) >= 0
}

function normalizeCartAction(value: string | null | undefined): CartMutationAction {
  if (value === "REMOVE" || value === "SET") {
    return value
  }

  return "ADD"
}

function resolveNextCartQuantity(input: {
  action: CartMutationAction
  currentQuantity: number
  quantity?: number
}) {
  if (input.action === "ADD") {
    if (!isPositiveInteger(input.quantity)) {
      throw new CheckoutServiceError(
        "BAD_REQUEST",
        "ADD requires a positive integer quantity.",
        400
      )
    }

    return input.currentQuantity + input.quantity
  }

  if (input.action === "REMOVE") {
    if (input.quantity === undefined) {
      return 0
    }

    if (!isPositiveInteger(input.quantity)) {
      throw new CheckoutServiceError(
        "BAD_REQUEST",
        "REMOVE requires a positive integer quantity when provided.",
        400
      )
    }

    return Math.max(input.currentQuantity - input.quantity, 0)
  }

  if (!isNonNegativeInteger(input.quantity)) {
    throw new CheckoutServiceError(
      "BAD_REQUEST",
      "SET requires a non-negative integer quantity.",
      400
    )
  }

  return input.quantity
}

function createCheckoutOrderNumber() {
  return `KC-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`)
      .join(",")}}`
  }

  return JSON.stringify(value)
}

function createCheckoutRequestHash(input: {
  billingAddress: CheckoutAddress
  couponCode: string
  notes: string
  paymentMethod: PaymentMethod
  shippingAddress: CheckoutAddress
}) {
  return createHash("sha256")
    .update(stableStringify(input))
    .digest("hex")
}

function assertBuyableVariant(
  variant: BuyableVariantRecord | null
): BuyableVariantRecord & {
  currency: Currency
  inventory: NonNullable<BuyableVariantRecord["inventory"]>
  priceMinor: number
} {
  if (!variant || !variant.inventory) {
    throw new CheckoutServiceError("NOT_FOUND", "Variant not found.", 404)
  }

  if (!variant.isActive || variant.product.status !== ProductStatus.ACTIVE) {
    throw new CheckoutServiceError("VARIANT_UNAVAILABLE", "Variant is not available.", 409)
  }

  if (variant.product.moderationStatus !== ProductModerationStatus.APPROVED) {
    throw new CheckoutServiceError("VARIANT_UNAVAILABLE", "Variant is not available.", 409)
  }

  if (!variant.product.seller.isActive || variant.product.seller.kycStatus !== KycStatus.APPROVED) {
    throw new CheckoutServiceError("VARIANT_UNAVAILABLE", "Variant is not available.", 409)
  }

  if (!variant.currency || !isSupportedCurrency(variant.currency) || !variant.priceMinor || variant.priceMinor <= 0) {
    throw new CheckoutServiceError(
      "VARIANT_UNAVAILABLE",
      "Variant pricing is incomplete.",
      409
    )
  }

  return variant as BuyableVariantRecord & {
    currency: Currency
    inventory: NonNullable<BuyableVariantRecord["inventory"]>
    priceMinor: number
  }
}

async function getBuyableVariant(
  tx: Prisma.TransactionClient,
  variantId: string
) {
  const variant = await tx.productVariant.findUnique({
    include: buyableVariantInclude,
    where: {
      id: variantId
    }
  })

  return assertBuyableVariant(variant)
}

async function getBuyerCartRecord(
  tx: DatabaseClient,
  buyerId: string
): Promise<CartRecord | null> {
  return tx.cart.findUnique({
    include: {
      items: {
        include: cartItemInclude,
        orderBy: [
          {
            createdAt: "asc"
          }
        ]
      }
    },
    where: {
      buyerId
    }
  })
}

async function getCheckoutCartRecord(
  tx: Prisma.TransactionClient,
  buyerId: string
): Promise<CheckoutCartRecord | null> {
  return tx.cart.findUnique({
    include: {
      items: {
        include: checkoutCartItemInclude,
        orderBy: [
          {
            createdAt: "asc"
          }
        ]
      }
    },
    where: {
      buyerId
    }
  })
}

function mapBuyerCartItem(item: CartItemRecord): BuyerCartItem {
  const unitPriceMinor = item.variant.priceMinor
  const lineSubtotalMinor =
    unitPriceMinor && unitPriceMinor > 0 ? unitPriceMinor * item.quantity : null

  return {
    availableQuantity: item.variant.inventory?.availableQuantity ?? 0,
    currency: item.variant.currency,
    id: item.id,
    imageUrl: item.product.images[0]?.url ?? null,
    lineSubtotalMinor,
    productId: item.productId,
    productName: item.product.name,
    productSlug: item.product.slug,
    quantity: item.quantity,
    seller: {
      displayName: item.product.seller.displayName,
      id: item.product.seller.id,
      slug: item.product.seller.slug
    },
    unitPriceMinor,
    variantId: item.variantId,
    variantName: item.variant.name
  }
}

function mapBuyerCart(cart: CartRecord | null): BuyerCart {
  if (!cart) {
    return {
      currency: null,
      id: null,
      itemCount: 0,
      items: [],
      seller: null,
      subtotalMinor: 0,
      totalMinor: 0,
      updatedAt: null
    }
  }

  const items = cart.items.map((item) => mapBuyerCartItem(item))
  const subtotalMinor = items.reduce(
    (runningTotal, item) => runningTotal + (item.lineSubtotalMinor ?? 0),
    0
  )
  const itemCount = items.reduce(
    (runningTotal, item) => runningTotal + item.quantity,
    0
  )

  return {
    currency: items[0]?.currency ?? null,
    id: cart.id,
    itemCount,
    items,
    seller: items[0]?.seller ?? null,
    subtotalMinor,
    totalMinor: subtotalMinor,
    updatedAt: serializeDate(cart.updatedAt)
  }
}

function assertCartConsistency(items: CheckoutCartItemRecord[]) {
  if (items.length === 0) {
    throw new CheckoutServiceError("CART_EMPTY", "Cart is empty.", 400)
  }

  const firstSellerId = items[0]?.product.sellerId
  const firstCurrency = items[0]?.variant.currency

  if (!firstSellerId || !firstCurrency) {
    throw new CheckoutServiceError(
      "CART_ITEM_UNAVAILABLE",
      "Cart contains unavailable items.",
      409
    )
  }

  for (const item of items) {
    if (item.product.sellerId !== firstSellerId) {
      throw new CheckoutServiceError(
        "MULTI_SELLER_CART_NOT_SUPPORTED",
        "Checkout currently supports one seller per cart.",
        409
      )
    }

    if (item.variant.currency !== firstCurrency) {
      throw new CheckoutServiceError(
        "MIXED_CART_CURRENCIES_UNSUPPORTED",
        "Checkout currently supports one currency per cart.",
        409
      )
    }
  }
}

function buildCheckoutLineItems(items: CheckoutCartItemRecord[]): CheckoutLineItem[] {
  return items.map((item) => {
    const variant = assertBuyableVariant({
      ...item.variant,
      product: item.product
    } as BuyableVariantRecord)

    if (variant.inventory.availableQuantity < item.quantity) {
      throw new CheckoutServiceError(
        "INSUFFICIENT_INVENTORY",
        "One or more items no longer have enough stock.",
        409
      )
    }

    return {
      currency: variant.currency!,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      sellerId: item.product.sellerId,
      subtotalMinor: variant.priceMinor! * item.quantity,
      unitPriceMinor: variant.priceMinor!,
      variantAttributes:
        variant.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
          ? (variant.attributes as Record<string, string>)
          : null,
      variantId: item.variantId,
      variantName: item.variant.name,
      variantSku: item.variant.sku
    }
  })
}

async function reserveInventoryLine(
  tx: Prisma.TransactionClient,
  lineItem: CheckoutLineItem
) {
  const result = await tx.inventory.updateMany({
    data: {
      availableQuantity: {
        decrement: lineItem.quantity
      },
      reservedQuantity: {
        increment: lineItem.quantity
      }
    },
    where: {
      availableQuantity: {
        gte: lineItem.quantity
      },
      sellerId: lineItem.sellerId,
      variantId: lineItem.variantId
    }
  })

  if (result.count !== 1) {
    throw new CheckoutServiceError(
      "INSUFFICIENT_INVENTORY",
      "One or more items no longer have enough stock.",
      409
    )
  }
}

async function recordCheckoutAudit(
  tx: Prisma.TransactionClient,
  input: {
    action: string
    actorUserId: string
    afterData?: Prisma.InputJsonValue | null
    entityId: string
    entityType: string
  }
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      actorUserId: input.actorUserId,
      afterData: input.afterData ?? Prisma.JsonNull,
      beforeData: Prisma.JsonNull,
      entityId: input.entityId,
      entityType: input.entityType
    }
  })
}

function normalizeNotes(value: string | null | undefined) {
  return value?.trim() ?? ""
}

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function parseStoredCheckoutResponse(value: Prisma.JsonValue | null): BuyerCheckoutResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as unknown as BuyerCheckoutResult
}

async function loadCheckoutCartContext(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string
) {
  const cart = await getCheckoutCartRecord(tx, userId)

  if (!cart) {
    throw new CheckoutServiceError("CART_EMPTY", "Cart is empty.", 400)
  }

  assertCartConsistency(cart.items)

  const lineItems = buildCheckoutLineItems(cart.items)
  const subtotalMinor = lineItems.reduce(
    (runningTotal, lineItem) => runningTotal + lineItem.subtotalMinor,
    0
  )
  const currency = lineItems[0]?.currency
  const seller = cart.items[0]?.product.seller

  if (!currency || !seller) {
    throw new CheckoutServiceError(
      "CART_ITEM_UNAVAILABLE",
      "Cart contains unavailable items.",
      409
    )
  }

  return {
    cart,
    currency,
    lineItems,
    seller,
    subtotalMinor
  }
}

export async function previewBuyerCheckout(input: {
  couponCode?: string | null
  userId: string
}): Promise<CheckoutPreviewResult> {
  await getBuyerUser(input.userId)
  const { cart, currency, seller, subtotalMinor } = await loadCheckoutCartContext(prisma, input.userId)
  const coupon = input.couponCode?.trim()
    ? await previewCouponForSeller({
        code: input.couponCode,
        sellerId: seller.id,
        subtotalMinor
      })
    : null
  const shipping = estimateShippingPreview({
    currency,
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
  })
  const discountMinor = Math.min(subtotalMinor, coupon?.discountMinor ?? 0)
  const totalMinor = Math.max(0, subtotalMinor + shipping.estimatedMinor - discountMinor)

  return {
    coupon,
    currency,
    discountMinor,
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    seller: {
      displayName: seller.displayName,
      id: seller.id,
      slug: seller.slug
    },
    shippingMinor: shipping.estimatedMinor,
    subtotalMinor,
    totalMinor
  }
}

export async function getBuyerCart(input: { userId: string }): Promise<BuyerCart> {
  await getBuyerUser(input.userId)

  return mapBuyerCart(await getBuyerCartRecord(prisma, input.userId))
}

export async function mutateBuyerCartItem(
  input: MutateBuyerCartItemInput
): Promise<BuyerCart> {
  await getBuyerUser(input.userId)

  await prisma.$transaction(async (tx) => {
    const cart = await ensureBuyerCart(tx, input.userId)
    const variant = await getBuyableVariant(tx, input.variantId)
    const currentItem = await tx.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId: input.variantId
        }
      }
    })
    const currentQuantity = currentItem?.quantity ?? 0
    const nextQuantity = resolveNextCartQuantity({
      action: normalizeCartAction(input.action),
      currentQuantity,
      quantity: input.quantity
    })
    const otherItems = await tx.cartItem.findMany({
      include: checkoutCartItemInclude,
      orderBy: [
        {
          createdAt: "asc"
        }
      ],
      where: {
        cartId: cart.id,
        variantId: {
          not: input.variantId
        }
      }
    })

    if (nextQuantity > 0) {
      const otherSellerId = otherItems[0]?.product.sellerId
      const otherCurrency = otherItems[0]?.variant.currency

      if (otherSellerId && otherSellerId !== variant.product.sellerId) {
        throw new CheckoutServiceError(
          "MULTI_SELLER_CART_NOT_SUPPORTED",
          "Checkout currently supports one seller per cart.",
          409
        )
      }

      if (otherCurrency && otherCurrency !== variant.currency) {
        throw new CheckoutServiceError(
          "MIXED_CART_CURRENCIES_UNSUPPORTED",
          "Checkout currently supports one currency per cart.",
          409
        )
      }

      if (variant.inventory.availableQuantity < nextQuantity) {
        throw new CheckoutServiceError(
          "INSUFFICIENT_INVENTORY",
          "Requested cart quantity exceeds currently available stock.",
          409
        )
      }

      await tx.cartItem.upsert({
        create: {
          cartId: cart.id,
          productId: variant.productId,
          quantity: nextQuantity,
          variantId: variant.id
        },
        update: {
          productId: variant.productId,
          quantity: nextQuantity
        },
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId: variant.id
          }
        }
      })
    } else if (currentItem) {
      await tx.cartItem.delete({
        where: {
          id: currentItem.id
        }
      })
    }
  })

  return mapBuyerCart(await getBuyerCartRecord(prisma, input.userId))
}

export async function checkoutBuyerCart(
  input: CheckoutBuyerCartInput
): Promise<BuyerCheckoutResult> {
  const checkoutConfig = readCheckoutConfig(process.env)
  const shippingAddress = normalizeCheckoutAddress(input.shippingAddress)
  const billingAddress = normalizeCheckoutAddress(input.billingAddress ?? input.shippingAddress)
  const couponCode = input.couponCode?.trim() ?? ""
  const notes = normalizeNotes(input.notes)
  const requestedPaymentMethod = input.paymentMethod?.trim().toUpperCase()
  const paymentMethod = normalizePaymentMethod(
    input.paymentMethod,
    checkoutConfig.paymentMethods
  )
  const idempotencyKey = input.idempotencyKey.trim()
  const addressIssues = [
    ...validateCheckoutAddress(shippingAddress).map((issue) => ({
      ...issue,
      field: `shippingAddress.${issue.field}`
    })),
    ...validateCheckoutAddress(billingAddress).map((issue) => ({
      ...issue,
      field: `billingAddress.${issue.field}`
    }))
  ]

  if (!idempotencyKey) {
    throw new CheckoutServiceError("MISSING_KEY", "Idempotency key is required.", 400)
  }

  if (
    requestedPaymentMethod &&
    (!isPaymentMethod(requestedPaymentMethod) ||
      !checkoutConfig.paymentMethods.includes(requestedPaymentMethod))
  ) {
    throw new CheckoutServiceError(
      "PAYMENT_METHOD_UNAVAILABLE",
      "Requested payment method is not available.",
      400
    )
  }

  if (addressIssues.length > 0) {
    throw new CheckoutServiceError(
      "INVALID_ADDRESS",
      addressIssues.map((issue) => `${issue.field}: ${issue.message}`).join(" "),
      400
    )
  }

  const requestHash = createCheckoutRequestHash({
    billingAddress,
    couponCode,
    notes,
    paymentMethod,
    shippingAddress
  })
  const now = new Date()

  await getBuyerUser(input.userId)

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          await tx.checkoutIdempotency.deleteMany({
            where: {
              buyerId: input.userId,
              expiresAt: {
                lte: now
              },
              idempotencyKey
            }
          })

          const existingKey = await tx.checkoutIdempotency.findUnique({
            where: {
              buyerId_idempotencyKey: {
                buyerId: input.userId,
                idempotencyKey
              }
            }
          })

          if (existingKey) {
            if (existingKey.requestHash !== requestHash) {
              throw new CheckoutServiceError(
                "IDEMPOTENCY_KEY_REUSED",
                "This idempotency key has already been used for a different checkout request.",
                409
              )
            }

            const storedResponse = parseStoredCheckoutResponse(existingKey.responseData)

            if (storedResponse) {
              return {
                ...storedResponse,
                replayed: true
              }
            }

            throw new CheckoutServiceError(
              "CHECKOUT_IN_PROGRESS",
              "Checkout is already being processed for this idempotency key.",
              409
            )
          }

          await tx.checkoutIdempotency.create({
            data: {
              buyerId: input.userId,
              expiresAt: new Date(
                now.getTime() + checkoutConfig.idempotencyTtlSeconds * 1000
              ),
              idempotencyKey,
              requestHash
            }
          })

          const { cart, currency, lineItems, seller, subtotalMinor } =
            await loadCheckoutCartContext(tx, input.userId)
          const coupon = couponCode
            ? await previewCouponForSeller({
                code: couponCode,
                sellerId: seller.id,
                subtotalMinor
              })
            : null
          const shipping = estimateShippingPreview({
            currency,
            itemCount: lineItems.reduce((sum, lineItem) => sum + lineItem.quantity, 0)
          })
          const discountMinor = Math.min(subtotalMinor, coupon?.discountMinor ?? 0)
          const shippingMinor = shipping.estimatedMinor
          const totalMinor = Math.max(0, subtotalMinor + shippingMinor - discountMinor)

          for (const lineItem of lineItems) {
            await reserveInventoryLine(tx, lineItem)
          }

          const orderNumber = createCheckoutOrderNumber()
          const state = isPrepaidPaymentMethod(paymentMethod)
            ? OrderState.PAYMENT_PENDING
            : OrderState.CREATED
          const order = await tx.order.create({
            data: {
              billingAddress,
              buyerId: input.userId,
              currency,
              discountMinor,
              notes: notes || null,
              orderNumber,
              paidAt: null,
              paymentMethod,
              paymentMetadata: Prisma.JsonNull,
              paymentReference: null,
              placedAt: now,
              sellerId: seller.id,
              shippingAddress,
              shippingMinor,
              state,
              subtotalMinor,
              taxMinor: 0,
              totalMinor
            }
          })
          const payment = await createCheckoutPaymentRecord(tx, {
            amountMinor: totalMinor,
            currency,
            method: paymentMethod,
            orderId: order.id,
            orderNumber
          })

          if (coupon) {
            await tx.couponRedemption.create({
              data: {
                buyerId: input.userId,
                couponId: coupon.id,
                discountMinor,
                orderId: order.id
              }
            })

            await tx.coupon.update({
              data: {
                redemptionCount: {
                  increment: 1
                }
              },
              where: {
                id: coupon.id
              }
            })
          }

          await tx.order.update({
            data: {
              paymentMetadata: toPrismaJsonValue(payment.details),
              paymentReference: payment.reference
            },
            where: {
              id: order.id
            }
          })

          await tx.orderItem.createMany({
            data: lineItems.map((lineItem) => ({
              currency: lineItem.currency,
              metadata: lineItem.variantAttributes ?? Prisma.JsonNull,
              orderId: order.id,
              productId: lineItem.productId,
              productName: lineItem.productName,
              quantity: lineItem.quantity,
              sku: lineItem.variantSku,
              subtotalMinor: lineItem.subtotalMinor,
              unitPriceMinor: lineItem.unitPriceMinor,
              variantId: lineItem.variantId,
              variantName: lineItem.variantName
            }))
          })

          await appendOrderEventInTransaction(tx, {
            actor: {
              role: "BUYER",
              type: "USER",
              userId: input.userId
            },
            message: `Checkout created with ${payment.displayName}.`,
            metadata: {
              idempotencyKey,
              paymentMethod,
              paymentProvider: payment.provider,
              paymentReference: payment.reference
            },
            orderId: order.id,
            toState: state,
            type: "CREATED"
          })

          await recordCheckoutAudit(tx, {
            action: "BUYER_CHECKOUT_CREATED",
            actorUserId: input.userId,
            afterData: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              paymentMethod
            },
            entityId: order.id,
            entityType: "Order"
          })

          await tx.cartItem.deleteMany({
            where: {
              cartId: cart.id
            }
          })

          const response: BuyerCheckoutResult = {
            billingAddress,
            coupon,
            currency,
            discountMinor,
            idempotencyKey,
            itemCount: lineItems.reduce(
              (runningTotal, lineItem) => runningTotal + lineItem.quantity,
              0
            ),
            orderId: order.id,
            orderNumber: order.orderNumber,
            payment,
            replayed: false,
            seller: {
              displayName: seller.displayName,
              id: seller.id,
              slug: seller.slug
            },
            shippingMinor,
            shippingAddress,
            state,
            subtotalMinor,
            totalMinor
          }

          await tx.checkoutIdempotency.update({
            data: {
              orderId: order.id,
              responseData: toPrismaJsonValue(response)
            },
            where: {
              buyerId_idempotencyKey: {
                buyerId: input.userId,
                idempotencyKey
              }
            }
          })

          return response
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      )
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3
      ) {
        continue
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        throw new CheckoutServiceError(
          "INSUFFICIENT_INVENTORY",
          "One or more items no longer have enough stock.",
          409
        )
      }

      throw error
    }
  }

  throw new CheckoutServiceError(
    "INTERNAL_SERVER_ERROR",
    "Checkout could not be completed.",
    500
  )
}
