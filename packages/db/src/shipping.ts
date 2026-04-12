import {
  createShippingAdapter,
  isShippingCarrier,
  readShippingConfig,
  type OrderLifecycleState,
  type ShipmentLifecycleStatus,
  type ShippingCarrier
} from "@khmercart/core";
import { listBuyerOrderDisputes, type BuyerOrderDisputeEntry } from "./marketplace";
import {
  OrderState,
  Prisma,
  ShipmentEventSource,
  type Currency
} from "./prisma-client";
import type { ShipmentStatus } from "./prisma-client";
import { transitionOrderInTransaction } from "./orders";
import { prisma } from "./prisma";

const sellerShipmentOrderInclude = {
  buyer: {
    select: {
      email: true,
      fullName: true,
      id: true,
      phone: true
    }
  },
  shipment: {
    include: {
      events: {
        include: {
          actorUser: {
            select: {
              fullName: true
            }
          }
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }]
      }
    }
  }
} satisfies Prisma.OrderInclude;

const buyerOrderTrackingInclude = {
  seller: {
    select: {
      displayName: true,
      slug: true,
      supportEmail: true,
      supportPhone: true
    }
  },
  shipment: {
    include: {
      events: {
        include: {
          actorUser: {
            select: {
              fullName: true
            }
          }
        },
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }]
      }
    }
  }
} satisfies Prisma.OrderInclude;

type SellerShipmentOrderRecord = Prisma.OrderGetPayload<{
  include: typeof sellerShipmentOrderInclude;
}>;

type BuyerShipmentOrderRecord = Prisma.OrderGetPayload<{
  include: typeof buyerOrderTrackingInclude;
}>;

type SellerShipmentRecord = NonNullable<SellerShipmentOrderRecord["shipment"]>;
type BuyerShipmentRecord = NonNullable<BuyerShipmentOrderRecord["shipment"]>;
type ShipmentEventRecord = SellerShipmentRecord["events"][number];

export class ShippingServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.name = "ShippingServiceError";
    this.status = status;
  }
}

export type ShipmentTimelineEvent = {
  actorName: string | null;
  id: string;
  message: string;
  occurredAt: string;
  source: ShipmentEventSource;
  status: ShipmentStatus;
};

export type ShipmentSummary = {
  carrier: string | null;
  id: string;
  providerShipmentId: string | null;
  shippedAt: string | null;
  status: ShipmentStatus;
  trackingNumber: string | null;
  trackingUrl: string | null;
  updates: ShipmentTimelineEvent[];
};

export type SellerShippingQueueEntry = {
  buyer: {
    email: string | null;
    fullName: string;
    id: string;
    phone: string | null;
  };
  canMarkDelivered: boolean;
  canMarkHandedToCarrier: boolean;
  canMarkInTransit: boolean;
  orderId: string;
  orderNumber: string;
  placedAt: string | null;
  shipment: ShipmentSummary | null;
  state: OrderLifecycleState;
  totalMinor: number;
  currency: Currency;
};

export type SellerShippingQueueData = {
  carriers: ShippingCarrier[];
  orders: SellerShippingQueueEntry[];
};

export type BuyerOrderTrackingData = {
  canRequestRefund: boolean;
  currency: Currency;
  disputes: BuyerOrderDisputeEntry[];
  orderId: string;
  orderNumber: string;
  placedAt: string | null;
  seller: {
    contact: string;
    displayName: string;
    slug: string;
  };
  shipment: ShipmentSummary | null;
  state: OrderLifecycleState;
  totalMinor: number;
};

export type SaveSellerShipmentInput = {
  carrier?: string | null;
  message?: string | null;
  orderId: string;
  status?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  userId: string;
};

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function mapShipmentTimelineEvent(event: ShipmentEventRecord): ShipmentTimelineEvent {
  return {
    actorName: event.actorUser?.fullName ?? null,
    id: event.id,
    message: event.message ?? `${event.status.replaceAll("_", " ")} update recorded.`,
    occurredAt: event.occurredAt.toISOString(),
    source: event.source,
    status: event.status
  };
}

