import { createHash, randomUUID } from "node:crypto";
import {
  transitionOrder,
  prisma
} from "@khmercart/db";
import {
  getOrderTransitionEventType,
  type OrderLifecycleState,
  type OrderTransitionActor
} from "@khmercart/core";
import { UserRole, type OrderState } from "@prisma/client";

const EXPECTED_TRANSITIONS: Record<OrderLifecycleState, readonly OrderLifecycleState[]> = {
  CANCELLED: [],
  COMPLETED: ["REFUNDED"],
  CREATED: ["PAYMENT_PENDING", "SELLER_CONFIRMED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "REFUNDED"],
  HANDED_TO_CARRIER: ["IN_TRANSIT", "DELIVERED", "REFUNDED"],
  IN_TRANSIT: ["DELIVERED", "REFUNDED"],
  PACKED: ["HANDED_TO_CARRIER", "CANCELLED", "REFUNDED"],
  PAYMENT_CONFIRMED: ["SELLER_CONFIRMED", "CANCELLED", "REFUNDED"],
  PAYMENT_PENDING: ["PAYMENT_CONFIRMED", "CANCELLED"],
  REFUNDED: [],
  SELLER_CONFIRMED: ["PACKED", "HANDED_TO_CARRIER", "CANCELLED", "REFUNDED"]
};

function createUniquePhone(prefix: string, suffix: string) {
  const digits = createHash("sha256")
    .update(`${prefix}:${suffix}`)
    .digest("hex")
    .replace(/[a-f]/g, (character) => String(character.charCodeAt(0) % 10))
    .slice(0, 8);

  return `+855${prefix}${digits}`;
}

async function createTransitionFixture(suffix: string) {
  const buyer = await prisma.user.create({
    data: {
      email: `orders-buyer-${suffix}@khmercart.local`,
      fullName: `Orders Buyer ${suffix}`,
      phone: createUniquePhone("61", suffix),
      roleAssignments: {
        create: {
          role: UserRole.BUYER
        }
      }
    }
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: `orders-seller-${suffix}@khmercart.local`,
      fullName: `Orders Seller ${suffix}`,
      phone: createUniquePhone("62", suffix),
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
      displayName: `Orders Seller ${suffix}`,
      kycApprovedAt: new Date(),
      kycStatus: "APPROVED",
      legalName: `Orders Seller ${suffix} Co., Ltd.`,
      payoutAccountName: `Treasury ${suffix}`,
      payoutAccountNumber: `ACC-${suffix}`,
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: `ABA-${suffix}`,
      slug: `orders-seller-${suffix}`,
      supportEmail: sellerUser.email,
      supportPhone: sellerUser.phone,
      userId: sellerUser.id
    }
  });

  return {
    buyer,
    seller,
    sellerUser
  };
}

async function createOrder(input: {
  buyerId: string;
  sellerId: string;
  state: OrderState;
  suffix: string;
}) {
  const orderNumber = `ORD-${input.suffix}-${randomUUID().slice(0, 8).toUpperCase()}`;

  return prisma.order.create({
    data: {
      billingAddress: {
        city: "Phnom Penh"
      },
      buyerId: input.buyerId,
      cancelledAt: input.state === "CANCELLED" ? new Date() : null,
      completedAt: input.state === "COMPLETED" ? new Date() : null,
      currency: "KHR",
      discountMinor: 0,
      orderNumber,
      paidAt: input.state === "PAYMENT_CONFIRMED" ? new Date() : null,
      paymentMethod:
        input.state === "PAYMENT_PENDING" || input.state === "PAYMENT_CONFIRMED"
          ? "PAYWAY"
          : "COD",
      placedAt: new Date(),
      sellerId: input.sellerId,
      shippingAddress: {
        city: "Phnom Penh"
      },
      shippingMinor: 0,
      state: input.state,
      subtotalMinor: 1_000,
      taxMinor: 0,
      totalMinor: 1_000
    }
  });
}

