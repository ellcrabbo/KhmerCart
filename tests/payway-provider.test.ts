import { createHash } from "node:crypto";
import { createSellerProduct, prisma } from "@khmercart/db";
import { ProductModerationStatus, UserRole } from "@khmercart/db/prisma-client";
import {
  createPaywayWebhookSignature,
  verifyPaywayWebhookSignature
} from "@khmercart/core";
import { GET as paywayCheckoutGet } from "../apps/api/app/payments/payway/checkout/[orderId]/route";

function createUniquePhone(prefix: string, suffix: string) {
  const digits = createHash("sha256")
    .update(`${prefix}:${suffix}`)
    .digest("hex")
    .replace(/[a-f]/g, (character) => String(character.charCodeAt(0) % 10))
    .slice(0, 8);

  return `+855${prefix}${digits}`;
}

async function createCheckoutFixture(suffix: string) {
  const buyer = await prisma.user.create({
    data: {
      email: `payway-buyer-${suffix}@khmercart.local`,
      fullName: `PayWay Buyer ${suffix}`,
      phone: createUniquePhone("31", suffix),
      roleAssignments: {
        create: {
          role: UserRole.BUYER
        }
      }
    }
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: `payway-seller-${suffix}@khmercart.local`,
      fullName: `PayWay Seller ${suffix}`,
      phone: createUniquePhone("41", suffix),
      roleAssignments: {
        create: {
          role: UserRole.SELLER
        }
      }
    }
  });

  const seller = await prisma.seller.create({
    data: {
      displayName: `PayWay Seller ${suffix}`,
      isActive: true,
      kycApprovedAt: new Date(),
      kycStatus: "APPROVED",
      legalName: `PayWay Seller ${suffix} Co., Ltd.`,
      slug: `payway-seller-${suffix}`,
      supportEmail: sellerUser.email,
      supportPhone: sellerUser.phone,
      userId: sellerUser.id
    }
  });

  const product = await createSellerProduct({
    description: "PayWay fixture product",
    images: [
      {
        altText: "PayWay fixture image",
        isPrimary: true,
        url: `https://images.khmercart.local/test/payway-${suffix}.jpg`
      }
    ],
    name: `PayWay Product ${suffix}`,
    returnPolicy: "Returns accepted within seven days if unused.",
    sellerAddress: "Phnom Penh, Cambodia",
    sellerContact: sellerUser.email ?? sellerUser.phone ?? "seller-support",
    slug: `payway-product-${suffix}`,
    status: "ACTIVE",
    userId: sellerUser.id,
    variants: [
      {
        currency: "KHR",
        inventoryQuantity: 3,
        isActive: true,
        isDefault: true,
        name: "Default",
        priceMinor: 4800,
        sku: `PAYWAY-${suffix}`
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

  const variant = product.variants[0];

  if (!variant) {
    throw new Error("Expected product variant for PayWay test fixture.");
  }

  const order = await prisma.order.create({
    data: {
      billingAddress: {
        city: "Phnom Penh",
        country: "Cambodia",
        fullName: buyer.fullName,
        line1: `House ${suffix} Street 51`,
        phone: buyer.phone
      },
      buyerId: buyer.id,
      currency: "KHR",
      discountMinor: 0,
      orderNumber: `KC-${suffix.toUpperCase()}`,
      paymentMethod: "PAYWAY",
      paymentMetadata: {},
      placedAt: new Date(),
      sellerId: seller.id,
      shippingAddress: {
        city: "Phnom Penh",
        country: "Cambodia",
        fullName: buyer.fullName,
        line1: `House ${suffix} Street 51`,
        phone: buyer.phone
      },
      shippingMinor: 0,
      state: "PAYMENT_PENDING",
      subtotalMinor: variant.priceMinor ?? 4800,
      taxMinor: 0,
      totalMinor: variant.priceMinor ?? 4800
    }
  });

  await prisma.orderItem.create({
    data: {
      currency: "KHR",
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      sku: variant.sku,
      subtotalMinor: variant.priceMinor ?? 4800,
      unitPriceMinor: variant.priceMinor ?? 4800,
      variantId: variant.id,
      variantName: variant.name
    }
  });

  const payment = await prisma.payment.create({
    data: {
      amountMinor: order.totalMinor,
      checkoutUrl: "https://api.khmercart.shop/payments/payway/checkout/test",
      currency: order.currency,
      method: "PAYWAY",
      metadata: {
        purchaseUrl: "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase"
      },
      orderId: order.id,
      provider: "PAYWAY",
      providerPaymentId: order.orderNumber,
      providerReference: `PAYWAY-${order.orderNumber}`,
      status: "PENDING"
    }
  });

  return {
    buyer,
    order,
    payment,
    product,
    seller,
    sellerUser
  };
}

async function cleanupFixture(input: {
  buyerId: string;
  orderId: string;
  productId: string;
  sellerId: string;
  sellerUserId: string;
}) {
  await prisma.paymentEvent.deleteMany({
    where: {
      orderId: input.orderId
    }
  });

  await prisma.payment.deleteMany({
    where: {
      orderId: input.orderId
    }
  });

  await prisma.order.deleteMany({
    where: {
      id: input.orderId
    }
  });

  await prisma.product.deleteMany({
    where: {
      id: input.productId
    }
  });

  await prisma.seller.deleteMany({
    where: {
      id: input.sellerId
    }
  });

  await prisma.user.deleteMany({
    where: {
      id: {
        in: [input.buyerId, input.sellerUserId]
      }
    }
  });
}

describe("PayWay provider", () => {
  it("verifies the official callback signature format", () => {
    const payload = {
      apv: "619195",
      return_params: "order-123",
      status: "0",
      tran_id: "KC-ABC123"
    };
    const secret = "payway-secret";
    const signature = createPaywayWebhookSignature(payload, secret);

    expect(
      verifyPaywayWebhookSignature(JSON.stringify(payload), {
        "x-payway-hmac-sha512": signature
      }, secret)
    ).toBe(true);
  });

  it("renders a real PayWay checkout handoff form when credentials are configured", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const previousMerchantId = process.env.PAYWAY_MERCHANT_ID;
    const previousApiKey = process.env.PAYWAY_API_KEY;
    const previousBaseUrl = process.env.PAYWAY_BASE_URL;
    const previousWebhookBaseUrl = process.env.WEBHOOK_BASE_URL;
    const fixture = await createCheckoutFixture(suffix);

    process.env.PAYWAY_MERCHANT_ID = "ec000002";
    process.env.PAYWAY_API_KEY = "sandbox-public-key";
    delete process.env.PAYWAY_BASE_URL;
    process.env.WEBHOOK_BASE_URL = "https://api.khmercart.shop";

    try {
      const response = await paywayCheckoutGet(
        new Request(`https://api.khmercart.shop/payments/payway/checkout/${fixture.order.id}`),
        {
          params: Promise.resolve({
            orderId: fixture.order.id
          })
        }
      );

      expect(response.status).toBe(200);

      const html = await response.text();

      expect(html).toContain("Redirecting you to ABA PayWay");
      expect(html).toContain(
        "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase"
      );
      expect(html).toContain('name="merchant_id" value="ec000002"');
      expect(html).toContain(`name="tran_id" value="${fixture.order.orderNumber}"`);
      expect(html).toContain('name="return_url" value="');
      expect(html).toContain('name="continue_success_url" value="https://api.khmercart.shop/payments/payway/complete');
    } finally {
      if (previousMerchantId) {
        process.env.PAYWAY_MERCHANT_ID = previousMerchantId;
      } else {
        delete process.env.PAYWAY_MERCHANT_ID;
      }

      if (previousApiKey) {
        process.env.PAYWAY_API_KEY = previousApiKey;
      } else {
        delete process.env.PAYWAY_API_KEY;
      }

      if (previousBaseUrl) {
        process.env.PAYWAY_BASE_URL = previousBaseUrl;
      } else {
        delete process.env.PAYWAY_BASE_URL;
      }

      if (previousWebhookBaseUrl) {
        process.env.WEBHOOK_BASE_URL = previousWebhookBaseUrl;
      } else {
        delete process.env.WEBHOOK_BASE_URL;
      }

      await cleanupFixture({
        buyerId: fixture.buyer.id,
        orderId: fixture.order.id,
        productId: fixture.product.id,
        sellerId: fixture.seller.id,
        sellerUserId: fixture.sellerUser.id
      });
    }
  });
});