function mapShipmentSummary(
  shipment: SellerShipmentRecord | BuyerShipmentRecord | null
): ShipmentSummary | null {
  if (!shipment) {
    return null;
  }

  return {
    carrier: shipment.carrier ?? null,
    id: shipment.id,
    providerShipmentId: shipment.providerShipmentId ?? null,
    shippedAt: serializeDate(shipment.shippedAt),
    status: shipment.status,
    trackingNumber: shipment.trackingNumber ?? null,
    trackingUrl: shipment.trackingUrl ?? null,
    updates: shipment.events.map((event) => mapShipmentTimelineEvent(event))
  };
}

function mapSellerShippingQueueEntry(order: SellerShipmentOrderRecord): SellerShippingQueueEntry {
  return {
    buyer: {
      email: order.buyer.email,
      fullName: order.buyer.fullName,
      id: order.buyer.id,
      phone: order.buyer.phone
    },
    canMarkDelivered:
      order.state === "HANDED_TO_CARRIER" || order.state === "IN_TRANSIT",
    canMarkHandedToCarrier:
      order.state === "SELLER_CONFIRMED" || order.state === "PACKED",
    canMarkInTransit: order.state === "HANDED_TO_CARRIER",
    currency: order.currency,
    orderId: order.id,
    orderNumber: order.orderNumber,
    placedAt: serializeDate(order.placedAt),
    shipment: mapShipmentSummary(order.shipment),
    state: order.state,
    totalMinor: order.totalMinor
  };
}

function resolveSellerContact(order: BuyerShipmentOrderRecord): string {
  return (
    order.seller.supportEmail ??
    order.seller.supportPhone ??
    order.seller.displayName
  );
}

async function mapBuyerOrderTracking(
  order: BuyerShipmentOrderRecord
): Promise<BuyerOrderTrackingData> {
  const disputes = await listBuyerOrderDisputes({
    orderId: order.id,
    userId: order.buyerId,
  });

  return {
    canRequestRefund:
      (order.state === "DELIVERED" || order.state === "COMPLETED") &&
      !disputes.some(
        (dispute) => dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW"
      ),
    currency: order.currency,
    disputes,
    orderId: order.id,
    orderNumber: order.orderNumber,
    placedAt: serializeDate(order.placedAt),
    seller: {
      contact: resolveSellerContact(order),
      displayName: order.seller.displayName,
      slug: order.seller.slug
    },
    shipment: mapShipmentSummary(order.shipment),
    state: order.state,
    totalMinor: order.totalMinor
  };
}

function parseCarrier(value: string | null | undefined): ShippingCarrier | null {
  const normalized = value?.trim().toUpperCase();

  return normalized && isShippingCarrier(normalized) ? normalized : null;
}

function isShipmentStatus(value: string | null | undefined): value is ShipmentLifecycleStatus {
  return (
    value === "PENDING" ||
    value === "LABEL_CREATED" ||
    value === "HANDED_TO_CARRIER" ||
    value === "IN_TRANSIT" ||
    value === "DELIVERED" ||
    value === "RETURNED" ||
    value === "FAILED"
  );
}

function parseShipmentStatus(value: string | null | undefined): ShipmentStatus | null {
  const normalized = value?.trim().toUpperCase();

  return normalized && isShipmentStatus(normalized) ? normalized : null;
}

function resolveStatusTransitionTarget(
  status: ShipmentStatus | null
): OrderLifecycleState | null {
  if (status === "HANDED_TO_CARRIER") {
    return "HANDED_TO_CARRIER";
  }

  if (status === "IN_TRANSIT") {
    return "IN_TRANSIT";
  }

  if (status === "DELIVERED") {
    return "DELIVERED";
  }

  return null;
}

function resolveDerivedShipmentStatus(input: {
  nextTrackingNumber: string | null;
  orderState: OrderLifecycleState;
  requestedStatus: ShipmentStatus | null;
}): ShipmentStatus | null {
  if (input.requestedStatus) {
    return input.requestedStatus;
  }

  if (
    input.nextTrackingNumber &&
    (input.orderState === "SELLER_CONFIRMED" || input.orderState === "PACKED")
  ) {
    return "HANDED_TO_CARRIER";
  }

  if (input.nextTrackingNumber) {
    return "LABEL_CREATED";
  }

  return null;
}