describe("transitionOrder", () => {
  const suffix = randomUUID().slice(0, 8);
  const actorLabel = "Seller Ops";
  let buyerId = "";
  let sellerId = "";
  let sellerUserId = "";

  const actor: OrderTransitionActor = {
    label: actorLabel,
    role: "SELLER",
    type: "USER"
  };

  beforeAll(async () => {
    const fixture = await createTransitionFixture(suffix);
    buyerId = fixture.buyer.id;
    sellerId = fixture.seller.id;
    sellerUserId = fixture.sellerUser.id;
    actor.userId = sellerUserId;
  });

  afterAll(async () => {
    await prisma.order.deleteMany({
      where: {
        buyerId
      }
    });

    if (sellerId) {
      await prisma.seller.deleteMany({
        where: {
          id: sellerId
        }
      });
    }

    if (buyerId || sellerUserId) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [buyerId, sellerUserId].filter(Boolean)
          }
        }
      });
    }
  });

  it("writes exactly one append-only order event for every allowed transition", async () => {
    for (const [fromState, allowedTransitions] of Object.entries(EXPECTED_TRANSITIONS) as Array<
      [OrderLifecycleState, readonly OrderLifecycleState[]]
    >) {
      for (const toState of allowedTransitions) {
        const order = await createOrder({
          buyerId,
          sellerId,
          state: fromState,
          suffix
        });

        const result = await transitionOrder(order.id, toState, actor, {
          metadata: {
            reason: `${fromState}->${toState}`
          }
        });

        expect(result.fromState).toBe(fromState);
        expect(result.state).toBe(toState);

        const persistedOrder = await prisma.order.findUniqueOrThrow({
          where: {
            id: order.id
          }
        });

        expect(persistedOrder.state).toBe(toState);

        if (toState === "PAYMENT_CONFIRMED") {
          expect(persistedOrder.paidAt).not.toBeNull();
        }

        if (toState === "COMPLETED") {
          expect(persistedOrder.completedAt).not.toBeNull();
        }

        if (toState === "CANCELLED") {
          expect(persistedOrder.cancelledAt).not.toBeNull();
        }

        const events = await prisma.orderEvent.findMany({
          orderBy: {
            createdAt: "asc"
          },
          where: {
            orderId: order.id
          }
        });

        expect(events).toHaveLength(1);
        expect(events[0]?.fromState).toBe(fromState);
        expect(events[0]?.toState).toBe(toState);
        expect(events[0]?.type).toBe(getOrderTransitionEventType(toState));
        expect(events[0]?.actorUserId).toBe(sellerUserId);

        const payload = events[0]?.payload as
          | {
              actor?: Record<string, unknown>;
              metadata?: Record<string, unknown>;
            }
          | null;

        expect(payload?.actor).toMatchObject({
          label: actorLabel,
          role: "SELLER",
          type: "USER",
          userId: sellerUserId
        });
        expect(payload?.metadata).toMatchObject({
          reason: `${fromState}->${toState}`
        });
      }
    }
  });

  it("rejects every forbidden transition without mutating the order or event log", async () => {
    for (const fromState of Object.keys(EXPECTED_TRANSITIONS) as OrderLifecycleState[]) {
      for (const toState of Object.keys(EXPECTED_TRANSITIONS) as OrderLifecycleState[]) {
        const isAllowed = EXPECTED_TRANSITIONS[fromState].includes(toState);

        if (isAllowed) {
          continue;
        }

        const order = await createOrder({
          buyerId,
          sellerId,
          state: fromState,
          suffix
        });

        await expect(
          transitionOrder(order.id, toState, actor, {
            metadata: {
              reason: `${fromState}->${toState}`
            }
          })
        ).rejects.toMatchObject({
          code: "ILLEGAL_TRANSITION",
          status: 409
        });

        const persistedOrder = await prisma.order.findUniqueOrThrow({
          where: {
            id: order.id
          }
        });

        expect(persistedOrder.state).toBe(fromState);

        const eventCount = await prisma.orderEvent.count({
          where: {
            orderId: order.id
          }
        });

        expect(eventCount).toBe(0);
      }
    }
  });
});
