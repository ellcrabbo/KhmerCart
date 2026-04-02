import { createHash } from "node:crypto"
import { issueSessionToken } from "@khmercart/core/auth"
import {
  checkoutBuyerCart,
  createSellerProduct,
  mutateBuyerCartItem,
  prisma,
  type BuyerCheckoutResult
} from "@khmercart/db"
import { ProductModerationStatus, UserRole } from "@khmercart/db/prisma-client"
import { POST as checkoutRoutePost } from "../apps/api/app/api/checkout/route"

function createUniquePhone(prefix: string, suffix: string) {
  const digits = createHash("sha256")
    .update(`${prefix}:${suffix}`)
    .digest("hex")
    .replace(/[a-f]/g, (character) => String(character.charCodeAt(0) % 10))
    .slice(0, 8)

  return `+855${prefix}${digits}`
}

async function createBuyerUser(suffix: string) {
  return prisma.user.create({
    data: {
      email: `buyer-${suffix}@khmercart.local`,
      fullName: `Buyer ${suffix}`,
      phone: createUniquePhone("12", suffix),
      roleAssignments: {
        create: {
          role: UserRole.BUYER
        }
      }
    }
  })
}

async function createSellerFixture(input: {
  inventoryQuantity: number
  suffix: string
}) {
  const sellerUser = await prisma.user.create({
    data: {
      email: `seller-${input.suffix}@khmercart.local`,
      fullName: `Seller ${input.suffix}`,
      phone: createUniquePhone("17", input.suffix),
      roleAssignments: {
        create: {
          role: UserRole.SELLER
        }
      }
    }
  })

  const seller = await prisma.seller.create({
    data: {
      businessDescription: "Checkout test seller",
      defaultCurrency: "KHR",
      displayName: `Seller ${input.suffix}`,
      isActive: true,
      kycApprovedAt: new Date(),
      kycStatus: "APPROVED",
      legalName: `Seller ${input.suffix} Co., Ltd.`,
      payoutAccountName: `Treasury ${input.suffix}`,
      payoutAccountNumber: `ACC-${input.suffix}`,
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: `ABA-${input.suffix}`,
      slug: `checkout-seller-${input.suffix}`,
      supportEmail: sellerUser.email,
      supportPhone: sellerUser.phone,
      userId: sellerUser.id
    }
  })

  const product = await createSellerProduct({
    description: "Checkout fixture product",
    images: [
      {
        altText: "Checkout fixture image",
        isPrimary: true,
        url: `https://images.khmercart.local/test/checkout-${input.suffix}.jpg`
      }
    ],
    name: `Checkout Product ${input.suffix}`,
    returnPolicy: "Returns accepted within seven days if unused and resellable.",
    sellerAddress: "Phnom Penh, Cambodia",
    sellerContact: sellerUser.email ?? sellerUser.phone ?? "seller-support",
    slug: `checkout-product-${input.suffix}`,
    status: "ACTIVE",
    userId: sellerUser.id,
    variants: [
      {
        currency: "KHR",
        inventoryQuantity: input.inventoryQuantity,
        isActive: true,
        isDefault: true,
        name: "Default",
        priceMinor: 2500,
        sku: `CHK-${input.suffix}`
      }
    ]
  })

  await prisma.product.update({
    data: {
      moderationStatus: ProductModerationStatus.APPROVED
    },
    where: {
      id: product.id
    }
  })

  return {
    product,
    seller,
    sellerUser
  }
}

function createShippingAddress(suffix: string) {
  return {
    city: "Phnom Penh",
    country: "Cambodia",
    fullName: `Buyer ${suffix}`,
    line1: `House ${suffix} Street 51`,
    phone: `+85512${suffix.slice(0, 6).replace(/\D/g, "2")}`,
    stateProvince: "Phnom Penh"
  }
}

async function cleanupFixture(input: {
  buyerIds?: string[]
  sellerIds?: string[]
  userIds?: string[]
}) {
  const buyerIds = input.buyerIds ?? []
  const sellerIds = input.sellerIds ?? []
  const userIds = input.userIds ?? []

  if (buyerIds.length > 0) {
    await prisma.checkoutIdempotency.deleteMany({
      where: {
        buyerId: {
          in: buyerIds
        }
      }
    })

    await prisma.cart.deleteMany({
      where: {
        buyerId: {
          in: buyerIds
        }
      }
    })
  }

  if (buyerIds.length > 0 || sellerIds.length > 0) {
    await prisma.order.deleteMany({
      where: {
        OR: [
          buyerIds.length > 0
            ? {
                buyerId: {
                  in: buyerIds
                }
              }
            : undefined,
          sellerIds.length > 0
            ? {
                sellerId: {
                  in: sellerIds
                }
              }
            : undefined
        ].filter(Boolean) as Array<Record<string, unknown>>
      }
    })
  }

  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        actorUserId: {
          in: userIds
        }
      }
    })
  }

  if (sellerIds.length > 0) {
    await prisma.product.deleteMany({
      where: {
        sellerId: {
          in: sellerIds
        }
      }
    })

    await prisma.seller.deleteMany({
      where: {
        id: {
          in: sellerIds
        }
      }
    })
  }

  if (userIds.length > 0) {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds
        }
      }
    })
  }
}

