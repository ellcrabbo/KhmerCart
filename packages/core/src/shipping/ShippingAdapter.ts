export const SHIPPING_CARRIER_VALUES = [
  "JNT",
  "GRABEXPRESS",
  "CAMBODIA_POST",
  "OTHER"
] as const;

export type ShippingCarrier = (typeof SHIPPING_CARRIER_VALUES)[number];

export const SHIPMENT_STATUS_VALUES = [
  "PENDING",
  "LABEL_CREATED",
  "HANDED_TO_CARRIER",
  "IN_TRANSIT",
  "DELIVERED",
  "RETURNED",
  "FAILED"
] as const;

export type ShipmentLifecycleStatus = (typeof SHIPMENT_STATUS_VALUES)[number];

export type CreateShipmentInput = {
  carrier: Exclude<ShippingCarrier, "OTHER">;
  orderId: string;
  trackingNumber: string;
};

export type ShippingAdapterShipment = {
  carrier: Exclude<ShippingCarrier, "OTHER">;
  metadata: Record<string, unknown>;
  providerShipmentId: string | null;
  trackingNumber: string;
  trackingUrl: string | null;
};

export type ShippingTrackingEvent = {
  message: string;
  metadata?: Record<string, unknown> | null;
  occurredAt?: string | null;
  providerEventId?: string | null;
  status: ShipmentLifecycleStatus;
};

export interface ShippingAdapter {
  carrier: Exclude<ShippingCarrier, "OTHER">;
  createShipment(input: CreateShipmentInput): Promise<ShippingAdapterShipment>;
  fetchTrackingEvents(input: {
    providerShipmentId?: string | null;
    trackingNumber: string;
  }): Promise<ShippingTrackingEvent[]>;
}
