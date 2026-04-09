import type { ShippingCarrier } from "./ShippingAdapter";

type GrabConfig = {
  clientId?: string;
  clientSecret?: string;
};

export type ShippingConfig = {
  cambodiaPostApiKey?: string;
  carriers: ShippingCarrier[];
  grab: GrabConfig;
  jntApiKey?: string;
};

export const SHIPPING_CARRIER_LABELS: Record<ShippingCarrier, string> = {
  CAMBODIA_POST: "Cambodia Post",
  GRABEXPRESS: "GrabExpress",
  JNT: "J&T Express",
  OTHER: "Manual delivery"
};

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

export function isShippingCarrier(value: string | null | undefined): value is ShippingCarrier {
  return (
    value === "JNT" ||
    value === "GRABEXPRESS" ||
    value === "CAMBODIA_POST" ||
    value === "OTHER"
  );
}

export function formatShippingCarrierLabel(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const uppercased = normalized.toUpperCase();

  return isShippingCarrier(uppercased)
    ? SHIPPING_CARRIER_LABELS[uppercased]
    : normalized;
}

export function readShippingConfig(
  env: NodeJS.ProcessEnv = process.env
): ShippingConfig {
  const configuredCarriers = env.CARRIERS?.trim();

  const carriers = configuredCarriers
    ? configuredCarriers
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter((value): value is ShippingCarrier => isShippingCarrier(value))
    : ["OTHER"];

  return {
    cambodiaPostApiKey: normalizeOptionalValue(env.CAMBODIA_POST_API_KEY),
    carriers:
      carriers.length > 0 ? (Array.from(new Set(carriers)) as ShippingCarrier[]) : ["OTHER"],
    grab: {
      clientId: normalizeOptionalValue(env.GRAB_CLIENT_ID),
      clientSecret: normalizeOptionalValue(env.GRAB_CLIENT_SECRET)
    },
    jntApiKey: normalizeOptionalValue(env.JNT_API_KEY)
  };
}
