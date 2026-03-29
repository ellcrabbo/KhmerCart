import type { ShippingAdapter } from "../ShippingAdapter";
import type { ShippingConfig } from "../config";
import {
  createStubProviderShipmentId,
  createStubShipment,
  createStubTrackingEvents,
  createStubTrackingUrl
} from "./shared";

export function createGrabExpressAdapter(config: ShippingConfig): ShippingAdapter {
  return {
    carrier: "GRABEXPRESS",
    async createShipment(input) {
      return createStubShipment({
        carrier: "GRABEXPRESS",
        credentialsPresent: Boolean(config.grab.clientId && config.grab.clientSecret),
        metadata: {
          // TODO(provider-mapping): Replace with real GrabExpress create-delivery field mappings.
          clientIdPresent: Boolean(config.grab.clientId),
          clientSecretPresent: Boolean(config.grab.clientSecret)
        },
        providerLabel: "GrabExpress",
        providerShipmentId: createStubProviderShipmentId("GRABEXPRESS", input.orderId),
        trackingNumber: input.trackingNumber,
        trackingUrl: createStubTrackingUrl({
          carrier: "GRABEXPRESS",
          trackingNumber: input.trackingNumber
        })
      });
    },
    async fetchTrackingEvents(input) {
      return createStubTrackingEvents("GRABEXPRESS", input.trackingNumber);
    }
  };
}
