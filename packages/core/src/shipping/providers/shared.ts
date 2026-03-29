import type {
  ShipmentLifecycleStatus,
  ShippingAdapterShipment,
  ShippingCarrier
} from "../ShippingAdapter";

type StubTrackingUrlInput = {
  carrier: ShippingCarrier;
  trackingNumber: string;
};

export function createStubProviderShipmentId(
  carrier: Exclude<ShippingCarrier, "OTHER">,
  orderId: string
): string {
  return `${carrier.toLowerCase()}_${orderId}`;
}

export function createStubTrackingUrl(input: StubTrackingUrlInput): string {
  return `https://tracking-stub.khmercart.local/${input.carrier.toLowerCase()}/${encodeURIComponent(input.trackingNumber)}`;
}

export function createStubShipment(
  input: ShippingAdapterShipment & {
    credentialsPresent: boolean;
    providerLabel: string;
  }
): ShippingAdapterShipment {
  return {
    carrier: input.carrier,
    metadata: {
      ...input.metadata,
      credentialsPresent: input.credentialsPresent,
      providerLabel: input.providerLabel,
      stub: true
    },
    providerShipmentId: input.providerShipmentId,
    trackingNumber: input.trackingNumber,
    trackingUrl: input.trackingUrl
  };
}

export function createStubTrackingEvents(
  carrier: Exclude<ShippingCarrier, "OTHER">,
  trackingNumber: string
): Array<{
  message: string;
  status: ShipmentLifecycleStatus;
}> {
  return [
    {
      message: `${carrier} tracking stub for ${trackingNumber}.`,
      status: "LABEL_CREATED"
    }
  ];
}
