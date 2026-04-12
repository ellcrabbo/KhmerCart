import {
  detectPaywaySandboxPlaceholderQr,
  formatDisputeReason,
  formatDisputeStatus,
  formatKycStatus
} from "@khmercart/core";
import type { AuthConfig } from "@khmercart/core/auth";
import {
  DisputeStatus,
  PaymentProvider,
  Prisma,
  ProductModerationStatus,
  ProductStatus,
  UserRole,
  VideoPostModerationStatus,
  VideoPostStatus
} from "./prisma-client";
import type { DisputeReason, KycStatus, PaymentMethod, PaymentStatus } from "./prisma-client";
import { prisma } from "./prisma";
import { createUserNotification } from "./marketplace";
import { SellerServiceError } from "./seller";

export type ProductModerationQueueEntry = {
  createdAt: string;
  defaultImageUrl: string | null;
  description: string;
  id: string;
  moderationNotes: string;
  moderationStatus: ProductModerationStatus;
  name: string;
  seller: {
    displayName: string;
    id: string;
    kycStatus: KycStatus;
    slug: string;
  };
  status: ProductStatus;
  updatedAt: string;
  variantCount: number;
};

export type VideoPostModerationQueueEntry = {
  addToCarts: number;
  caption: string;
  createdAt: string;
  id: string;
  impressions: number;
  moderationNotes: string;
  moderationStatus: VideoPostModerationStatus;
  posterUrl: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
  };
  seller: {
    displayName: string;
    id: string;
    slug: string;
  };
  status: VideoPostStatus;
  updatedAt: string;
};

export type DisputeListEntry = {
  createdAt: string;
  currency: string;
  id: string;
  orderNumber: string;
  reason: DisputeReason;
  reasonLabel: string;
  requestedRefundMinor: number | null;
  sellerName: string;
  status: DisputeStatus;
  statusLabel: string;
  totalMinor: number;
  updatedAt: string;
};

export type DisputeDetail = {
  adminNote: string;
  buyerMessage: string;
  buyerName: string;
  createdAt: string;
  currency: string;
  id: string;
  order: {
    id: string;
    itemSummary: string[];
    orderNumber: string;
    state: string;
    totalMinor: number;
  };
  reason: DisputeReason;
  reasonLabel: string;
  requestedRefundMinor: number | null;
  resolutionNote: string;
  resolvedAt: string | null;
  resolvedRefundMinor: number | null;
  sellerName: string;
  sellerResponse: string;
  status: DisputeStatus;
  statusLabel: string;
  updatedAt: string;
};

export type AdminAuditLogEntry = {
  action: string;
  actorName: string | null;
  afterData: unknown;
  beforeData: unknown;
  createdAt: string;
  entityId: string;
  entityType: string;
  id: string;
};

export type AdminUserDirectoryEntry = {
  createdAt: string;
  email: string | null;
  fullName: string;
  id: string;
  isActive: boolean;
  lastLoginAt: string | null;
  phone: string | null;
  roles: UserRole[];
  sellerProfile: {
    displayName: string;
    id: string;
    kycStatus: KycStatus;
    slug: string;
  } | null;
};

export type AdminOtpBucketEntry = {
  hits: number;
  id: string;
  lastSeenAt: string;
  limit: number;
  phase: "REQUEST" | "VERIFY";
  scope: "IDENTIFIER" | "IP";
  target: string;
  windowStartedAt: string;
};

export type AdminOtpChallengeEntry = {
  attempts: number;
  channel: "EMAIL" | "PHONE";
  consumedAt: string | null;
  expiresAt: string;
  identifier: string;
  lastSentAt: string;
  locked: boolean;
};

export type AdminOtpAbuseOverview = {
  alertLevel: "NORMAL" | "ELEVATED" | "HOT";
  alertMessage: string;
  blockedBuckets: AdminOtpBucketEntry[];
  recentChallenges: AdminOtpChallengeEntry[];
  sentLastDay: number;
  sentLastHour: number;
  topBuckets: AdminOtpBucketEntry[];
  unresolvedChallenges: number;
};

export type AdminPaymentConsoleEntry = {
  amountMinor: number;
  buyerName: string;
  checkoutUrl: string | null;
  createdAt: string;
  currency: string;
  failedAt: string | null;
  id: string;
  lastReconciledAt: string | null;
  latestEvent:
    | {
        eventType: string;
        providerEventId: string | null;
        providerStatus: string;
        receivedAt: string;
        signatureVerified: boolean;
      }
    | null;
  method: PaymentMethod;
  orderId: string;
  orderNumber: string;
  orderState: string;
  payway:
    | {
        lastReconciliationRunAt: string | null;
        lastWebhookReceivedAt: string | null;
        latestProviderStatus: string | null;
        qrExpiresAt: string | null;
        qrGeneratedAt: string | null;
        qrGenerationStatus: string | null;
        qrTraceId: string | null;
        sandboxPlaceholder: boolean;
      }
    | null;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  providerReference: string | null;
  sellerName: string;
  status: PaymentStatus;
  updatedAt: string;
};

