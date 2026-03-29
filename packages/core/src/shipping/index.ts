import type { ShippingAdapter } from "./ShippingAdapter";
import { createCambodiaPostAdapter } from "./providers/cambodia-post";
import { createGrabExpressAdapter } from "./providers/grabexpress";
import { createJntAdapter } from "./providers/jnt";
import { readShippingConfig, type ShippingConfig } from "./config";
import type { ShippingCarrier } from "./ShippingAdapter";

export * from "./config";
export * from "./ShippingAdapter";

export function createShippingAdapter(
  carrier: Exclude<ShippingCarrier, "OTHER">,
  config: ShippingConfig = readShippingConfig(process.env)
): ShippingAdapter {
  if (carrier === "JNT") {
    return createJntAdapter(config);
  }

  if (carrier === "GRABEXPRESS") {
    return createGrabExpressAdapter(config);
  }

  return createCambodiaPostAdapter(config);
}