async function requireSellerRecord(
  tx: Prisma.TransactionClient,
  userId: string
) {
  const seller = await tx.seller.findUnique({
    where: {
      userId
    }
  });

  if (!seller) {
    throw new ShippingServiceError("FORBIDDEN", "Seller account is required.", 403);
  }

  return seller;
}

function buildShipmentUpdateMessage(input: {
  carrier: string | null;
  status: ShipmentStatus;
  trackingNumber: string | null;
  customMessage: string | null;
}) {
  if (input.customMessage?.trim()) {
    return input.customMessage.trim();
  }

  const trackingFragment = input.trackingNumber ? ` (${input.trackingNumber})` : "";
  const carrierFragment = input.carrier ? `${input.carrier} ` : "";

  return `${carrierFragment}${input.status.replaceAll("_", " ")}${trackingFragment}`.trim();
}

function mergeShipmentMetadata(
  currentMetadata: Prisma.JsonValue | null,
  nextMetadata: Record<string, unknown> | null
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (!nextMetadata) {
    return currentMetadata && typeof currentMetadata === "object" && !Array.isArray(currentMetadata)
      ? (currentMetadata as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  }

  return {
    ...(currentMetadata &&
    typeof currentMetadata === "object" &&
    !Array.isArray(currentMetadata)
      ? (currentMetadata as Record<string, unknown>)
      : {}),
    ...nextMetadata
  } as Prisma.InputJsonValue;
}

async function readSellerShipmentOrder(
  tx: Prisma.TransactionClient,
  sellerId: string,
  orderId: string
): Promise<SellerShipmentOrderRecord> {
  const order = await tx.order.findFirst({
    include: sellerShipmentOrderInclude,
    where: {
      id: orderId,
      sellerId
    }
  });

  if (!order) {
    throw new ShippingServiceError("NOT_FOUND", "Order not found.", 404);
  }

  return order;
}

export async function getSellerShippingQueueData(
  userId: string
): Promise<SellerShippingQueueData> {
  const seller = await prisma.seller.findUnique({
    where: {
      userId
    }
  });

  if (!seller) {
    throw new ShippingServiceError("FORBIDDEN", "Seller account is required.", 403);
  }

  const orders = await prisma.order.findMany({
    include: sellerShipmentOrderInclude,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    where: {
      sellerId: seller.id,
      state: {
        in: [
          OrderState.SELLER_CONFIRMED,
          OrderState.PACKED,
          OrderState.HANDED_TO_CARRIER,
          OrderState.IN_TRANSIT,
          OrderState.DELIVERED
        ]
      }
    }
  });

  return {
    carriers: readShippingConfig(process.env).carriers,
    orders: orders.map((order) => mapSellerShippingQueueEntry(order))
  };
}

export async function saveSellerShipment(
  input: SaveSellerShipmentInput
): Promise<SellerShippingQueueEntry> {
  return prisma.$transaction(async (tx) => {
    const seller = await requireSellerRecord(tx, input.userId);
    const order = await readSellerShipmentOrder(tx, seller.id, input.orderId);

    if (
      order.state === "CANCELLED" ||
      order.state === "REFUNDED" ||
      order.state === "COMPLETED"
    ) {
      throw new ShippingServiceError(
        "ORDER_NOT_SHIPPABLE",
        "This order can no longer be updated for shipping.",
        409
      );
    }

    const nextCarrier = parseCarrier(input.carrier) ?? parseCarrier(order.shipment?.carrier);
    const nextTrackingNumber =
      input.trackingNumber?.trim() ||
      order.shipment?.trackingNumber?.trim() ||
      null;

    if (!order.shipment && (!nextCarrier || !nextTrackingNumber)) {
      throw new ShippingServiceError(
        "TRACKING_REQUIRED",
        "Carrier and tracking number are required to create a shipment.",
        400
      );
    }

    const requestedStatus = parseShipmentStatus(input.status);
    const nextStatus = resolveDerivedShipmentStatus({
      nextTrackingNumber,
      orderState: order.state,
      requestedStatus
    });
    const transitionTarget = resolveStatusTransitionTarget(nextStatus);

    let providerShipmentId = order.shipment?.providerShipmentId ?? null;
    let resolvedTrackingUrl =
      input.trackingUrl?.trim() || order.shipment?.trackingUrl?.trim() || null;
    let providerMetadata: Record<string, unknown> | null = null;

    if (nextCarrier && nextCarrier !== "OTHER" && nextTrackingNumber) {
      const adapter = createShippingAdapter(nextCarrier);
      const providerShipment = await adapter.createShipment({
        carrier: nextCarrier,
        orderId: order.id,
        trackingNumber: nextTrackingNumber
      });

      providerShipmentId = providerShipment.providerShipmentId;
      resolvedTrackingUrl = resolvedTrackingUrl ?? providerShipment.trackingUrl;
      providerMetadata = providerShipment.metadata;
    }

    const shipment = await tx.shipment.upsert({
      create: {
        carrier: nextCarrier,
        deliveredAt: nextStatus === "DELIVERED" ? new Date() : null,
        metadata: mergeShipmentMetadata(null, providerMetadata),
        orderId: order.id,
        providerShipmentId,
        sellerId: seller.id,
        shippedAt:
          nextStatus === "HANDED_TO_CARRIER" || nextStatus === "IN_TRANSIT"
            ? new Date()
            : null,
        status: nextStatus ?? "PENDING",
        trackingNumber: nextTrackingNumber,
        trackingUrl: resolvedTrackingUrl
      },
      update: {
        carrier: nextCarrier ?? order.shipment?.carrier ?? null,
        deliveredAt:
          nextStatus === "DELIVERED"
            ? new Date()
            : order.shipment?.deliveredAt ?? undefined,
        metadata: mergeShipmentMetadata(order.shipment?.metadata ?? null, providerMetadata),
        providerShipmentId,
        shippedAt:
          nextStatus === "HANDED_TO_CARRIER" || nextStatus === "IN_TRANSIT"
            ? order.shipment?.shippedAt ?? new Date()
            : order.shipment?.shippedAt ?? undefined,
        status: nextStatus ?? order.shipment?.status ?? "PENDING",
        trackingNumber: nextTrackingNumber,
        trackingUrl: resolvedTrackingUrl
      },
      where: {
        orderId: order.id
      }
    });

    if (nextStatus) {
      await tx.shipmentEvent.create({
        data: {
          actorUserId: input.userId,
          message: buildShipmentUpdateMessage({
            carrier: nextCarrier,
            customMessage: input.message ?? null,
            status: nextStatus,
            trackingNumber: nextTrackingNumber
          }),
          metadata: {
            carrier: nextCarrier,
            trackingNumber: nextTrackingNumber,
            trackingUrl: resolvedTrackingUrl
          },
          shipmentId: shipment.id,
          source: ShipmentEventSource.MANUAL,
          status: nextStatus
        }
      });
    }

    if (transitionTarget && order.state !== transitionTarget) {
      await transitionOrderInTransaction(
        tx,
        order.id,
        transitionTarget,
        {
          label: "Seller shipping desk",
          role: "SELLER",
          type: "USER",
          userId: input.userId
        },
        {
          message: `Shipment updated to ${transitionTarget.replaceAll("_", " ")}.`,
          metadata: {
            carrier: nextCarrier,
            shipmentId: shipment.id,
            shipmentStatus: nextStatus,
            trackingNumber: nextTrackingNumber
          }
        }
      );
    }

    const updatedOrder = await readSellerShipmentOrder(tx, seller.id, order.id);

    return mapSellerShippingQueueEntry(updatedOrder);
  });
}

export async function getBuyerOrderTrackingData(
  userId: string,
  orderId: string
): Promise<BuyerOrderTrackingData> {
  const order = await prisma.order.findFirst({
    include: buyerOrderTrackingInclude,
    where: {
      buyerId: userId,
      id: orderId
    }
  });

  if (!order) {
    throw new ShippingServiceError("NOT_FOUND", "Order not found.", 404);
  }

  return mapBuyerOrderTracking(order);
}