describe("checkout service", () => {
  it("adds and removes cart items while recalculating totals", async () => {
    const suffix = crypto.randomUUID().slice(0, 8)
    const { product, seller, sellerUser } = await createSellerFixture({
      inventoryQuantity: 4,
      suffix
    })
    const buyer = await createBuyerUser(suffix)
    const variantId = product.variants[0]?.id

    expect(variantId).toBeTruthy()

    try {
      const cartAfterAdd = await mutateBuyerCartItem({
        action: "ADD",
        quantity: 2,
        userId: buyer.id,
        variantId: variantId!
      })

      expect(cartAfterAdd.itemCount).toBe(2)
      expect(cartAfterAdd.subtotalMinor).toBe(5000)
      expect(cartAfterAdd.items[0]?.quantity).toBe(2)

      const cartAfterRemove = await mutateBuyerCartItem({
        action: "REMOVE",
        quantity: 1,
        userId: buyer.id,
        variantId: variantId!
      })

      expect(cartAfterRemove.itemCount).toBe(1)
      expect(cartAfterRemove.subtotalMinor).toBe(2500)

      const clearedCart = await mutateBuyerCartItem({
        action: "SET",
        quantity: 0,
        userId: buyer.id,
        variantId: variantId!
      })

      expect(clearedCart.itemCount).toBe(0)
      expect(clearedCart.items).toHaveLength(0)
    } finally {
      await cleanupFixture({
        buyerIds: [buyer.id],
        sellerIds: [seller.id],
        userIds: [buyer.id, sellerUser.id]
      })
    }
  })

  it("returns the same order when the same idempotency key is replayed", async () => {
    const suffix = crypto.randomUUID().slice(0, 8)
    const { product, seller, sellerUser } = await createSellerFixture({
      inventoryQuantity: 3,
      suffix
    })
    const buyer = await createBuyerUser(suffix)
    const variantId = product.variants[0]?.id

    expect(variantId).toBeTruthy()

    try {
      await mutateBuyerCartItem({
        action: "ADD",
        quantity: 1,
        userId: buyer.id,
        variantId: variantId!
      })

      const firstCheckout = await checkoutBuyerCart({
        idempotencyKey: `idem-${suffix}`,
        paymentMethod: "COD",
        shippingAddress: createShippingAddress(suffix),
        userId: buyer.id
      })
      const replayedCheckout = await checkoutBuyerCart({
        idempotencyKey: `idem-${suffix}`,
        paymentMethod: "COD",
        shippingAddress: createShippingAddress(suffix),
        userId: buyer.id
      })

      expect(replayedCheckout.orderId).toBe(firstCheckout.orderId)
      expect(replayedCheckout.orderNumber).toBe(firstCheckout.orderNumber)
      expect(replayedCheckout.replayed).toBe(true)

      const orders = await prisma.order.findMany({
        where: {
          buyerId: buyer.id
        }
      })

      expect(orders).toHaveLength(1)
    } finally {
      await cleanupFixture({
        buyerIds: [buyer.id],
        sellerIds: [seller.id],
        userIds: [buyer.id, sellerUser.id]
      })
    }
  })

  it("allows only one concurrent checkout to claim the last unit", async () => {
    const suffix = crypto.randomUUID().slice(0, 8)
    const { product, seller, sellerUser } = await createSellerFixture({
      inventoryQuantity: 1,
      suffix
    })
    const firstBuyer = await createBuyerUser(`${suffix}a`)
    const secondBuyer = await createBuyerUser(`${suffix}b`)
    const variantId = product.variants[0]?.id

    expect(variantId).toBeTruthy()

    try {
      await mutateBuyerCartItem({
        action: "ADD",
        quantity: 1,
        userId: firstBuyer.id,
        variantId: variantId!
      })
      await mutateBuyerCartItem({
        action: "ADD",
        quantity: 1,
        userId: secondBuyer.id,
        variantId: variantId!
      })

      const results = await Promise.allSettled<BuyerCheckoutResult>([
        checkoutBuyerCart({
          idempotencyKey: `last-unit-${suffix}-1`,
          paymentMethod: "COD",
          shippingAddress: createShippingAddress(`${suffix}a`),
          userId: firstBuyer.id
        }),
        checkoutBuyerCart({
          idempotencyKey: `last-unit-${suffix}-2`,
          paymentMethod: "COD",
          shippingAddress: createShippingAddress(`${suffix}b`),
          userId: secondBuyer.id
        })
      ])

      const fulfilledCount = results.filter((result) => result.status === "fulfilled").length
      const rejectedResults = results.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      )

      expect(fulfilledCount).toBe(1)
      expect(rejectedResults).toHaveLength(1)
      expect(rejectedResults[0]?.reason).toMatchObject({
        code: "INSUFFICIENT_INVENTORY",
        status: 409
      })

      const inventory = await prisma.inventory.findUniqueOrThrow({
        where: {
          variantId: variantId!
        }
      })

      expect(inventory.availableQuantity).toBe(0)
      expect(inventory.reservedQuantity).toBe(1)
    } finally {
      await cleanupFixture({
        buyerIds: [firstBuyer.id, secondBuyer.id],
        sellerIds: [seller.id],
        userIds: [firstBuyer.id, secondBuyer.id, sellerUser.id]
      })
    }
  })

  it("rejects checkout requests without an idempotency key header", async () => {
    process.env.AUTH_JWT_SECRET = "checkout-route-secret"

    const token = await issueSessionToken(
      {
        email: "buyer@khmercart.local",
        id: "buyer-route-test",
        phone: "+85512000000",
        primaryRole: "BUYER",
        roles: ["BUYER"]
      },
      process.env.AUTH_JWT_SECRET,
      new Date("2099-03-29T10:00:00.000Z"),
      new Date("2099-03-29T11:00:00.000Z")
    )

    const response = await checkoutRoutePost(
      new Request("http://localhost:3002/api/checkout", {
        body: JSON.stringify({
          paymentMethod: "COD",
          shippingAddress: createShippingAddress("route")
        }),
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        method: "POST"
      }) as never
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      error: "MISSING_KEY"
    })
  })
})
