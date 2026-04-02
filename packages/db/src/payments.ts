import { createHash } from "node:crypto";
import Redis from "ioredis";
import {
  createPaymentAdapter,
  isWebhookVerificationEnabled,
  readPaymentsConfig,
  resolvePaymentProvider,
  type CheckoutPaymentResult,
  type ExternalPaymentProvider,
  type PaymentMethod
} from "@khmercart/core";
import {
  OrderState,
  Prisma,
  type Currency,
  type Payment,
  type PaymentEvent,
  type PaymentProvider,
  type PaymentStatus
} from "./prisma-client";
import { getConnectionSettings } from "./env";
import {
  appendOrderEventInTransaction,
  transitionOrder,
  transitionOrderInTransaction
} from "./orders";
import { prisma } from "./prisma";

const paymentWithOrderInclude = {
  order: true
} satisfies Prisma.PaymentInclude;

type PaymentWithOrder = Prisma.PaymentGetPayload<{
  include: typeof paymentWithOrderInclude;
}>;

export class PaymentServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.name = "PaymentServiceError";
    this.status = status;
  }
}

export type CheckoutPaymentRecord = CheckoutPaymentResult & {
  id: string;
};

export type ProcessPaymentWebhookInput = {
  headers: Record<string, string>;
  provider: ExternalPaymentProvider;
  rawBody: string;
};

export type ProcessPaymentWebhookResult = {
  alreadyProcessed: boolean;
  orderId: string | null;
  paymentId: string | null;
  paymentStatus: PaymentStatus | null;
  provider: ExternalPaymentProvider;
  providerEventId: string | null;
  signatureVerified: boolean;
};