export type AdminPaymentDetail = AdminPaymentConsoleEntry & {
  buyerEmail: string | null;
  buyerPhone: string | null;
  events: Array<{
    eventType: string;
    headersHash: string | null;
    id: string;
    idempotencyKey: string | null;
    payloadHash: string;
    processedAt: string | null;
    providerEventId: string | null;
    providerStatus: string;
    receivedAt: string;
    signatureVerified: boolean;
  }>;
  instructions: string | null;
  metadata: unknown;
  order: {
    cancelledAt: string | null;
    createdAt: string;
    currency: string;
    discountMinor: number;
    id: string;
    items: Array<{
      id: string;
      productName: string;
      quantity: number;
      sku: string;
      subtotalMinor: number;
      unitPriceMinor: number;
      variantName: string;
    }>;
    notes: string | null;
    paidAt: string | null;
    paymentMethod: PaymentMethod;
    paymentReference: string | null;
    placedAt: string | null;
    shippingMinor: number;
    state: string;
    subtotalMinor: number;
    taxMinor: number;
    totalMinor: number;
    updatedAt: string;
  };
  qrPayload: string | null;
  sellerSlug: string;
};

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function readJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readJsonText(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();

    return normalized || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function readNestedJsonText(
  payload: Record<string, unknown> | null,
  paths: string[]
): string | null {
  if (!payload) {
    return null;
  }

  for (const path of paths) {
    const segments = path.split(".");
    let current: unknown = payload;

    for (const segment of segments) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        current = null;
        break;
      }

      current = (current as Record<string, unknown>)[segment];
    }

    const resolved = readJsonText(current);

    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function orderedRoles(roles: Iterable<UserRole>): UserRole[] {
  const sortOrder: Record<UserRole, number> = {
    ADMIN: 0,
    SELLER: 1,
    BUYER: 2
  };

  return [...roles].sort((left, right) => sortOrder[left] - sortOrder[right]);
}

function normalizeEmailAddress(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new SellerServiceError("BAD_REQUEST", "Email is required.", 400);
  }

  if (!normalized.includes("@")) {
    throw new SellerServiceError("BAD_REQUEST", "Email must be valid.", 400);
  }

  return normalized;
}

function uniqueRoles(roles: string[]): UserRole[] {
  const validRoles = roles.filter((role): role is UserRole =>
    role === UserRole.ADMIN || role === UserRole.BUYER || role === UserRole.SELLER
  );

  if (validRoles.length !== roles.length) {
    throw new SellerServiceError("BAD_REQUEST", "Roles must be ADMIN, BUYER, or SELLER.", 400);
  }

  const deduped = orderedRoles(new Set(validRoles));

  if (deduped.length === 0) {
    throw new SellerServiceError("BAD_REQUEST", "At least one role is required.", 400);
  }

  return deduped;
}

async function recordAuditLog(
  tx: Prisma.TransactionClient,
  input: {
    action: string;
    actorUserId?: string | null;
    afterData?: Prisma.InputJsonValue | null;
    beforeData?: Prisma.InputJsonValue | null;
    entityId: string;
    entityType: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      afterData: input.afterData ?? Prisma.JsonNull,
      beforeData: input.beforeData ?? Prisma.JsonNull,
      entityId: input.entityId,
      entityType: input.entityType,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null
    }
  });
}

function productSnapshot(product: {
  id: string;
  moderationNotes: string | null;
  moderationStatus: ProductModerationStatus;
  name: string;
  publishedAt: Date | null;
  sellerId: string;
  status: ProductStatus;
}) {
  return {
    id: product.id,
    moderationNotes: product.moderationNotes,
    moderationStatus: product.moderationStatus,
    name: product.name,
    publishedAt: serializeDate(product.publishedAt),
    sellerId: product.sellerId,
    status: product.status
  } satisfies Prisma.InputJsonValue;
}

function userAccessSnapshot(user: {
  email: string | null;
  fullName: string;
  id: string;
  isActive: boolean;
  phone: string | null;
  roleAssignments: Array<{ role: UserRole }>;
  sellerProfile: {
    displayName: string;
    id: string;
    kycStatus: KycStatus;
    slug: string;
  } | null;
}) {
  return {
    email: user.email,
    fullName: user.fullName,
    id: user.id,
    isActive: user.isActive,
    phone: user.phone,
    roles: orderedRoles(user.roleAssignments.map((assignment) => assignment.role)),
    sellerProfile: user.sellerProfile
      ? {
          displayName: user.sellerProfile.displayName,
          id: user.sellerProfile.id,
          kycStatus: user.sellerProfile.kycStatus,
          slug: user.sellerProfile.slug
        }
      : null
  } satisfies Prisma.InputJsonValue;
}

