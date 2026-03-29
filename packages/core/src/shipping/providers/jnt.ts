import type { ShippingAdapter } from "../ShippingAdapter";
import type { ShippingConfig } from "../config";
import {
  createStubProviderShipmentId,
  createStubShipment,
  createStubTrackingEvents,
  createStubTrackingUrl
} from "./shared";

export function createJntAdapter(config: ShippingConfig): ShippingAdapter {
  return {
    carrier: "JNT",
    async createShipment(input) {
      return createStubShipment({
        carrier: "JNT",
        credentialsPresent: Boolean(config.jntApiKey),
        metadata: {
          // TODO(provider-mapping): Replace with real J&T create-shipment payload and field mappings.
          apiKeyPresent: Boolean(config.jntApiKey)
        },
        providerLabel: "J&T Express",
        providerShipmentId: createStubProviderShipmentId("JNT", input.orderId),
        trackingNumber: input.trackingNumber,
        trackingUrl: createStubTrackingUrl({
          carrier: "JNT",
          trackingNumber: input.trackingNumber
        })
      });
    },
    async fetchTrackingEvents(input) {
      return createStubTrackingEvents("JNT", input.trackingNumber);
    }
  };
}
