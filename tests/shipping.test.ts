import { createHash } from "node:crypto";
import {
  getBuyerOrderTrackingData,
  prisma,
  saveSellerShipment
} from "@khmercart/db";
import { UserRole, type OrderState } from "@khmercart/db/prisma-client";

function createUniquePhone(prefix: string, suffix: string) {
  const digits = createHash("sha256")
    .update(`${prefix}:${suffix}`)
    .digest("hex")
    .replace(/[a-f]/g, (character) => String(character.charCodeAt(0) % 10))
    .slice(0, 8);

  return `+855${prefix}${digits}`;
}

async function createShippingFixture(input: {
  state: OrderState;
  suffix: string;
}) {
  const buyer = await prisma.user.create({
    data: {
      email: `shipping-buyer-${input.suffix}@khmercart.local`,
      fullName: `Shipping Buyer ${input.suffix}`,
      phone: createUniquePhone("71", input.suffix),
      roleAssignments: {
        create: {
          role: UserRole.BUYER
        }
      }
    }
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: `shipping-seller-${input.suffix}@khmercart.local`,
      fullName: `Shipping Seller ${input.suffix}`,
      phone: createUniquePhone("72", input.suffix),
      roleAssignments: {
        create: {
          role: UserRole.SELLER
        }
      }
    }
  });

  const seller = await prisma.seller.create({
    data: {
      defaultCurrency: "KHR",
      displayName: `Shipping Seller ${input.suffix}`,
      kycApprovedAt: new Date(),
      kycStatus: "APPROVED",
      legalName: `Shipping Seller ${input.suffix} Co., Ltd.`,
      payoutAccountName: `Treasury ${input.suffix}`,
      payoutAccountNumber: `ACC-${input.suffix}`,
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: `ABA-${input.suffix}`,
      slug: `shipping-seller-${input.suffix}`,
      supportEmail: sellerUser.email,
      supportPhone: sellerUser.phone,
      userId: sellerUser.id
    }
  });

  const order = await prisma.order.create({
    data: {
      billingAddress: {
        city: "Phnom Penh"
      },
      buyerId: buyer.id,
      currency: "KHR",
      discountMinor: 0,
      orderNumber: `SHIP-${input.suffix.toUpperCase()}`,
      paymentMethod: "COD",
      placedAt: new Date(),
      sellerId: seller.id,
      shippingAddress: {
        city: "Phnom Penh",
        line1: "House 42"
      },
      shippingMinor: 1000,
      state: input.state,
      subtotalMinor: 5000,
      taxMinor: 0,
      totalMinor: 6000
    }
  });

  return {
    buyer,
    order,
    seller,
    sellerUser
  };
}

async function cleanupFixture(input: {
  orderIds: string[];
  sellerIds: string[];
  userIds: string[];
}) {
  if (input.orderIds.length > 0) {
    await prisma.order.deleteMany({
      where: {
        id: {
          in: input.orderIds
        }
      }
    });
  }

  if (input.sellerIds.length > 0) {
    await prisma.seller.deleteMany({
      where: {
        id: {
          in: input.sellerIds
        }
      }
    });
  }

  if (input.userIds.length > 0) {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: input.userIds
        }
      }
    });
  }
}

