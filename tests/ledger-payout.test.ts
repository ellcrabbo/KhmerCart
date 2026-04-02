import { createHash } from "node:crypto";
import {
  createPayoutBatch,
  exportPayoutCSV,
  getLedgerAccountBalances,
  postSale,
  prisma,
  releaseHold
} from "@khmercart/db";
import { UserRole } from "@khmercart/db/prisma-client";

function createUniquePhone(prefix: string, suffix: string) {
  const digits = createHash("sha256")
    .update(`${prefix}:${suffix}`)
    .digest("hex")
    .replace(/[a-f]/g, (character) => String(character.charCodeAt(0) % 10))
    .slice(0, 8);

  return `+855${prefix}${digits}`;
}

async function createSettlementFixture(input: {
  paymentMethod: "COD" | "PAYWAY";
  riskTier: "HIGH" | "LOW" | "MED";
  suffix: string;
  totalMinor?: number;
}) {
  const totalMinor = input.totalMinor ?? 10_000;
  const buyer = await prisma.user.create({
    data: {
      email: `ledger-buyer-${input.suffix}@khmercart.local`,
      fullName: `Ledger Buyer ${input.suffix}`,
      phone: createUniquePhone("81", input.suffix),
      roleAssignments: {
        create: {
          role: UserRole.BUYER
        }
      }
    }
  });
  const sellerUser = await prisma.user.create({
    data: {
      email: `ledger-seller-${input.suffix}@khmercart.local`,
      fullName: `Ledger Seller ${input.suffix}`,
      phone: createUniquePhone("82", input.suffix),
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
      displayName: `Ledger Seller ${input.suffix}`,
      kycApprovedAt: new Date(),
      kycStatus: "APPROVED",
      legalName: `Ledger Seller ${input.suffix} Co., Ltd.`,
      payoutAccountName: `Treasury ${input.suffix}`,
      payoutAccountNumber: `ACC-${input.suffix}`,
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: `ABA-${input.suffix}`,
      riskTier: input.riskTier,
      slug: `ledger-seller-${input.suffix}`,
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
      orderNumber: `LEDGER-${input.suffix.toUpperCase()}`,
      paymentMethod: input.paymentMethod,
      placedAt: new Date("2026-03-01T00:00:00.000Z"),
      sellerId: seller.id,
      shippingAddress: {
        city: "Phnom Penh",
        line1: "Street 51"
      },
      shippingMinor: 0,
      state: "DELIVERED",
      subtotalMinor: totalMinor,
      taxMinor: 0,
      totalMinor
    }
  });

  return {
    buyer,
    order,
    seller,
    sellerUser
  };
}

async function cleanupSettlementFixture(input: {
  orderIds: string[];
  sellerIds: string[];
  userIds: string[];
}) {
  await prisma.payoutItem.deleteMany({
    where: {
      OR: [
        {
          orderId: {
            in: input.orderIds
          }
        },
        {
          sellerId: {
            in: input.sellerIds
          }
        }
      ]
    }
  });
  await prisma.payoutBatch.deleteMany({
    where: {
      sellerId: {
        in: input.sellerIds
      }
    }
  });
  await prisma.ledgerEntry.deleteMany({
    where: {
      orderId: {
        in: input.orderIds
      }
    }
  });
  await prisma.order.deleteMany({
    where: {
      id: {
        in: input.orderIds
      }
    }
  });
  await prisma.ledgerAccount.deleteMany({
    where: {
      sellerId: {
        in: input.sellerIds
      }
    }
  });
  await prisma.seller.deleteMany({
    where: {
      id: {
        in: input.sellerIds
      }
    }
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: input.userIds
      }
    }
  });
}

