import type { ShippingAdapter } from "../ShippingAdapter";
import type { ShippingConfig } from "../config";
import {
  createStubProviderShipmentId,
  createStubShipment,
  createStubTrackingEvents,
  createStubTrackingUrl
} from "./shared";

export function createCambodiaPostAdapter(config: ShippingConfig): ShippingAdapter {
  return {
    carrier: "CAMBODIA_POST",
    async createShipment(input) {
      return createStubShipment({
        carrier: "CAMBODIA_POST",
        credentialsPresent: Boolean(config.cambodiaPostApiKey),
        metadata: {
          // TODO(provider-mapping): Replace with real Cambodia Post tracking and label field mappings.
          apiKeyPresent: Boolean(config.cambodiaPostApiKey)
        },
        providerLabel: "Cambodia Post",
        providerShipmentId: createStubProviderShipmentId("CAMBODIA_POST", input.orderId),
        trackingNumber: input.trackingNumber,
        trackingUrl: createStubTrackingUrl({
          carrier: "CAMBODIA_POST",
          trackingNumber: input.trackingNumber
        })
      });
    },
    async fetchTrackingEvents(input) {
      return createStubTrackingEvents("CAMBODIA_POST", input.trackingNumber);
    }
  };
}