export type ReconcilePaymentsJobResult = {
  checked: number;
  lockAcquired: boolean;
  skipped: number;
  updated: number;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function createPayloadHash(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

function createHeadersHash(headers: Record<string, string>): string {
  return createHash("sha256").update(stableStringify(headers)).digest("hex");
}

function toPrismaJson(
  value: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value ? (value as Prisma.InputJsonValue) : Prisma.JsonNull;
}

function getPaymentDisplayName(
  method: PaymentMethod,
  provider: PaymentProvider
): string {
  if (method === "COD") {
    return "Cash on delivery";
  }

  if (provider === "BAKONG") {
    return "Bakong KHQR";
  }

  if (provider === "PAYWAY") {
    return "ABA PayWay";
  }

  if (provider === "TOANCHET") {
    return "ACLEDA Toanchet";
  }

  return "Wing";
}

function mapPaymentRowToCheckoutResult(payment: Payment): CheckoutPaymentRecord {
  const details: Record<string, unknown> =
    payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata)
      ? { ...(payment.metadata as Record<string, unknown>) }
      : {};

  if (payment.checkoutUrl) {
    details.checkoutUrl = payment.checkoutUrl;
  }

  if (payment.qrPayload) {
    details.qrPayload = payment.qrPayload;
  }

  details.amountMinor = payment.amountMinor;
  details.currency = payment.currency;

  return {
    checkoutUrl: payment.checkoutUrl,
    details,
    displayName: getPaymentDisplayName(payment.method, payment.provider),
    id: payment.id,
    instructions:
      payment.instructions ??
      (payment.method === "COD"
        ? "Collect payment from the buyer when the order is delivered."
        : "Await provider confirmation before fulfilling the order."),
    method: payment.method,
    provider: payment.provider,
    qrPayload: payment.qrPayload,
    reference: payment.providerReference ?? `${payment.provider}-${payment.id}`,
    status: payment.status
  };
}

function mapProviderStatusToPaymentStatus(status: string): PaymentStatus {
  const normalizedStatus = status.trim().toUpperCase();

  if (
    normalizedStatus === "PAID" ||
    normalizedStatus === "SUCCESS" ||
    normalizedStatus === "SUCCEEDED" ||
    normalizedStatus === "SETTLED" ||
    normalizedStatus === "COMPLETED"
  ) {
    return "SUCCEEDED";
  }

  if (
    normalizedStatus === "AUTHORIZED" ||
    normalizedStatus === "AUTHORISED"
  ) {
    return "AUTHORIZED";
  }

  if (
    normalizedStatus === "PROCESSING" ||
    normalizedStatus === "IN_PROGRESS"
  ) {
    return "PROCESSING";
  }

  if (
    normalizedStatus === "FAILED" ||
    normalizedStatus === "DECLINED" ||
    normalizedStatus === "ERROR"
  ) {
    return "FAILED";
  }

  if (
    normalizedStatus === "CANCELLED" ||
    normalizedStatus === "VOIDED"
  ) {
    return "CANCELLED";
  }

  if (normalizedStatus === "EXPIRED") {
    return "EXPIRED";
  }

  return "PENDING";
}

async function resolvePaymentForWebhook(
  tx: Prisma.TransactionClient,
  input: {
    orderRef: string | null;
    provider: ExternalPaymentProvider;
    providerPaymentId: string | null;
  }
): Promise<PaymentWithOrder | null> {
  if (input.providerPaymentId) {
    const paymentByProviderId = await tx.payment.findFirst({
      include: paymentWithOrderInclude,
      where: {
        provider: input.provider,
        providerPaymentId: input.providerPaymentId
      }
    });

    if (paymentByProviderId) {
      return paymentByProviderId;
    }
  }

  if (!input.orderRef) {
    return null;
  }

  const paymentByReference = await tx.payment.findFirst({
    include: paymentWithOrderInclude,
    where: {
      OR: [
        {
          provider: input.provider,
          providerReference: input.orderRef
        },
        {
          order: {
            id: input.orderRef
          }
        },
        {
          order: {
            orderNumber: input.orderRef
          }
        },
        {
          order: {
            paymentReference: input.orderRef
          }
        }
      ]
    }
  });

  return paymentByReference;
}

async function findExistingPaymentEvent(
  tx: Prisma.TransactionClient,
  input: {
    payloadHash: string;
    provider: ExternalPaymentProvider;
    providerEventId: string | null;
  }
): Promise<PaymentEvent | null> {
  const byPayload = await tx.paymentEvent.findUnique({
    where: {
      provider_payloadHash: {
        payloadHash: input.payloadHash,
        provider: input.provider
      }
    }
  });

  if (byPayload) {
    return byPayload;
  }

  if (!input.providerEventId) {
    return null;
  }

  return tx.paymentEvent.findFirst({
    where: {
      provider: input.provider,
      providerEventId: input.providerEventId
    }
  });
}

async function updateOrderForPaymentStatus(
  tx: Prisma.TransactionClient,
  input: {
    actorMessage: string;
    order: PaymentWithOrder["order"];
    paymentId: string;
    provider: PaymentProvider;
    providerStatus: string;
    nextStatus: PaymentStatus;
  }
) {
  const actor = {
    label: input.provider,
    type: "PAYMENT_PROVIDER" as const
  };

  if (input.nextStatus === "SUCCEEDED" && input.order.state !== OrderState.PAYMENT_CONFIRMED) {
    await transitionOrderInTransaction(
      tx,
      input.order.id,
      "PAYMENT_CONFIRMED",
      actor,
      {
        message: input.actorMessage,
        metadata: {
          paymentId: input.paymentId,
          provider: input.provider,
          providerStatus: input.providerStatus
        }
      }
    );

    return;
  }

  await appendOrderEventInTransaction(tx, {
    actor,
    message: input.actorMessage,
    metadata: {
      paymentId: input.paymentId,
      paymentStatus: input.nextStatus,
      provider: input.provider,
      providerStatus: input.providerStatus
    },
    orderId: input.order.id,
    type: "NOTE_ADDED"
  });
}

async function createCodPayment(
  tx: Prisma.TransactionClient,
  input: {
    amountMinor: number;
    currency: Currency;
    method: PaymentMethod;
    orderId: string;
    orderNumber: string;
  }
): Promise<CheckoutPaymentRecord> {
  const payment = await tx.payment.create({
    data: {
      amountMinor: input.amountMinor,
      checkoutUrl: null,
      currency: input.currency,
      instructions: "Collect payment from the buyer when the order is delivered.",
      metadata: {
        amountMinor: input.amountMinor,
        currency: input.currency
      },
      method: input.method,
      orderId: input.orderId,
      provider: "COD",
      providerReference: `COD-${input.orderNumber}`,
      qrPayload: null,
      status: "NOT_REQUIRED"
    }
  });

  return mapPaymentRowToCheckoutResult(payment);
}

export async function createCheckoutPaymentRecord(
  tx: Prisma.TransactionClient,
  input: {
    amountMinor: number;
    currency: Currency;
    method: PaymentMethod;
    orderId: string;
    orderNumber: string;
  }
): Promise<CheckoutPaymentRecord> {
  if (input.method === "COD") {
    return createCodPayment(tx, input);
  }

  const provider = resolvePaymentProvider(input.method);

  if (provider === "COD") {
    return createCodPayment(tx, input);
  }

  const paymentAdapter = createPaymentAdapter(provider, process.env);
  const paymentsConfig = readPaymentsConfig(process.env);
  const paymentIntent = await paymentAdapter.createPaymentIntent({
    amountMinor: input.amountMinor,
    currency: input.currency,
    metadata: {
      method: input.method
    },
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    webhookBaseUrl: paymentsConfig.webhookBaseUrl
  });

  const payment = await tx.payment.create({
    data: {
      amountMinor: input.amountMinor,
      checkoutUrl: paymentIntent.checkoutUrl,
      currency: input.currency,
      instructions: paymentIntent.instructions,
      metadata: toPrismaJson(paymentIntent.metadata),
      method: input.method,
      orderId: input.orderId,
      provider,
      providerPaymentId: paymentIntent.providerPaymentId,
      providerReference: paymentIntent.reference,
      qrPayload: paymentIntent.qrPayload,
      status: paymentIntent.status
    }
  });

  return mapPaymentRowToCheckoutResult(payment);
}

export async function processPaymentWebhook(
  input: ProcessPaymentWebhookInput
): Promise<ProcessPaymentWebhookResult> {
  const paymentsConfig = readPaymentsConfig(process.env);
  const paymentAdapter = createPaymentAdapter(input.provider, process.env);
  const signatureVerified = await paymentAdapter.verifyWebhook(
    input.rawBody,
    input.headers
  );

  if (!signatureVerified && isWebhookVerificationEnabled(input.provider, paymentsConfig)) {
    throw new PaymentServiceError(
      "INVALID_SIGNATURE",
      "Webhook signature verification failed.",
      401
    );
  }

  const webhookEvent = paymentAdapter.parseEvent(input.rawBody);
  const payloadHash = createPayloadHash(input.rawBody);
  const headersHash = createHeadersHash(input.headers);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existingEvent = await findExistingPaymentEvent(tx, {
            payloadHash,
            provider: input.provider,
            providerEventId: webhookEvent.providerEventId
          });

          if (existingEvent) {
            return {
              alreadyProcessed: true,
              orderId: existingEvent.orderId ?? null,
              paymentId: existingEvent.paymentId ?? null,
              paymentStatus: null,
              provider: input.provider,
              providerEventId: existingEvent.providerEventId ?? null,
              signatureVerified: existingEvent.signatureVerified
            };
          }

          const payment = await resolvePaymentForWebhook(tx, {
            orderRef: webhookEvent.orderRef ?? null,
            provider: input.provider,
            providerPaymentId: webhookEvent.providerPaymentId ?? null
          });
          const nextStatus = mapProviderStatusToPaymentStatus(webhookEvent.status);
          const now = new Date();

          let updatedPaymentId: string | null = payment?.id ?? null;
          let updatedOrderId: string | null = payment?.orderId ?? null;

          if (payment) {
            const nextMetadata = {
              ...(payment.metadata &&
              typeof payment.metadata === "object" &&
              !Array.isArray(payment.metadata)
                ? (payment.metadata as Record<string, unknown>)
                : {}),
              latestWebhookEventType: webhookEvent.eventType,
              latestWebhookPayloadHash: payloadHash,
              latestWebhookReceivedAt: now.toISOString(),
              providerStatus: webhookEvent.status,
              webhookMetadata:
                webhookEvent.metadata && Object.keys(webhookEvent.metadata).length > 0
                  ? webhookEvent.metadata
                  : null
            };

            const updatedPayment = await tx.payment.update({
              data: {
                failedAt:
                  nextStatus === "FAILED" ||
                  nextStatus === "CANCELLED" ||
                  nextStatus === "EXPIRED"
                    ? now
                    : null,
                lastReconciledAt: now,
                metadata: toPrismaJson(nextMetadata),
                providerPaymentId:
                  webhookEvent.providerPaymentId ?? payment.providerPaymentId,
                status: nextStatus
              },
              where: {
                id: payment.id
              }
            });

            updatedPaymentId = updatedPayment.id;
            updatedOrderId = updatedPayment.orderId;

            if (
              updatedPayment.status !== payment.status ||
              payment.order.state !== OrderState.PAYMENT_CONFIRMED
            ) {
              await updateOrderForPaymentStatus(tx, {
                actorMessage: `Payment update from ${input.provider}: ${webhookEvent.status}.`,
                nextStatus,
                order: payment.order,
                paymentId: updatedPayment.id,
                provider: updatedPayment.provider,
                providerStatus: webhookEvent.status
              });
            }
          }

          await tx.paymentEvent.create({
            data: {
              eventType: webhookEvent.eventType,
              headersHash,
              idempotencyKey: webhookEvent.idempotencyKey ?? null,
              metadata: toPrismaJson(webhookEvent.metadata ?? null),
              orderId: updatedOrderId,
              payloadHash,
              paymentId: updatedPaymentId,
              processedAt: now,
              provider: input.provider,
              providerEventId: webhookEvent.providerEventId,
              providerStatus: webhookEvent.status,
              signatureVerified
            }
          });

          return {
            alreadyProcessed: false,
            orderId: updatedOrderId,
            paymentId: updatedPaymentId,
            paymentStatus: payment ? nextStatus : null,
            provider: input.provider,
            providerEventId: webhookEvent.providerEventId,
            signatureVerified
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3
      ) {
        continue;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingEvent = await prisma.paymentEvent.findUnique({
          where: {
            provider_payloadHash: {
              payloadHash,
              provider: input.provider
            }
          }
        });

        return {
          alreadyProcessed: true,
          orderId: existingEvent?.orderId ?? null,
          paymentId: existingEvent?.paymentId ?? null,
          paymentStatus: null,
          provider: input.provider,
          providerEventId: existingEvent?.providerEventId ?? webhookEvent.providerEventId,
          signatureVerified: existingEvent?.signatureVerified ?? signatureVerified
        };
      }

      throw error;
    }
  }

  throw new PaymentServiceError(
    "INTERNAL_SERVER_ERROR",
    "Webhook could not be processed.",
    500
  );
}