function disputeSnapshot(dispute: {
  adminNote: string | null;
  buyerMessage: string;
  id: string;
  orderId: string;
  reason: DisputeReason;
  requestedRefundMinor: number | null;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  resolvedRefundMinor: number | null;
  sellerResponse: string | null;
  status: DisputeStatus;
}) {
  return {
    adminNote: dispute.adminNote,
    buyerMessage: dispute.buyerMessage,
    id: dispute.id,
    orderId: dispute.orderId,
    reason: dispute.reason,
    requestedRefundMinor: dispute.requestedRefundMinor,
    resolutionNote: dispute.resolutionNote,
    resolvedAt: serializeDate(dispute.resolvedAt),
    resolvedRefundMinor: dispute.resolvedRefundMinor,
    sellerResponse: dispute.sellerResponse,
    status: dispute.status
  } satisfies Prisma.InputJsonValue;
}

const disputeSnapshotSelect = {
  adminNote: true,
  buyerMessage: true,
  id: true,
  orderId: true,
  reason: true,
  requestedRefundMinor: true,
  resolutionNote: true,
  resolvedAt: true,
  resolvedRefundMinor: true,
  sellerResponse: true,
  status: true
} satisfies Prisma.DisputeSelect;

const disputeInclude = {
  order: {
    include: {
      buyer: true,
      items: true,
      seller: true
    }
  }
} satisfies Prisma.DisputeInclude;

type DisputeRecord = Prisma.DisputeGetPayload<{
  include: typeof disputeInclude;
}>;

type DisputeSnapshotRecord = Prisma.DisputeGetPayload<{
  select: typeof disputeSnapshotSelect;
}>;

function mapDisputeDetail(dispute: DisputeRecord): DisputeDetail {
  return {
    adminNote: dispute.adminNote ?? "",
    buyerMessage: dispute.buyerMessage,
    buyerName: dispute.order.buyer.fullName,
    createdAt: dispute.createdAt.toISOString(),
    currency: dispute.order.currency,
    id: dispute.id,
    order: {
      id: dispute.order.id,
      itemSummary: dispute.order.items.map((item) => `${item.productName} × ${item.quantity}`),
      orderNumber: dispute.order.orderNumber,
      state: dispute.order.state,
      totalMinor: dispute.order.totalMinor
    },
    reason: dispute.reason,
    reasonLabel: formatDisputeReason(dispute.reason),
    requestedRefundMinor: dispute.requestedRefundMinor ?? null,
    resolutionNote: dispute.resolutionNote ?? "",
    resolvedAt: serializeDate(dispute.resolvedAt),
    resolvedRefundMinor: dispute.resolvedRefundMinor ?? null,
    sellerName: dispute.order.seller.displayName,
    sellerResponse: dispute.sellerResponse ?? "",
    status: dispute.status,
    statusLabel: formatDisputeStatus(dispute.status),
    updatedAt: dispute.updatedAt.toISOString()
  };
}

export async function listProductModerationQueue(): Promise<ProductModerationQueueEntry[]> {
  const products = await prisma.product.findMany({
    include: {
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { createdAt: "asc" }],
        take: 1
      },
      seller: true,
      variants: {
        select: {
          id: true
        }
      }
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    where: {
      moderationStatus: {
        in: [ProductModerationStatus.PENDING, ProductModerationStatus.REJECTED]
      }
    }
  });

  return products.map((product) => ({
    createdAt: product.createdAt.toISOString(),
    defaultImageUrl: product.images[0]?.url ?? null,
    description: product.description ?? "",
    id: product.id,
    moderationNotes: product.moderationNotes ?? "",
    moderationStatus: product.moderationStatus,
    name: product.name,
    seller: {
      displayName: product.seller.displayName,
      id: product.seller.id,
      kycStatus: product.seller.kycStatus,
      slug: product.seller.slug
    },
    status: product.status,
    updatedAt: product.updatedAt.toISOString(),
    variantCount: product.variants.length
  }));
}

export async function decideProductModeration(input: {
  actorUserId: string;
  decision: "APPROVE" | "REJECT";
  ipAddress?: string | null;
  note?: string;
  productId: string;
  userAgent?: string | null;
}) {
  if (input.decision === "REJECT" && !input.note?.trim()) {
    throw new SellerServiceError("BAD_REQUEST", "A rejection note is required.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: {
        id: input.productId
      }
    });

    if (!product) {
      throw new SellerServiceError("NOT_FOUND", "Product not found.", 404);
    }

    const updatedProduct = await tx.product.update({
      data:
        input.decision === "APPROVE"
          ? {
              moderationNotes: input.note?.trim() || null,
              moderationStatus: ProductModerationStatus.APPROVED,
              publishedAt: product.status === ProductStatus.ACTIVE ? product.publishedAt ?? new Date() : product.publishedAt
            }
          : {
              moderationNotes: input.note?.trim() || null,
              moderationStatus: ProductModerationStatus.REJECTED
            },
      where: {
        id: product.id
      }
    });

    await recordAuditLog(tx, {
      action: input.decision === "APPROVE" ? "PRODUCT_APPROVED" : "PRODUCT_REJECTED",
      actorUserId: input.actorUserId,
      afterData: productSnapshot(updatedProduct),
      beforeData: productSnapshot(product),
      entityId: updatedProduct.id,
      entityType: "Product",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return {
      id: updatedProduct.id,
      moderationStatus: updatedProduct.moderationStatus
    };
  });
}

