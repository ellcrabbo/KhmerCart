import { createHash } from "node:crypto";
import {
  checkoutBuyerCart,
  createSellerProduct,
  mutateBuyerCartItem,
  prisma
} from "@khmercart/db";
import { ProductModerationStatus, UserRole } from "@prisma/client";
import { POST as paywayWebhookPost } from "../apps/api/app/api/webhooks/payway/route";

function createUniquePhone(prefix: string, suffix: string) {
  const digits = createHash("sha256")
    .update(`${prefix}:${suffix}`)
    .digest("hex")
    .replace(/[a-f]/g, (character) => String(character.charCodeAt(0) % 10))
    .slice(0, 8);

  return `+855${prefix}${digits}`;
}

async function createBuyerUser(suffix: string) {
  return prisma.user.create({
    data: {
      email: `payments-buyer-${suffix}@khmercart.local`,
      fullName: `Payments Buyer ${suffix}`,
      phone: createUniquePhone("33", suffix),
      roleAssignments: {
        create: {
          role: UserRole.BUYER
        }
      }
    }
  });
}

async function createSellerFixture(input: {
  inventoryQuantity: number;
  suffix: string;
}) {
  const sellerUser = await prisma.user.create({
    data: {
      email: `payments-seller-${input.suffix}@khmercart.local`,
      fullName: `Payments Seller ${input.suffix}`,
      phone: createUniquePhone("44", input.suffix),
      roleAssignments: {
        create: {
          role: UserRole.SELLER
        }
      }
    }
  });

  const seller = await prisma.seller.create({
    data: {
      businessDescription: "Payments test seller",
      defaultCurrency: "KHR",
      displayName: `Payments Seller ${input.suffix}`,
      isActive: true,
      kycApprovedAt: new Date(),
      kycStatus: "APPROVED",
      legalName: `Payments Seller ${input.suffix} Co., Ltd.`,
      payoutAccountName: `Treasury ${input.suffix}`,
      payoutAccountNumber: `ACC-${input.suffix}`,
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: `ABA-${input.suffix}`,
      slug: `payments-seller-${input.suffix}`,
      supportEmail: sellerUser.email,
      supportPhone: sellerUser.phone,
      userId: sellerUser.id
    }
  });

  const product = await createSellerProduct({
    description: "Payments fixture product",
    images: [
      {
        altText: "Payments fixture image",
        isPrimary: true,
        url: `https://images.khmercart.local/test/payments-${input.suffix}.jpg`
      }
    ],
    name: `Payments Product ${input.suffix}`,
    returnPolicy: "Returns accepted within seven days if unused and resellable.",
    sellerAddress: "Phnom Penh, Cambodia",
    sellerContact: sellerUser.email ?? sellerUser.phone ?? "seller-support",
    slug: `payments-product-${input.suffix}`,
    status: "ACTIVE",
    userId: sellerUser.id,
    variants: [
      {
        currency: "KHR",
        inventoryQuantity: input.inventoryQuantity,
        isActive: true,
        isDefault: true,
        name: "Default",
        priceMinor: 3700,
        sku: `PAY-${input.suffix}`
      }
    ]
  });

  await prisma.product.update({
    data: {
      moderationStatus: ProductModerationStatus.APPROVED
    },
    where: {
      id: product.id
    }
  });

  return {
    product,
    seller,
    sellerUser
  };
}

function createShippingAddress(suffix: string) {
  return {
    city: "Phnom Penh",
    country: "Cambodia",
    fullName: `Payments Buyer ${suffix}`,
    line1: `House ${suffix} Street 51`,
    phone: `+85598${suffix.slice(0, 6).replace(/\D/g, "7")}`,
    stateProvince: "Phnom Penh"
  };
}

async function cleanupFixture(input: {
  buyerIds?: string[];
  sellerIds?: string[];
  userIds?: string[];
}) {
  const buyerIds = input.buyerIds ?? [];
  const sellerIds = input.sellerIds ?? [];
  const userIds = input.userIds ?? [];

  const orders = await prisma.order.findMany({
    select: {
      id: true
    },
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
  });
  const orderIds = orders.map((order) => order.id);

  const payments = orderIds.length
    ? await prisma.payment.findMany({
        select: {
          id: true
        },
        where: {
          orderId: {
            in: orderIds
          }
        }
      })
    : [];
  const paymentIds = payments.map((payment) => payment.id);

  if (paymentIds.length > 0 || orderIds.length > 0) {
    await prisma.paymentEvent.deleteMany({
      where: {
        OR: [
          orderIds.length > 0
            ? {
                orderId: {
                  in: orderIds
                }
              }
            : undefined,
          paymentIds.length > 0
            ? {
                paymentId: {
                  in: paymentIds
                }
              }
            : undefined
        ].filter(Boolean) as Array<Record<string, unknown>>
      }
    });
  }

  if (buyerIds.length > 0) {
    await prisma.checkoutIdempotency.deleteMany({
      where: {
        buyerId: {
          in: buyerIds
        }
      }
    });

    await prisma.cart.deleteMany({
      where: {
        buyerId: {
          in: buyerIds
        }
      }
    });
  }

  if (orderIds.length > 0) {
    await prisma.order.deleteMany({
      where: {
        id: {
          in: orderIds
        }
      }
    });
  }

  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        actorUserId: {
          in: userIds
        }
      }
    });
  }

  if (sellerIds.length > 0) {
    await prisma.product.deleteMany({
      where: {
        sellerId: {
          in: sellerIds
        }
      }
    });

    await prisma.seller.deleteMany({
      where: {
        id: {
          in: sellerIds
        }
      }
    });
  }

  if (userIds.length > 0) {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds
        }
      }
    });
  }
}