async function createRedisClient(): Promise<Redis | null> {
  const { redisUrl } = getConnectionSettings(process.env);

  if (!redisUrl) {
    return null;
  }

  return new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });
}

async function acquireReconciliationLock(
  redis: Redis | null,
  ttlSeconds: number
): Promise<{ key: string; token: string } | null> {
  if (!redis) {
    return {
      key: "",
      token: ""
    };
  }

  const key = "payments:reconciliation:lock";
  const token = crypto.randomUUID();

  await redis.connect();

  const result = await redis.set(key, token, "EX", ttlSeconds, "NX");

  if (result !== "OK") {
    return null;
  }

  return {
    key,
    token
  };
}

async function releaseReconciliationLock(
  redis: Redis | null,
  lock: { key: string; token: string } | null
) {
  if (!redis || !lock || !lock.key) {
    return;
  }

  const currentToken = await redis.get(lock.key);

  if (currentToken === lock.token) {
    await redis.del(lock.key);
  }
}

export async function runPaymentReconciliationJob(input?: {
  limit?: number;
  lockTtlSeconds?: number;
}): Promise<ReconcilePaymentsJobResult> {
  const limit = input?.limit ?? 50;
  const lockTtlSeconds = input?.lockTtlSeconds ?? 60;
  const redis = await createRedisClient();
  const lock = await acquireReconciliationLock(redis, lockTtlSeconds);

  if (redis && !lock) {
    await redis.quit();

    return {
      checked: 0,
      lockAcquired: false,
      skipped: 0,
      updated: 0
    };
  }

  try {
    const payments = await prisma.payment.findMany({
      include: paymentWithOrderInclude,
      orderBy: {
        createdAt: "asc"
      },
      take: limit,
      where: {
        provider: {
          not: "COD"
        },
        status: {
          in: ["AUTHORIZED", "PENDING", "PROCESSING"]
        }
      }
    });

    let updated = 0;
    let skipped = 0;

    for (const payment of payments) {
      const adapter = createPaymentAdapter(
        payment.provider as ExternalPaymentProvider,
        process.env
      );

      if (!adapter.reconcilePayment) {
        skipped += 1;
        continue;
      }

      const reconciliation = await adapter.reconcilePayment({
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        metadata:
          payment.metadata &&
          typeof payment.metadata === "object" &&
          !Array.isArray(payment.metadata)
            ? (payment.metadata as Record<string, unknown>)
            : null,
        orderId: payment.orderId,
        paymentId: payment.id,
        providerPaymentId: payment.providerPaymentId,
        reference: payment.providerReference
      });

      if (!reconciliation) {
        skipped += 1;
        continue;
      }

      const nextStatus = mapProviderStatusToPaymentStatus(reconciliation.status);
      const nextMetadata = {
        ...(payment.metadata &&
        typeof payment.metadata === "object" &&
        !Array.isArray(payment.metadata)
          ? (payment.metadata as Record<string, unknown>)
          : {}),
        ...(reconciliation.metadata ?? {}),
        lastReconciliationRunAt: new Date().toISOString()
      };
      const needsUpdate =
        payment.status !== nextStatus ||
        payment.providerPaymentId !==
          (reconciliation.providerPaymentId ?? payment.providerPaymentId);

      await prisma.payment.update({
        data: {
          failedAt:
            nextStatus === "FAILED" ||
            nextStatus === "CANCELLED" ||
            nextStatus === "EXPIRED"
              ? new Date()
              : null,
          lastReconciledAt: new Date(),
          metadata: toPrismaJson(nextMetadata),
          providerPaymentId:
            reconciliation.providerPaymentId ?? payment.providerPaymentId,
          status: nextStatus
        },
        where: {
          id: payment.id
        }
      });

      if (needsUpdate) {
        updated += 1;

        if (
          nextStatus === "SUCCEEDED" &&
          payment.order.state !== OrderState.PAYMENT_CONFIRMED
        ) {
          await transitionOrder(
            payment.orderId,
            "PAYMENT_CONFIRMED",
            {
              label: payment.provider,
              type: "PAYMENT_PROVIDER"
            },
            {
              message: `Payment reconciliation confirmed ${payment.provider} payment.`,
              metadata: {
                paymentId: payment.id,
                provider: payment.provider,
                reconciliationStatus: reconciliation.status
              }
            }
          );
        }
      } else {
        skipped += 1;
      }
    }

    return {
      checked: payments.length,
      lockAcquired: true,
      skipped,
      updated
    };
  } finally {
    await releaseReconciliationLock(redis, lock);

    if (redis) {
      await redis.quit();
    }
  }
}