export async function listVideoPostModerationQueue(): Promise<VideoPostModerationQueueEntry[]> {
  const posts = await prisma.videoPost.findMany({
    include: {
      metrics: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      seller: {
        select: {
          displayName: true,
          id: true,
          slug: true
        }
      }
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    where: {
      moderationStatus: {
        in: [
          VideoPostModerationStatus.PENDING,
          VideoPostModerationStatus.REJECTED,
          VideoPostModerationStatus.HIDDEN
        ]
      }
    }
  });

  return posts.map((post) => ({
    addToCarts: post.metrics.reduce((sum, metric) => sum + metric.addToCarts, 0),
    caption: post.caption,
    createdAt: post.createdAt.toISOString(),
    id: post.id,
    impressions: post.metrics.reduce((sum, metric) => sum + metric.impressions, 0),
    moderationNotes: post.moderationNotes ?? "",
    moderationStatus: post.moderationStatus,
    posterUrl: post.posterKey ?? null,
    product: post.product,
    seller: post.seller,
    status: post.status,
    updatedAt: post.updatedAt.toISOString()
  }));
}

export async function decideVideoPostModeration(input: {
  actorUserId: string;
  decision: "APPROVE" | "REJECT" | "HIDE";
  ipAddress?: string | null;
  note?: string;
  userAgent?: string | null;
  videoPostId: string;
}) {
  if (input.decision !== "APPROVE" && !input.note?.trim()) {
    throw new SellerServiceError("BAD_REQUEST", "A moderation note is required.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const post = await tx.videoPost.findUnique({
      where: {
        id: input.videoPostId
      }
    });

    if (!post) {
      throw new SellerServiceError("NOT_FOUND", "Video post not found.", 404);
    }

    const updated = await tx.videoPost.update({
      data:
        input.decision === "APPROVE"
          ? {
              moderationNotes: input.note?.trim() || null,
              moderationStatus: VideoPostModerationStatus.APPROVED,
              publishedAt: post.status === VideoPostStatus.PUBLISHED ? post.publishedAt ?? new Date() : post.publishedAt
            }
          : input.decision === "HIDE"
            ? {
                moderationNotes: input.note?.trim() || null,
                moderationStatus: VideoPostModerationStatus.HIDDEN
              }
            : {
                moderationNotes: input.note?.trim() || null,
                moderationStatus: VideoPostModerationStatus.REJECTED
              },
      where: {
        id: post.id
      }
    });

    await recordAuditLog(tx, {
      action:
        input.decision === "APPROVE"
          ? "VIDEO_POST_APPROVED"
          : input.decision === "HIDE"
            ? "VIDEO_POST_HIDDEN"
            : "VIDEO_POST_REJECTED",
      actorUserId: input.actorUserId,
      afterData: {
        moderationNotes: updated.moderationNotes,
        moderationStatus: updated.moderationStatus,
        status: updated.status
      },
      beforeData: {
        moderationNotes: post.moderationNotes,
        moderationStatus: post.moderationStatus,
        status: post.status
      },
      entityId: updated.id,
      entityType: "VideoPost",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    const seller = await tx.seller.findUnique({
      select: {
        userId: true
      },
      where: {
        id: post.sellerId
      }
    });

    if (seller?.userId) {
      await createUserNotification({
        actionUrl: `/posts/${updated.id}`,
        body:
          input.decision === "APPROVE"
            ? "Your video post is now approved for the buyer feed."
            : input.decision === "HIDE"
              ? "One of your video posts was hidden by moderation."
              : "One of your video posts was rejected by moderation.",
        kind: "VIDEO_POST_APPROVED",
        metadata: {
          moderationStatus: updated.moderationStatus,
          videoPostId: updated.id
        },
        sellerId: post.sellerId,
        title:
          input.decision === "APPROVE"
            ? "Video post approved"
            : input.decision === "HIDE"
              ? "Video post hidden"
              : "Video post rejected",
        userId: seller.userId
      });
    }

    return {
      id: updated.id,
      moderationStatus: updated.moderationStatus
    };
  });
}

export async function listDisputes(): Promise<DisputeListEntry[]> {
  const disputes = await prisma.dispute.findMany({
    include: {
      order: {
        include: {
          seller: true
        }
      }
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });

  return disputes.map((dispute) => ({
    createdAt: dispute.createdAt.toISOString(),
    currency: dispute.order.currency,
    id: dispute.id,
    orderNumber: dispute.order.orderNumber,
    reason: dispute.reason,
    reasonLabel: formatDisputeReason(dispute.reason),
    requestedRefundMinor: dispute.requestedRefundMinor ?? null,
    sellerName: dispute.order.seller.displayName,
    status: dispute.status,
    statusLabel: formatDisputeStatus(dispute.status),
    totalMinor: dispute.order.totalMinor,
    updatedAt: dispute.updatedAt.toISOString()
  }));
}

export async function getDisputeDetail(disputeId: string): Promise<DisputeDetail> {
  const dispute = await prisma.dispute.findUnique({
    include: disputeInclude,
    where: {
      id: disputeId
    }
  });

  if (!dispute) {
    throw new SellerServiceError("NOT_FOUND", "Dispute not found.", 404);
  }

  return mapDisputeDetail(dispute);
}

function resolveDisputeAction(status: DisputeStatus): string {
  switch (status) {
    case DisputeStatus.UNDER_REVIEW:
      return "DISPUTE_UNDER_REVIEW";
    case DisputeStatus.REFUND_APPROVED:
      return "DISPUTE_REFUND_APPROVED";
    case DisputeStatus.REJECTED:
      return "DISPUTE_REJECTED";
    case DisputeStatus.CLOSED:
      return "DISPUTE_CLOSED";
    default:
      return "DISPUTE_UPDATED";
  }
}

export async function decideDispute(input: {
  actorUserId: string;
  adminNote?: string;
  ipAddress?: string | null;
  disputeId: string;
  resolvedRefundMinor?: number | null;
  resolutionNote?: string;
  status: Exclude<DisputeStatus, "OPEN">;
  userAgent?: string | null;
}) {
  if (
    (input.status === DisputeStatus.REFUND_APPROVED ||
      input.status === DisputeStatus.REJECTED ||
      input.status === DisputeStatus.CLOSED) &&
    !input.resolutionNote?.trim()
  ) {
    throw new SellerServiceError(
      "BAD_REQUEST",
      "A resolution note is required for final dispute decisions.",
      400
    );
  }

  if (
    input.status === DisputeStatus.REFUND_APPROVED &&
    (input.resolvedRefundMinor === null ||
      input.resolvedRefundMinor === undefined ||
      !Number.isInteger(input.resolvedRefundMinor) ||
      input.resolvedRefundMinor < 0)
  ) {
    throw new SellerServiceError(
      "BAD_REQUEST",
      "A refund amount is required when approving a dispute refund.",
      400
    );
  }

  await prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUnique({
      select: disputeSnapshotSelect,
      where: {
        id: input.disputeId
      }
    });

    if (!dispute) {
      throw new SellerServiceError("NOT_FOUND", "Dispute not found.", 404);
    }

    const updatedDispute = await tx.dispute.update({
      data: {
        adminNote: input.adminNote?.trim() || dispute.adminNote,
        resolutionNote:
          input.resolutionNote !== undefined ? input.resolutionNote.trim() || null : dispute.resolutionNote,
        resolvedAt:
          input.status === DisputeStatus.UNDER_REVIEW ? null : dispute.resolvedAt ?? new Date(),
        resolvedRefundMinor:
          input.status === DisputeStatus.REFUND_APPROVED
            ? input.resolvedRefundMinor ?? dispute.resolvedRefundMinor
            : input.status === DisputeStatus.UNDER_REVIEW
              ? null
              : dispute.resolvedRefundMinor,
        status: input.status
      },
      where: {
        id: dispute.id
      }
    });

    await recordAuditLog(tx, {
      action: resolveDisputeAction(input.status),
      actorUserId: input.actorUserId,
      afterData: disputeSnapshot(updatedDispute as DisputeSnapshotRecord),
      beforeData: disputeSnapshot(dispute),
      entityId: updatedDispute.id,
      entityType: "Dispute",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
  });

  const completeDispute = await prisma.dispute.findUnique({
    include: disputeInclude,
    where: {
      id: input.disputeId
    }
  });

  if (!completeDispute) {
    throw new SellerServiceError("NOT_FOUND", "Dispute not found after update.", 404);
  }

  return mapDisputeDetail(completeDispute);
}

export async function listAuditLogs(limit = 80): Promise<AdminAuditLogEntry[]> {
  const entries = await prisma.auditLog.findMany({
    include: {
      actorUser: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });

  return entries.map((entry) => ({
    action: entry.action,
    actorName: entry.actorUser?.fullName ?? null,
    afterData: entry.afterData,
    beforeData: entry.beforeData,
    createdAt: entry.createdAt.toISOString(),
    entityId: entry.entityId,
    entityType: entry.entityType,
    id: entry.id
  }));
}

function readPaywayConsoleDetails(
  metadata: Record<string, unknown> | null
): AdminPaymentConsoleEntry["payway"] {
  if (!metadata) {
    return null;
  }

  const checkoutSession = readJsonRecord(metadata.paywayCheckoutSession);

  return {
    lastReconciliationRunAt: readNestedJsonText(metadata, ["lastReconciliationRunAt"]),
    lastWebhookReceivedAt: readNestedJsonText(metadata, ["latestWebhookReceivedAt"]),
    latestProviderStatus: readNestedJsonText(metadata, [
      "providerStatus",
      "paywayCheckTransaction.payment_status",
      "paywayCheckTransaction.payment_status_code"
    ]),
    qrExpiresAt: readNestedJsonText(checkoutSession, ["expiresAt"]),
    qrGeneratedAt: readNestedJsonText(checkoutSession, ["generatedAt"]),
    qrGenerationStatus: readNestedJsonText(checkoutSession, ["statusMessage"]),
    qrTraceId: readNestedJsonText(checkoutSession, ["traceId"]),
    sandboxPlaceholder: detectPaywaySandboxPlaceholderQr(
      readNestedJsonText(checkoutSession, ["qrString"])
    )
  };
}

export async function listRecentPayments(
  limit = 40
): Promise<AdminPaymentConsoleEntry[]> {
  const payments = await prisma.payment.findMany({
    include: {
      events: {
        orderBy: {
          receivedAt: "desc"
        },
        take: 1
      },
      order: {
        include: {
          buyer: true,
          seller: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit
  });

  return payments.map((payment) => {
    const metadata = readJsonRecord(payment.metadata);
    const latestEvent = payment.events[0] ?? null;

    return {
      amountMinor: payment.amountMinor,
      buyerName: payment.order.buyer.fullName,
      checkoutUrl: payment.checkoutUrl,
      createdAt: payment.createdAt.toISOString(),
      currency: payment.currency,
      failedAt: serializeDate(payment.failedAt),
      id: payment.id,
      lastReconciledAt: serializeDate(payment.lastReconciledAt),
      latestEvent: latestEvent
        ? {
            eventType: latestEvent.eventType,
            providerEventId: latestEvent.providerEventId,
            providerStatus: latestEvent.providerStatus,
            receivedAt: latestEvent.receivedAt.toISOString(),
            signatureVerified: latestEvent.signatureVerified
          }
        : null,
      method: payment.method,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      orderState: payment.order.state,
      payway: payment.provider === PaymentProvider.PAYWAY
        ? readPaywayConsoleDetails(metadata)
        : null,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      providerReference: payment.providerReference,
      sellerName: payment.order.seller.displayName,
      status: payment.status,
      updatedAt: payment.updatedAt.toISOString()
    };
  });
}

export async function getPaymentDetail(
  paymentId: string
): Promise<AdminPaymentDetail | null> {
  const payment = await prisma.payment.findUnique({
    include: {
      events: {
        orderBy: {
          receivedAt: "desc"
        },
        take: 25
      },
      order: {
        include: {
          buyer: true,
          items: {
            orderBy: {
              id: "asc"
            }
          },
          seller: true
        }
      }
    },
    where: {
      id: paymentId
    }
  });

  if (!payment) {
    return null;
  }

  const metadata = readJsonRecord(payment.metadata);
  const latestEvent = payment.events[0] ?? null;

  return {
    amountMinor: payment.amountMinor,
    buyerEmail: payment.order.buyer.email,
    buyerName: payment.order.buyer.fullName,
    buyerPhone: payment.order.buyer.phone,
    checkoutUrl: payment.checkoutUrl,
    createdAt: payment.createdAt.toISOString(),
    currency: payment.currency,
    events: payment.events.map((event) => ({
      eventType: event.eventType,
      headersHash: event.headersHash,
      id: event.id,
      idempotencyKey: event.idempotencyKey,
      payloadHash: event.payloadHash,
      processedAt: serializeDate(event.processedAt),
      providerEventId: event.providerEventId,
      providerStatus: event.providerStatus,
      receivedAt: event.receivedAt.toISOString(),
      signatureVerified: event.signatureVerified
    })),
    failedAt: serializeDate(payment.failedAt),
    id: payment.id,
    instructions: payment.instructions,
    lastReconciledAt: serializeDate(payment.lastReconciledAt),
    latestEvent: latestEvent
      ? {
          eventType: latestEvent.eventType,
          providerEventId: latestEvent.providerEventId,
          providerStatus: latestEvent.providerStatus,
          receivedAt: latestEvent.receivedAt.toISOString(),
          signatureVerified: latestEvent.signatureVerified
        }
      : null,
    metadata: payment.metadata,
    method: payment.method,
    order: {
      cancelledAt: serializeDate(payment.order.cancelledAt),
      createdAt: payment.order.createdAt.toISOString(),
      currency: payment.order.currency,
      discountMinor: payment.order.discountMinor,
      id: payment.order.id,
      items: payment.order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        sku: item.sku,
        subtotalMinor: item.subtotalMinor,
        unitPriceMinor: item.unitPriceMinor,
        variantName: item.variantName
      })),
      notes: payment.order.notes,
      paidAt: serializeDate(payment.order.paidAt),
      paymentMethod: payment.order.paymentMethod,
      paymentReference: payment.order.paymentReference,
      placedAt: serializeDate(payment.order.placedAt),
      shippingMinor: payment.order.shippingMinor,
      state: payment.order.state,
      subtotalMinor: payment.order.subtotalMinor,
      taxMinor: payment.order.taxMinor,
      totalMinor: payment.order.totalMinor,
      updatedAt: payment.order.updatedAt.toISOString()
    },
    orderId: payment.orderId,
    orderNumber: payment.order.orderNumber,
    orderState: payment.order.state,
    payway:
      payment.provider === PaymentProvider.PAYWAY
        ? readPaywayConsoleDetails(metadata)
        : null,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    providerReference: payment.providerReference,
    qrPayload: payment.qrPayload,
    sellerName: payment.order.seller.displayName,
    sellerSlug: payment.order.seller.slug,
    status: payment.status,
    updatedAt: payment.updatedAt.toISOString()
  };
}

export async function listUserDirectory(limit = 120): Promise<AdminUserDirectoryEntry[]> {
  const users = await prisma.user.findMany({
    include: {
      roleAssignments: true,
      sellerProfile: true
    },
    orderBy: [{ lastLoginAt: "desc" }, { createdAt: "desc" }],
    take: limit
  });

  return users.map((user) => ({
    createdAt: user.createdAt.toISOString(),
    email: user.email,
    fullName: user.fullName,
    id: user.id,
    isActive: user.isActive,
    lastLoginAt: serializeDate(user.lastLoginAt),
    phone: user.phone,
    roles: orderedRoles(user.roleAssignments.map((assignment) => assignment.role)),
    sellerProfile: user.sellerProfile
      ? {
          displayName: user.sellerProfile.displayName,
          id: user.sellerProfile.id,
          kycStatus: user.sellerProfile.kycStatus,
          slug: user.sellerProfile.slug
        }
      : null
  }));
}

export async function updateUserAccess(input: {
  actorUserId: string;
  email: string;
  ipAddress?: string | null;
  roles: string[];
  userAgent?: string | null;
  userId: string;
}): Promise<AdminUserDirectoryEntry> {
  const email = normalizeEmailAddress(input.email);
  const roles = uniqueRoles(input.roles);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      include: {
        roleAssignments: true,
        sellerProfile: true
      },
      where: {
        id: input.userId
      }
    });

    if (!user) {
      throw new SellerServiceError("NOT_FOUND", "User not found.", 404);
    }

    if (roles.includes(UserRole.SELLER) && !user.sellerProfile) {
      throw new SellerServiceError(
        "BAD_REQUEST",
        "Create or approve a seller profile before granting seller access.",
        400
      );
    }

    const conflictingUser = await tx.user.findFirst({
      select: {
        id: true
      },
      where: {
        email,
        id: {
          not: user.id
        }
      }
    });

    if (conflictingUser) {
      throw new SellerServiceError(
        "CONFLICT",
        "That email address is already assigned to another user.",
        409
      );
    }

    const currentRoles = new Set(user.roleAssignments.map((assignment) => assignment.role));
    const nextRoles = new Set(roles);

    if (currentRoles.has(UserRole.ADMIN) && !nextRoles.has(UserRole.ADMIN)) {
      const adminCount = await tx.userRoleAssignment.count({
        where: {
          role: UserRole.ADMIN
        }
      });

      if (adminCount <= 1) {
        throw new SellerServiceError(
          "BAD_REQUEST",
          "You cannot remove admin access from the last admin account.",
          400
        );
      }
    }

    const removedRoles = [...currentRoles].filter((role) => !nextRoles.has(role));
    const addedRoles = [...nextRoles].filter((role) => !currentRoles.has(role));

    await tx.user.update({
      data: {
        email
      },
      where: {
        id: user.id
      }
    });

    if (removedRoles.length > 0) {
      await tx.userRoleAssignment.deleteMany({
        where: {
          role: {
            in: removedRoles
          },
          userId: user.id
        }
      });
    }

    if (addedRoles.length > 0) {
      await tx.userRoleAssignment.createMany({
        data: addedRoles.map((role) => ({
          role,
          userId: user.id
        })),
        skipDuplicates: true
      });
    }

    const updatedUser = await tx.user.findUniqueOrThrow({
      include: {
        roleAssignments: true,
        sellerProfile: true
      },
      where: {
        id: user.id
      }
    });

    await recordAuditLog(tx, {
      action: "USER_ACCESS_UPDATED",
      actorUserId: input.actorUserId,
      afterData: userAccessSnapshot(updatedUser),
      beforeData: userAccessSnapshot(user),
      entityId: updatedUser.id,
      entityType: "User",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return {
      createdAt: updatedUser.createdAt.toISOString(),
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      id: updatedUser.id,
      isActive: updatedUser.isActive,
      lastLoginAt: serializeDate(updatedUser.lastLoginAt),
      phone: updatedUser.phone,
      roles: orderedRoles(updatedUser.roleAssignments.map((assignment) => assignment.role)),
      sellerProfile: updatedUser.sellerProfile
        ? {
            displayName: updatedUser.sellerProfile.displayName,
            id: updatedUser.sellerProfile.id,
            kycStatus: updatedUser.sellerProfile.kycStatus,
            slug: updatedUser.sellerProfile.slug
          }
        : null
    };
  });
}

function parseOtpRateLimitKey(key: string): {
  channel: "EMAIL" | "PHONE";
  phase: "REQUEST" | "VERIFY";
  scope: "IDENTIFIER" | "IP";
  target: string;
} | null {
  const parts = key.split(":");

  if (parts[0] !== "otp") {
    return null;
  }

  if (parts[1] !== "request" && parts[1] !== "verify") {
    return null;
  }

  const phase = parts[1] === "request" ? "REQUEST" : "VERIFY";

  if (parts[2] === "ip") {
    const channel = parts[3];
    const target = parts.slice(4).join(":");

    if ((channel !== "EMAIL" && channel !== "PHONE") || target.length === 0) {
      return null;
    }

    return {
      channel,
      phase,
      scope: "IP",
      target
    };
  }

  const channel = parts[2];
  const target = parts.slice(3).join(":");

  if ((channel !== "EMAIL" && channel !== "PHONE") || target.length === 0) {
    return null;
  }

  return {
    channel,
    phase,
    scope: "IDENTIFIER",
    target
  };
}

function resolveOtpBucketLimit(
  config: Pick<AuthConfig, "otpRequestIpLimit" | "otpRequestLimit" | "otpVerifyIpLimit" | "otpVerifyLimit">,
  bucket: { phase: "REQUEST" | "VERIFY"; scope: "IDENTIFIER" | "IP" }
): number {
  if (bucket.phase === "REQUEST") {
    return bucket.scope === "IP" ? config.otpRequestIpLimit : config.otpRequestLimit;
  }

  return bucket.scope === "IP" ? config.otpVerifyIpLimit : config.otpVerifyLimit;
}

export async function getOtpAbuseOverview(
  config: Pick<AuthConfig, "otpRequestIpLimit" | "otpRequestLimit" | "otpVerifyIpLimit" | "otpVerifyLimit">
): Promise<AdminOtpAbuseOverview> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [buckets, recentChallenges, sentLastHour, sentLastDay, unresolvedChallenges] =
    await Promise.all([
      prisma.rateLimitBucket.findMany({
        orderBy: [{ hits: "desc" }, { updatedAt: "desc" }],
        where: {
          key: {
            startsWith: "otp:"
          },
          updatedAt: {
            gte: oneDayAgo
          }
        },
        take: 40
      }),
      prisma.otpChallenge.findMany({
        orderBy: {
          lastSentAt: "desc"
        },
        take: 12
      }),
      prisma.otpChallenge.count({
        where: {
          lastSentAt: {
            gte: oneHourAgo
          }
        }
      }),
      prisma.otpChallenge.count({
        where: {
          lastSentAt: {
            gte: oneDayAgo
          }
        }
      }),
      prisma.otpChallenge.count({
        where: {
          consumedAt: null,
          expiresAt: {
            gt: now
          }
        }
      })
    ]);

  const parsedBuckets = buckets
    .map((bucket) => {
      const parsed = parseOtpRateLimitKey(bucket.key);

      if (!parsed) {
        return null;
      }

      return {
        hits: bucket.hits,
        id: bucket.id,
        lastSeenAt: bucket.updatedAt.toISOString(),
        limit: resolveOtpBucketLimit(config, parsed),
        phase: parsed.phase,
        scope: parsed.scope,
        target: parsed.target,
        windowStartedAt: bucket.windowStartedAt.toISOString()
      } satisfies AdminOtpBucketEntry;
    })
    .filter((bucket): bucket is AdminOtpBucketEntry => Boolean(bucket));
  const blockedBuckets = parsedBuckets.filter((bucket) => bucket.hits >= bucket.limit);
  const elevatedBuckets = parsedBuckets.filter((bucket) => bucket.hits >= Math.max(bucket.limit - 1, 1));

  let alertLevel: AdminOtpAbuseOverview["alertLevel"] = "NORMAL";
  let alertMessage = "No active OTP spikes are currently being tracked.";

  if (blockedBuckets.length >= 3 || blockedBuckets.some((bucket) => bucket.hits >= bucket.limit + 3)) {
    alertLevel = "HOT";
    alertMessage = `${blockedBuckets.length} OTP bucket${blockedBuckets.length === 1 ? " has" : "s have"} hit the live limit in the last 24 hours.`;
  } else if (blockedBuckets.length > 0 || elevatedBuckets.length >= 3) {
    alertLevel = "ELEVATED";
    alertMessage = blockedBuckets.length
      ? `${blockedBuckets.length} OTP bucket${blockedBuckets.length === 1 ? " is" : "s are"} currently rate-limited.`
      : "OTP traffic is elevated and approaching current rate limits.";
  }

  return {
    alertLevel,
    alertMessage,
    blockedBuckets: blockedBuckets.slice(0, 8),
    recentChallenges: recentChallenges.map((challenge) => ({
      attempts: challenge.attempts,
      channel: challenge.channel,
      consumedAt: serializeDate(challenge.consumedAt),
      expiresAt: challenge.expiresAt.toISOString(),
      identifier: challenge.identifier,
      lastSentAt: challenge.lastSentAt.toISOString(),
      locked: challenge.attempts >= challenge.maxAttempts
    })),
    sentLastDay,
    sentLastHour,
    topBuckets: parsedBuckets.slice(0, 8),
    unresolvedChallenges
  };
}

export function formatModerationStatus(status: ProductModerationStatus): string {
  return formatKycStatus(status);
}
