import {
  readLedgerConfig,
  type PayoutCsvColumn,
  type SellerRiskTier
} from "@khmercart/core";
import {
  LedgerAccountType,
  Prisma,
  PayoutBatchStatus,
  type Currency,
  type LedgerDirection
} from "./prisma-client";
import { prisma } from "./prisma";

const NORMAL_DEBIT_ACCOUNT_TYPES = new Set<LedgerAccountType>([
  LedgerAccountType.ASSET,
  LedgerAccountType.EXPENSE
]);

type LedgerPostingEntry = {
  accountId: string;
  amountMinor: number;
  currency: Currency;
  direction: LedgerDirection;
  effectiveAt: Date;
  entryGroupKey: string;
  externalRef?: string | null;
  memo?: string | null;
  orderId?: string | null;
  payoutBatchId?: string | null;
};

type PostedOrderRecord = Prisma.OrderGetPayload<{
  include: {
    seller: true;
  };
}>;

type HeldEntryRecord = Prisma.LedgerEntryGetPayload<{
  include: {
    account: true;
    order: {
      include: {
        seller: true;
      };
    };
  };
}>;

type PayableEntryRecord = Prisma.LedgerEntryGetPayload<{
  include: {
    account: true;
    order: {
      include: {
        seller: true;
      };
    };
  };
}>;

export class LedgerServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.name = "LedgerServiceError";
    this.status = status;
  }
}

export type PostedSaleResult = {
  feeMinor: number;
  grossMinor: number;
  heldAmountMinor: number;
  netMinor: number;
  orderId: string;
  paymentFlow: "COD" | "PREPAID";
  replayed: boolean;
  sellerId: string;
  settledAt: string;
};

export type ReleaseHoldResult = {
  asOf: string;
  checked: number;
  releasedAmountMinor: number;
  releasedCount: number;
  sellerId: string | null;
};

export type PayoutBatchItemSummary = {
  currency: Currency;
  feeAmountMinor: number;
  grossAmountMinor: number;
  id: string;
  ledgerEntryId: string;
  netAmountMinor: number;
  orderId: string | null;
};

export type PayoutBatchResult = {
  createdAt: string;
  currency: Currency;
  feeAmountMinor: number;
  grossAmountMinor: number;
  id: string;
  items: PayoutBatchItemSummary[];
  netAmountMinor: number;
  periodEnd: string;
  periodStart: string;
  reference: string | null;
  releasedAmountMinor: number;
  sellerId: string;
  status: PayoutBatchStatus;
};

export type ExportPayoutCsvResult = {
  columns: PayoutCsvColumn[];
  csv: string;
  filename: string;
  rowCount: number;
};

export type LedgerAccountBalance = {
  accountId: string;
  balanceMinor: number;
  code: string;
  creditMinor: number;
  currency: Currency;
  debitMinor: number;
  name: string;
  sellerId: string | null;
  type: LedgerAccountType;
};

export type CreatePayoutBatchInput = {
  actorUserId?: string | null;
  asOf?: Date;
  currency?: Currency;
  notes?: string | null;
  reference?: string | null;
  scheduledFor?: Date | null;
  sellerId: string;
};

type SystemAccountSet = {
  codFeeReceivable: { id: string };
  feeRevenue: { id: string };
  platformCash: { id: string };
};

type SellerAccountSet = {
  codFeeReceivable: { id: string };
  held: { id: string };
  payable: { id: string };
};

function createPlatformAccountCode(currency: Currency, suffix: string) {
  return `platform:${currency.toLowerCase()}:${suffix}`;
}

function createSellerAccountCode(
  sellerId: string,
  currency: Currency,
  suffix: string
) {
  return `seller:${sellerId}:${currency.toLowerCase()}:${suffix}`;
}

function createSalePostGroupKey(orderId: string) {
  return `sale:${orderId}:posted`;
}

function createSaleReleaseGroupKey(orderId: string) {
  return `sale:${orderId}:released`;
}

