import { formatDisputeReason, formatDisputeStatus, formatKycStatus } from "@khmercart/core";
import {
  DisputeStatus,
  Prisma,
  ProductModerationStatus,
  ProductStatus
} from "./prisma-client";
import type { DisputeReason, KycStatus } from "./prisma-client";
import { prisma } from "./prisma";
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

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
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

export function formatModerationStatus(status: ProductModerationStatus): string {
  return formatKycStatus(status);
}