describe("payment webhooks", () => {
  it("processes PayWay webhooks idempotently without duplicating state transitions", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const previousSecret = process.env.PAYWAY_WEBHOOK_SECRET;

    delete process.env.PAYWAY_WEBHOOK_SECRET;

    const { product, seller, sellerUser } = await createSellerFixture({
      inventoryQuantity: 1,
      suffix
    });
    const buyer = await createBuyerUser(suffix);
    const variantId = product.variants[0]?.id;

    expect(variantId).toBeTruthy();

    try {
      await mutateBuyerCartItem({
        action: "ADD",
        quantity: 1,
        userId: buyer.id,
        variantId: variantId!
      });

      const checkout = await checkoutBuyerCart({
        idempotencyKey: `payway-${suffix}`,
        paymentMethod: "PAYWAY",
        shippingAddress: createShippingAddress(suffix),
        userId: buyer.id
      });

      const payment = await prisma.payment.findFirstOrThrow({
        where: {
          orderId: checkout.orderId
        }
      });

      const rawBody = JSON.stringify({
        eventId: `evt-${suffix}`,
        orderRef: payment.providerReference,
        paymentId: payment.providerPaymentId,
        status: "SUCCESS"
      });

      const firstResponse = await paywayWebhookPost(
        new Request("http://localhost:3002/api/webhooks/payway", {
          body: rawBody,
          headers: {
            "content-type": "application/json"
          },
          method: "POST"
        })
      );

      expect(firstResponse.status).toBe(200);
      await expect(firstResponse.json()).resolves.toMatchObject({
        alreadyProcessed: false,
        paymentId: payment.id
      });

      const replayResponse = await paywayWebhookPost(
        new Request("http://localhost:3002/api/webhooks/payway", {
          body: rawBody,
          headers: {
            "content-type": "application/json"
          },
          method: "POST"
        })
      );

      expect(replayResponse.status).toBe(200);
      await expect(replayResponse.json()).resolves.toMatchObject({
        alreadyProcessed: true,
        paymentId: payment.id
      });

      const refreshedOrder = await prisma.order.findUniqueOrThrow({
        where: {
          id: checkout.orderId
        }
      });

      expect(refreshedOrder.state).toBe("PAYMENT_CONFIRMED");

      const paymentCaptureEvents = await prisma.orderEvent.count({
        where: {
          orderId: checkout.orderId,
          type: "PAYMENT_CAPTURED"
        }
      });

      expect(paymentCaptureEvents).toBe(1);

      const providerEvents = await prisma.paymentEvent.count({
        where: {
          paymentId: payment.id,
          provider: "PAYWAY"
        }
      });

      expect(providerEvents).toBe(1);
    } finally {
      if (previousSecret) {
        process.env.PAYWAY_WEBHOOK_SECRET = previousSecret;
      } else {
        delete process.env.PAYWAY_WEBHOOK_SECRET;
      }

      await cleanupFixture({
        buyerIds: [buyer.id],
        sellerIds: [seller.id],
        userIds: [buyer.id, sellerUser.id]
      });
    }
  });

  it("rejects PayWay webhooks with an invalid signature when a secret is configured", async () => {
    const previousSecret = process.env.PAYWAY_WEBHOOK_SECRET;

    process.env.PAYWAY_WEBHOOK_SECRET = "payway-test-secret";

    try {
      const response = await paywayWebhookPost(
        new Request("http://localhost:3002/api/webhooks/payway", {
          body: JSON.stringify({
            eventId: "evt-invalid-signature",
            orderRef: "PAYWAY-KC-INVALID",
            status: "SUCCESS"
          }),
          headers: {
            "content-type": "application/json",
            "x-payway-signature": "invalid-signature"
          },
          method: "POST"
        })
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        error: "INVALID_SIGNATURE"
      });
    } finally {
      if (previousSecret) {
        process.env.PAYWAY_WEBHOOK_SECRET = previousSecret;
      } else {
        delete process.env.PAYWAY_WEBHOOK_SECRET;
      }
    }
  });
});