function createPayoutReference(now: Date) {
  return `PB-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function calculatePlatformFeeMinor(input: {
  platformFeeBps: number;
  subtotalMinor: number;
  totalMinor: number;
}) {
  if (input.platformFeeBps <= 0 || input.subtotalMinor <= 0 || input.totalMinor <= 0) {
    return 0;
  }

  const rawFeeMinor = Math.floor((input.subtotalMinor * input.platformFeeBps) / 10_000);

  return Math.max(0, Math.min(rawFeeMinor, input.totalMinor));
}

function getNormalBalanceAmount(input: {
  accountType: LedgerAccountType;
  creditMinor: number;
  debitMinor: number;
}) {
  if (NORMAL_DEBIT_ACCOUNT_TYPES.has(input.accountType)) {
    return input.debitMinor - input.creditMinor;
  }

  return input.creditMinor - input.debitMinor;
}

function getHoldDaysForRiskTier(
  riskTier: SellerRiskTier,
  config = readLedgerConfig(process.env)
) {
  return config.holdDaysByRiskTier[riskTier];
}

function createCsvRow(values: string[]) {
  return values
    .map((value) =>
      /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
    )
    .join(",");
}

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function ensureLedgerAccount(
  tx: Prisma.TransactionClient,
  input: {
    code: string;
    currency: Currency;
    isSystem?: boolean;
    name: string;
    sellerId?: string | null;
    type: LedgerAccountType;
  }
) {
  return tx.ledgerAccount.upsert({
    create: {
      code: input.code,
      currency: input.currency,
      isSystem: input.isSystem ?? false,
      name: input.name,
      sellerId: input.sellerId ?? null,
      type: input.type
    },
    update: {
      currency: input.currency,
      isSystem: input.isSystem ?? false,
      name: input.name,
      sellerId: input.sellerId ?? null,
      type: input.type
    },
    where: {
      code: input.code
    }
  });
}

async function ensureSystemAccounts(
  tx: Prisma.TransactionClient,
  currency: Currency
): Promise<SystemAccountSet> {
  const [platformCash, feeRevenue, codFeeReceivable] = await Promise.all([
    ensureLedgerAccount(tx, {
      code: createPlatformAccountCode(currency, "cash"),
      currency,
      isSystem: true,
      name: `Platform Cash ${currency}`,
      type: LedgerAccountType.ASSET
    }),
    ensureLedgerAccount(tx, {
      code: createPlatformAccountCode(currency, "fee_revenue"),
      currency,
      isSystem: true,
      name: `Platform Fee Revenue ${currency}`,
      type: LedgerAccountType.REVENUE
    }),
    ensureLedgerAccount(tx, {
      code: createPlatformAccountCode(currency, "cod_fee_receivable"),
      currency,
      isSystem: true,
      name: `Platform COD Fee Receivable ${currency}`,
      type: LedgerAccountType.ASSET
    })
  ]);

  return {
    codFeeReceivable,
    feeRevenue,
    platformCash
  };
}

async function ensureSellerAccounts(
  tx: Prisma.TransactionClient,
  input: {
    currency: Currency;
    sellerId: string;
    sellerName: string;
  }
): Promise<SellerAccountSet> {
  const [held, payable, codFeeReceivable] = await Promise.all([
    ensureLedgerAccount(tx, {
      code: createSellerAccountCode(input.sellerId, input.currency, "held"),
      currency: input.currency,
      name: `${input.sellerName} Held Balance ${input.currency}`,
      sellerId: input.sellerId,
      type: LedgerAccountType.LIABILITY
    }),
    ensureLedgerAccount(tx, {
      code: createSellerAccountCode(input.sellerId, input.currency, "payable"),
      currency: input.currency,
      name: `${input.sellerName} Available Payable ${input.currency}`,
      sellerId: input.sellerId,
      type: LedgerAccountType.LIABILITY
    }),
    ensureLedgerAccount(tx, {
      code: createSellerAccountCode(input.sellerId, input.currency, "cod_fee_receivable"),
      currency: input.currency,
      name: `${input.sellerName} COD Fee Receivable ${input.currency}`,
      sellerId: input.sellerId,
      type: LedgerAccountType.ASSET
    })
  ]);

  return {
    codFeeReceivable,
    held,
    payable
  };
}

async function createLedgerEntries(
  tx: Prisma.TransactionClient,
  entries: LedgerPostingEntry[]
) {
  if (entries.length === 0) {
    return;
  }

  await tx.ledgerEntry.createMany({
    data: entries.map((entry) => ({
      accountId: entry.accountId,
      amountMinor: entry.amountMinor,
      currency: entry.currency,
      direction: entry.direction,
      effectiveAt: entry.effectiveAt,
      entryGroupKey: entry.entryGroupKey,
      externalRef: entry.externalRef ?? null,
      memo: entry.memo ?? null,
      orderId: entry.orderId ?? null,
      payoutBatchId: entry.payoutBatchId ?? null
    }))
  });
}

async function requireOrderForSettlement(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<PostedOrderRecord> {
  const order = await tx.order.findUnique({
    include: {
      seller: true
    },
    where: {
      id: orderId
    }
  });

  if (!order) {
    throw new LedgerServiceError("NOT_FOUND", "Order not found.", 404);
  }

  if (order.state !== "DELIVERED" && order.state !== "COMPLETED") {
    throw new LedgerServiceError(
      "ORDER_NOT_SETTLABLE",
      "Sale posting requires a delivered or completed order.",
      409
    );
  }

  return order;
}

async function readExistingPosting(
  tx: Prisma.TransactionClient,
  entryGroupKey: string
) {
  return tx.ledgerEntry.findFirst({
    where: {
      entryGroupKey
    }
  });
}

async function recordSettlementAudit(
  tx: Prisma.TransactionClient,
  input: {
    action: string;
    actorUserId?: string | null;
    afterData: Record<string, unknown>;
    entityId: string;
    entityType: string;
  }
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      afterData: toPrismaJsonValue(input.afterData),
      beforeData: Prisma.JsonNull,
      entityId: input.entityId,
      entityType: input.entityType
    }
  });
}

async function postSaleWithClient(
  tx: Prisma.TransactionClient,
  input: {
    now: Date;
    orderId: string;
  }
): Promise<PostedSaleResult> {
  const config = readLedgerConfig(process.env);
  const order = await requireOrderForSettlement(tx, input.orderId);
  const entryGroupKey = createSalePostGroupKey(order.id);
  const existingPosting = await readExistingPosting(tx, entryGroupKey);
  const feeMinor = calculatePlatformFeeMinor({
    platformFeeBps: config.platformFeeBps,
    subtotalMinor: order.subtotalMinor,
    totalMinor: order.totalMinor
  });
  const netMinor = Math.max(order.totalMinor - feeMinor, 0);
  const isCod = order.paymentMethod === "COD";

  if (!existingPosting) {
    const systemAccounts = await ensureSystemAccounts(tx, order.currency);
    const sellerAccounts = await ensureSellerAccounts(tx, {
      currency: order.currency,
      sellerId: order.sellerId,
      sellerName: order.seller.displayName
    });
    const entries: LedgerPostingEntry[] = [];

    if (isCod) {
      entries.push({
        accountId: sellerAccounts.codFeeReceivable.id,
        amountMinor: feeMinor,
        currency: order.currency,
        direction: "DEBIT",
        effectiveAt: input.now,
        entryGroupKey,
        externalRef: `${entryGroupKey}:cod_receivable`,
        memo: `COD fee receivable for ${order.orderNumber}.`,
        orderId: order.id
      });
    } else {
      entries.push({
        accountId: systemAccounts.platformCash.id,
        amountMinor: order.totalMinor,
        currency: order.currency,
        direction: "DEBIT",
        effectiveAt: input.now,
        entryGroupKey,
        externalRef: `${entryGroupKey}:platform_cash`,
        memo: `Prepaid customer funds collected for ${order.orderNumber}.`,
        orderId: order.id
      });
      entries.push({
        accountId: sellerAccounts.held.id,
        amountMinor: netMinor,
        currency: order.currency,
        direction: "CREDIT",
        effectiveAt: input.now,
        entryGroupKey,
        externalRef: `${entryGroupKey}:seller_held`,
        memo: `Held seller balance for ${order.orderNumber}.`,
        orderId: order.id
      });
    }

    entries.push({
      accountId: systemAccounts.feeRevenue.id,
      amountMinor: feeMinor,
      currency: order.currency,
      direction: "CREDIT",
      effectiveAt: input.now,
      entryGroupKey,
      externalRef: `${entryGroupKey}:platform_fee`,
      memo: `Platform fee for ${order.orderNumber}.`,
      orderId: order.id
    });

    await createLedgerEntries(tx, entries);
  }

  return {
    feeMinor,
    grossMinor: order.totalMinor,
    heldAmountMinor: isCod ? 0 : netMinor,
    netMinor,
    orderId: order.id,
    paymentFlow: isCod ? "COD" : "PREPAID",
    replayed: Boolean(existingPosting),
    sellerId: order.sellerId,
    settledAt: input.now.toISOString()
  };
}

async function getReleasableHeldEntries(
  tx: Prisma.TransactionClient,
  input: {
    asOf: Date;
    sellerId?: string | null;
  }
) {
  const heldEntries = await tx.ledgerEntry.findMany({
    include: {
      account: true,
      order: {
        include: {
          seller: true
        }
      }
    },
    orderBy: [{ effectiveAt: "asc" }, { createdAt: "asc" }],
    where: {
      account: {
        code: {
          endsWith: ":held"
        },
        ...(input.sellerId ? { sellerId: input.sellerId } : {})
      },
      direction: "CREDIT",
      orderId: {
        not: null
      }
    }
  });

  const releasable: HeldEntryRecord[] = [];

  for (const entry of heldEntries) {
    if (!entry.order?.seller) {
      continue;
    }

    const releaseGroupKey = createSaleReleaseGroupKey(entry.orderId!);
    const existingRelease = await tx.ledgerEntry.findFirst({
      where: {
        entryGroupKey: releaseGroupKey
      }
    });

    if (existingRelease) {
      continue;
    }

    const eligibleAt = addDays(
      entry.effectiveAt,
      getHoldDaysForRiskTier(entry.order.seller.riskTier as SellerRiskTier)
    );

    if (eligibleAt.getTime() <= input.asOf.getTime()) {
      releasable.push(entry);
    }
  }

  return releasable;
}

async function releaseHoldWithClient(
  tx: Prisma.TransactionClient,
  input: {
    asOf: Date;
    sellerId?: string | null;
  }
): Promise<ReleaseHoldResult> {
  const releasableEntries = await getReleasableHeldEntries(tx, input);
  let releasedAmountMinor = 0;

  for (const entry of releasableEntries) {
    if (!entry.order?.seller || !entry.orderId) {
      continue;
    }

    const sellerAccounts = await ensureSellerAccounts(tx, {
      currency: entry.currency,
      sellerId: entry.order.seller.id,
      sellerName: entry.order.seller.displayName
    });
    const entryGroupKey = createSaleReleaseGroupKey(entry.orderId);

    await createLedgerEntries(tx, [
      {
        accountId: sellerAccounts.held.id,
        amountMinor: entry.amountMinor,
        currency: entry.currency,
        direction: "DEBIT",
        effectiveAt: input.asOf,
        entryGroupKey,
        externalRef: `${entryGroupKey}:held_release`,
        memo: `Release held balance for ${entry.order.orderNumber}.`,
        orderId: entry.orderId
      },
      {
        accountId: sellerAccounts.payable.id,
        amountMinor: entry.amountMinor,
        currency: entry.currency,
        direction: "CREDIT",
        effectiveAt: input.asOf,
        entryGroupKey,
        externalRef: `${entryGroupKey}:available_payable`,
        memo: `Available seller payout balance for ${entry.order.orderNumber}.`,
        orderId: entry.orderId
      }
    ]);

    releasedAmountMinor += entry.amountMinor;
  }

  return {
    asOf: input.asOf.toISOString(),
    checked: releasableEntries.length,
    releasedAmountMinor,
    releasedCount: releasableEntries.length,
    sellerId: input.sellerId ?? null
  };
}

function calculatePayoutItemAmounts(input: {
  platformFeeBps: number;
  order: NonNullable<PayableEntryRecord["order"]>;
  releasedAmountMinor: number;
}) {
  const feeAmountMinor = calculatePlatformFeeMinor({
    platformFeeBps: input.platformFeeBps,
    subtotalMinor: input.order.subtotalMinor,
    totalMinor: input.order.totalMinor
  });

  return {
    feeAmountMinor,
    grossAmountMinor: input.order.totalMinor,
    netAmountMinor: input.releasedAmountMinor
  };
}

async function requireSellerForPayout(
  tx: Prisma.TransactionClient,
  sellerId: string
) {
  const seller = await tx.seller.findUnique({
    where: {
      id: sellerId
    }
  });

  if (!seller) {
    throw new LedgerServiceError("NOT_FOUND", "Seller not found.", 404);
  }

  const payoutFields = [
    seller.payoutBankName,
    seller.payoutAccountName,
    seller.payoutAccountNumber,
    seller.payoutRoutingNumber
  ].map((value) => normalizeText(value));

  if (payoutFields.some((value) => !value)) {
    throw new LedgerServiceError(
      "PAYOUT_PROFILE_INCOMPLETE",
      "Seller payout bank details are incomplete.",
      409
    );
  }

  return seller;
}

async function createPayoutBatchWithClient(
  tx: Prisma.TransactionClient,
  input: {
    actorUserId?: string | null;
    asOf: Date;
    currency?: Currency;
    notes?: string | null;
    reference?: string | null;
    scheduledFor?: Date | null;
    sellerId: string;
  }
): Promise<PayoutBatchResult> {
  const config = readLedgerConfig(process.env);
  const seller = await requireSellerForPayout(tx, input.sellerId);
  const currency = input.currency ?? seller.defaultCurrency;

  const releaseResult = await releaseHoldWithClient(tx, {
    asOf: input.asOf,
    sellerId: seller.id
  });
  const payableAccountCode = createSellerAccountCode(seller.id, currency, "payable");
  const payableEntries = await tx.ledgerEntry.findMany({
    include: {
      account: true,
      order: {
        include: {
          seller: true
        }
      }
    },
    orderBy: [{ effectiveAt: "asc" }, { createdAt: "asc" }],
    where: {
      account: {
        code: payableAccountCode
      },
      currency,
      direction: "CREDIT",
      payoutBatchId: null
    }
  });

  if (payableEntries.length === 0) {
    throw new LedgerServiceError(
      "NO_ELIGIBLE_PAYOUTS",
      "No eligible seller balance is available for payout.",
      409
    );
  }

  const batch = await tx.payoutBatch.create({
    data: {
      currency,
      feeAmountMinor: 0,
      grossAmountMinor: 0,
      netAmountMinor: 0,
      notes: normalizeText(input.notes) || null,
      periodEnd: payableEntries[payableEntries.length - 1]?.effectiveAt ?? input.asOf,
      periodStart: payableEntries[0]?.effectiveAt ?? input.asOf,
      reference: normalizeText(input.reference) || createPayoutReference(input.asOf),
      scheduledFor: input.scheduledFor ?? null,
      sellerId: seller.id,
      status: PayoutBatchStatus.DRAFT
    }
  });

  const payoutItems = payableEntries.map((entry) => {
    const order = entry.order;
    const amounts = order
      ? calculatePayoutItemAmounts({
          order,
          platformFeeBps: config.platformFeeBps,
          releasedAmountMinor: entry.amountMinor
        })
      : {
          feeAmountMinor: 0,
          grossAmountMinor: entry.amountMinor,
          netAmountMinor: entry.amountMinor
        };

    return {
      currency,
      feeAmountMinor: amounts.feeAmountMinor,
      grossAmountMinor: amounts.grossAmountMinor,
      ledgerEntryId: entry.id,
      netAmountMinor: amounts.netAmountMinor,
      orderId: entry.orderId,
      payoutBatchId: batch.id,
      sellerId: seller.id
    };
  });

  await tx.payoutItem.createMany({
    data: payoutItems
  });
  await tx.ledgerEntry.updateMany({
    data: {
      payoutBatchId: batch.id
    },
    where: {
      id: {
        in: payoutItems.map((item) => item.ledgerEntryId)
      }
    }
  });

  const totals = payoutItems.reduce(
    (result, item) => ({
      feeAmountMinor: result.feeAmountMinor + item.feeAmountMinor,
      grossAmountMinor: result.grossAmountMinor + item.grossAmountMinor,
      netAmountMinor: result.netAmountMinor + item.netAmountMinor
    }),
    {
      feeAmountMinor: 0,
      grossAmountMinor: 0,
      netAmountMinor: 0
    }
  );

  const updatedBatch = await tx.payoutBatch.update({
    data: {
      feeAmountMinor: totals.feeAmountMinor,
      grossAmountMinor: totals.grossAmountMinor,
      netAmountMinor: totals.netAmountMinor
    },
    include: {
      items: {
        orderBy: {
          createdAt: "asc"
        }
      }
    },
    where: {
      id: batch.id
    }
  });

  if (input.actorUserId) {
    await recordSettlementAudit(tx, {
      action: "PAYOUT_BATCH_CREATED",
      actorUserId: input.actorUserId,
      afterData: {
        currency,
        feeAmountMinor: totals.feeAmountMinor,
        grossAmountMinor: totals.grossAmountMinor,
        netAmountMinor: totals.netAmountMinor,
        payoutBatchId: updatedBatch.id,
        sellerId: seller.id
      },
      entityId: updatedBatch.id,
      entityType: "PayoutBatch"
    });
  }

  return {
    createdAt: updatedBatch.createdAt.toISOString(),
    currency: updatedBatch.currency,
    feeAmountMinor: updatedBatch.feeAmountMinor,
    grossAmountMinor: updatedBatch.grossAmountMinor,
    id: updatedBatch.id,
    items: updatedBatch.items.map((item) => ({
      currency: item.currency,
      feeAmountMinor: item.feeAmountMinor,
      grossAmountMinor: item.grossAmountMinor,
      id: item.id,
      ledgerEntryId: item.ledgerEntryId,
      netAmountMinor: item.netAmountMinor,
      orderId: item.orderId ?? null
    })),
    netAmountMinor: updatedBatch.netAmountMinor,
    periodEnd: updatedBatch.periodEnd.toISOString(),
    periodStart: updatedBatch.periodStart.toISOString(),
    reference: updatedBatch.reference ?? null,
    releasedAmountMinor: releaseResult.releasedAmountMinor,
    sellerId: updatedBatch.sellerId,
    status: updatedBatch.status
  };
}

async function runSerializableTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new LedgerServiceError(
    "INTERNAL_SERVER_ERROR",
    "Ledger transaction could not be completed.",
    500
  );
}

export async function postSale(input: {
  now?: Date;
  orderId: string;
}): Promise<PostedSaleResult> {
  return runSerializableTransaction((tx) =>
    postSaleWithClient(tx, {
      now: input.now ?? new Date(),
      orderId: input.orderId
    })
  );
}

export async function releaseHold(input?: {
  asOf?: Date;
  sellerId?: string | null;
}): Promise<ReleaseHoldResult> {
  return runSerializableTransaction((tx) =>
    releaseHoldWithClient(tx, {
      asOf: input?.asOf ?? new Date(),
      sellerId: input?.sellerId ?? null
    })
  );
}

export async function createPayoutBatch(
  input: CreatePayoutBatchInput
): Promise<PayoutBatchResult> {
  return runSerializableTransaction((tx) =>
    createPayoutBatchWithClient(tx, {
      actorUserId: input.actorUserId ?? null,
      asOf: input.asOf ?? new Date(),
      currency: input.currency,
      notes: input.notes ?? null,
      reference: input.reference ?? null,
      scheduledFor: input.scheduledFor ?? null,
      sellerId: input.sellerId
    })
  );
}

export async function exportPayoutCSV(input: {
  payoutBatchId: string;
}): Promise<ExportPayoutCsvResult> {
  const config = readLedgerConfig(process.env);
  const batch = await prisma.payoutBatch.findUnique({
    include: {
      items: true,
      seller: true
    },
    where: {
      id: input.payoutBatchId
    }
  });

  if (!batch) {
    throw new LedgerServiceError("NOT_FOUND", "Payout batch not found.", 404);
  }

  const row = config.payoutCsvColumns.map((column) => {
    if (column === "batch_id") {
      return batch.id;
    }

    if (column === "reference") {
      return batch.reference ?? "";
    }

    if (column === "seller_id") {
      return batch.sellerId;
    }

    if (column === "seller_slug") {
      return batch.seller.slug;
    }

    if (column === "seller_name") {
      return batch.seller.displayName;
    }

    if (column === "currency") {
      return batch.currency;
    }

    if (column === "gross_amount_minor") {
      return `${batch.grossAmountMinor}`;
    }

    if (column === "fee_amount_minor") {
      return `${batch.feeAmountMinor}`;
    }

    if (column === "net_amount_minor") {
      return `${batch.netAmountMinor}`;
    }

    if (column === "payout_bank_name") {
      return batch.seller.payoutBankName ?? "";
    }

    if (column === "payout_account_name") {
      return batch.seller.payoutAccountName ?? "";
    }

    if (column === "payout_account_number") {
      return batch.seller.payoutAccountNumber ?? "";
    }

    if (column === "payout_routing_number") {
      return batch.seller.payoutRoutingNumber ?? "";
    }

    if (column === "period_start") {
      return batch.periodStart.toISOString();
    }

    if (column === "period_end") {
      return batch.periodEnd.toISOString();
    }

    return `${batch.items.length}`;
  });
  const csv = [createCsvRow([...config.payoutCsvColumns]), createCsvRow(row)].join("\n");

  return {
    columns: config.payoutCsvColumns,
    csv,
    filename: `payout-batch-${batch.reference ?? batch.id}.csv`,
    rowCount: 1
  };
}

export async function getLedgerAccountBalances(input?: {
  sellerId?: string | null;
}) {
  const accounts = await prisma.ledgerAccount.findMany({
    include: {
      entries: true
    },
    orderBy: [{ isSystem: "desc" }, { code: "asc" }],
    where: input?.sellerId ? { sellerId: input.sellerId } : undefined
  });

  return accounts.map((account): LedgerAccountBalance => {
    const debitMinor = account.entries
      .filter((entry) => entry.direction === "DEBIT")
      .reduce((total, entry) => total + entry.amountMinor, 0);
    const creditMinor = account.entries
      .filter((entry) => entry.direction === "CREDIT")
      .reduce((total, entry) => total + entry.amountMinor, 0);

    return {
      accountId: account.id,
      balanceMinor: getNormalBalanceAmount({
        accountType: account.type,
        creditMinor,
        debitMinor
      }),
      code: account.code,
      creditMinor,
      currency: account.currency,
      debitMinor,
      name: account.name,
      sellerId: account.sellerId ?? null,
      type: account.type
    };
  });
}