describe("shipping service", () => {
  it.each(["SELLER_CONFIRMED", "PACKED"] as const)(
    "moves %s orders to HANDED_TO_CARRIER when tracking is entered",
    async (state) => {
      const suffix = crypto.randomUUID().slice(0, 8);
      const fixture = await createShippingFixture({ state, suffix });

      try {
        const result = await saveSellerShipment({
          carrier: "JNT",
          message: "Package handed to the J&T rider.",
          orderId: fixture.order.id,
          trackingNumber: `JNT-${suffix.toUpperCase()}`,
          userId: fixture.sellerUser.id
        });

        expect(result.state).toBe("HANDED_TO_CARRIER");
        expect(result.shipment?.status).toBe("HANDED_TO_CARRIER");
        expect(result.shipment?.carrier).toBe("JNT");
        expect(result.shipment?.trackingNumber).toBe(`JNT-${suffix.toUpperCase()}`);
        expect(result.shipment?.trackingUrl).toContain("/jnt/");

        const persistedOrder = await prisma.order.findUniqueOrThrow({
          where: {
            id: fixture.order.id
          }
        });
        const shipmentEvents = await prisma.shipmentEvent.findMany({
          where: {
            shipment: {
              orderId: fixture.order.id
            }
          }
        });

        expect(persistedOrder.state).toBe("HANDED_TO_CARRIER");
        expect(shipmentEvents).toHaveLength(1);
        expect(shipmentEvents[0]?.status).toBe("HANDED_TO_CARRIER");
      } finally {
        await cleanupFixture({
          orderIds: [fixture.order.id],
          sellerIds: [fixture.seller.id],
          userIds: [fixture.buyer.id, fixture.sellerUser.id]
        });
      }
    }
  );

  it("supports manual shipping with a custom carrier name and public tracking url", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const fixture = await createShippingFixture({
      state: "SELLER_CONFIRMED",
      suffix
    });

    try {
      const result = await saveSellerShipment({
        carrier: "OTHER",
        carrierLabel: "Local rider",
        message: "Driver called and is delivering this afternoon.",
        orderId: fixture.order.id,
        trackingNumber: `MANUAL-${suffix.toUpperCase()}`,
        trackingUrl: `https://tracking.example/manual/${suffix}`,
        userId: fixture.sellerUser.id
      });

      expect(result.state).toBe("HANDED_TO_CARRIER");
      expect(result.shipment?.status).toBe("HANDED_TO_CARRIER");
      expect(result.shipment?.carrier).toBe("Local rider");
      expect(result.shipment?.carrierCode).toBe("OTHER");
      expect(result.shipment?.trackingNumber).toBe(`MANUAL-${suffix.toUpperCase()}`);
      expect(result.shipment?.trackingUrl).toBe(`https://tracking.example/manual/${suffix}`);

      const persistedShipment = await prisma.shipment.findUniqueOrThrow({
        where: {
          orderId: fixture.order.id
        }
      });

      expect(persistedShipment.carrier).toBe("Local rider");
      expect(persistedShipment.providerShipmentId).toBeNull();
      expect(persistedShipment.trackingUrl).toBe(`https://tracking.example/manual/${suffix}`);
    } finally {
      await cleanupFixture({
        orderIds: [fixture.order.id],
        sellerIds: [fixture.seller.id],
        userIds: [fixture.buyer.id, fixture.sellerUser.id]
      });
    }
  });

  it("only returns tracking updates to the buyer who owns the order", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const fixture = await createShippingFixture({
      state: "SELLER_CONFIRMED",
      suffix
    });
    const otherBuyer = await prisma.user.create({
      data: {
        email: `shipping-other-buyer-${suffix}@khmercart.local`,
        fullName: `Other Buyer ${suffix}`,
        phone: createUniquePhone("73", suffix),
        roleAssignments: {
          create: {
            role: UserRole.BUYER
          }
        }
      }
    });

    try {
      await saveSellerShipment({
        carrier: "OTHER",
        message: "Seller handed the parcel to the local courier.",
        orderId: fixture.order.id,
        trackingNumber: `LOCAL-${suffix.toUpperCase()}`,
        userId: fixture.sellerUser.id
      });

      const ownerView = await getBuyerOrderTrackingData(fixture.buyer.id, fixture.order.id);

      expect(ownerView.orderId).toBe(fixture.order.id);
      expect(ownerView.shipment?.updates).toHaveLength(1);
      expect(ownerView.shipment?.trackingNumber).toBe(`LOCAL-${suffix.toUpperCase()}`);

      await expect(
        getBuyerOrderTrackingData(otherBuyer.id, fixture.order.id)
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        status: 404
      });
    } finally {
      await cleanupFixture({
        orderIds: [fixture.order.id],
        sellerIds: [fixture.seller.id],
        userIds: [fixture.buyer.id, fixture.sellerUser.id, otherBuyer.id]
      });
    }
  });
});