describe("ledger and payout services", () => {
  const previousEnv = {
    HOLD_DAYS_TIER_HIGH: process.env.HOLD_DAYS_TIER_HIGH,
    HOLD_DAYS_TIER_LOW: process.env.HOLD_DAYS_TIER_LOW,
    HOLD_DAYS_TIER_MED: process.env.HOLD_DAYS_TIER_MED,
    PAYOUT_CSV_COLUMNS: process.env.PAYOUT_CSV_COLUMNS,
    PLATFORM_FEE_BPS: process.env.PLATFORM_FEE_BPS
  };

  beforeEach(() => {
    process.env.HOLD_DAYS_TIER_LOW = "1";
    process.env.HOLD_DAYS_TIER_MED = "3";
    process.env.HOLD_DAYS_TIER_HIGH = "5";
    process.env.PLATFORM_FEE_BPS = "1000";
    process.env.PAYOUT_CSV_COLUMNS = "default";
  });

  afterAll(() => {
    process.env.HOLD_DAYS_TIER_LOW = previousEnv.HOLD_DAYS_TIER_LOW;
    process.env.HOLD_DAYS_TIER_MED = previousEnv.HOLD_DAYS_TIER_MED;
    process.env.HOLD_DAYS_TIER_HIGH = previousEnv.HOLD_DAYS_TIER_HIGH;
    process.env.PLATFORM_FEE_BPS = previousEnv.PLATFORM_FEE_BPS;
    process.env.PAYOUT_CSV_COLUMNS = previousEnv.PAYOUT_CSV_COLUMNS;
  });

  it("keeps prepaid ledger postings balanced and batches only eligible released amounts", async () => {
    const lowSuffix = crypto.randomUUID().slice(0, 8);
    const highSuffix = crypto.randomUUID().slice(0, 8);
    const lowFixture = await createSettlementFixture({
      paymentMethod: "PAYWAY",
      riskTier: "LOW",
      suffix: lowSuffix
    });
    const highFixture = await createSettlementFixture({
      paymentMethod: "PAYWAY",
      riskTier: "HIGH",
      suffix: highSuffix
    });
    const settledAt = new Date("2026-03-01T00:00:00.000Z");
    const eligibleAsOf = new Date("2026-03-03T00:00:00.000Z");

    try {
      const lowPost = await postSale({
        now: settledAt,
        orderId: lowFixture.order.id
      });
      const highPost = await postSale({
        now: settledAt,
        orderId: highFixture.order.id
      });

      expect(lowPost.paymentFlow).toBe("PREPAID");
      expect(lowPost.feeMinor).toBe(1_000);
      expect(lowPost.heldAmountMinor).toBe(9_000);
      expect(highPost.heldAmountMinor).toBe(9_000);

      const replayed = await postSale({
        now: settledAt,
        orderId: lowFixture.order.id
      });

      expect(replayed.replayed).toBe(true);

      const lowRelease = await releaseHold({
        asOf: eligibleAsOf,
        sellerId: lowFixture.seller.id
      });
      const highRelease = await releaseHold({
        asOf: eligibleAsOf,
        sellerId: highFixture.seller.id
      });

      expect(lowRelease.releasedCount).toBe(1);
      expect(lowRelease.releasedAmountMinor).toBe(9_000);
      expect(highRelease.releasedCount).toBe(0);
      expect(highRelease.releasedAmountMinor).toBe(0);

      const payoutBatch = await createPayoutBatch({
        asOf: eligibleAsOf,
        sellerId: lowFixture.seller.id
      });

      expect(payoutBatch.grossAmountMinor).toBe(10_000);
      expect(payoutBatch.feeAmountMinor).toBe(1_000);
      expect(payoutBatch.netAmountMinor).toBe(9_000);
      expect(payoutBatch.items).toHaveLength(1);
      expect(payoutBatch.netAmountMinor).toBe(lowRelease.releasedAmountMinor);

      await expect(
        createPayoutBatch({
          asOf: eligibleAsOf,
          sellerId: highFixture.seller.id
        })
      ).rejects.toMatchObject({
        code: "NO_ELIGIBLE_PAYOUTS",
        status: 409
      });

      const csvExport = await exportPayoutCSV({
        payoutBatchId: payoutBatch.id
      });

      expect(csvExport.columns).toContain("batch_id");
      expect(csvExport.csv).toContain("ACC-");
      expect(csvExport.csv).toContain("9000");

      const balances = await getLedgerAccountBalances();
      const totalDebits = balances.reduce((total, balance) => total + balance.debitMinor, 0);
      const totalCredits = balances.reduce((total, balance) => total + balance.creditMinor, 0);
      const lowHeldCode = `seller:${lowFixture.seller.id}:khr:held`;
      const lowPayableCode = `seller:${lowFixture.seller.id}:khr:payable`;
      const highHeldCode = `seller:${highFixture.seller.id}:khr:held`;
      const platformCashCode = "platform:khr:cash";
      const platformFeeCode = "platform:khr:fee_revenue";

      expect(totalDebits).toBe(totalCredits);
      expect(balances.find((balance) => balance.code === platformCashCode)?.balanceMinor).toBe(
        20_000
      );
      expect(balances.find((balance) => balance.code === platformFeeCode)?.balanceMinor).toBe(
        2_000
      );
      expect(balances.find((balance) => balance.code === lowHeldCode)?.balanceMinor).toBe(0);
      expect(balances.find((balance) => balance.code === lowPayableCode)?.balanceMinor).toBe(
        9_000
      );
      expect(balances.find((balance) => balance.code === highHeldCode)?.balanceMinor).toBe(9_000);

      const batchedEntries = await prisma.ledgerEntry.findMany({
        where: {
          payoutBatchId: payoutBatch.id
        }
      });
      const batchedAmountMinor = batchedEntries.reduce(
        (total, entry) => total + entry.amountMinor,
        0
      );

      expect(batchedAmountMinor).toBe(payoutBatch.netAmountMinor);
    } finally {
      await cleanupSettlementFixture({
        orderIds: [lowFixture.order.id, highFixture.order.id],
        sellerIds: [lowFixture.seller.id, highFixture.seller.id],
        userIds: [
          lowFixture.buyer.id,
          lowFixture.sellerUser.id,
          highFixture.buyer.id,
          highFixture.sellerUser.id
        ]
      });
    }
  });

  it("does not book COD customer funds as platform cash while still accruing platform fees", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const fixture = await createSettlementFixture({
      paymentMethod: "COD",
      riskTier: "LOW",
      suffix
    });

    try {
      const result = await postSale({
        now: new Date("2026-03-01T00:00:00.000Z"),
        orderId: fixture.order.id
      });

      expect(result.paymentFlow).toBe("COD");
      expect(result.heldAmountMinor).toBe(0);
      expect(result.feeMinor).toBe(1_000);

      const balances = await getLedgerAccountBalances();
      const platformCash = balances.find((balance) => balance.code === "platform:khr:cash");
      const platformFee = balances.find(
        (balance) => balance.code === "platform:khr:fee_revenue"
      );
      const codReceivable = balances.find(
        (balance) => balance.code === `seller:${fixture.seller.id}:khr:cod_fee_receivable`
      );

      expect(platformCash?.balanceMinor ?? 0).toBe(0);
      expect(platformFee?.balanceMinor).toBe(1_000);
      expect(codReceivable?.balanceMinor).toBe(1_000);

      await expect(
        createPayoutBatch({
          asOf: new Date("2026-03-03T00:00:00.000Z"),
          sellerId: fixture.seller.id
        })
      ).rejects.toMatchObject({
        code: "NO_ELIGIBLE_PAYOUTS",
        status: 409
      });
    } finally {
      await cleanupSettlementFixture({
        orderIds: [fixture.order.id],
        sellerIds: [fixture.seller.id],
        userIds: [fixture.buyer.id, fixture.sellerUser.id]
      });
    }
  });
});
