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

export function readShippingConfig(
  env: NodeJS.ProcessEnv = process.env
): ShippingConfig {
  const configuredCarriers = env.CARRIERS?.trim();

  const carriers = configuredCarriers
    ? configuredCarriers
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter((value): value is ShippingCarrier => isShippingCarrier(value))
    : [...(["JNT", "GRABEXPRESS", "CAMBODIA_POST", "OTHER"] as const)];

  return {
    cambodiaPostApiKey: normalizeOptionalValue(env.CAMBODIA_POST_API_KEY),
    carriers: carriers.length > 0 ? Array.from(new Set(carriers)) : ["OTHER"],
    grab: {
      clientId: normalizeOptionalValue(env.GRAB_CLIENT_ID),
      clientSecret: normalizeOptionalValue(env.GRAB_CLIENT_SECRET)
    },
    jntApiKey: normalizeOptionalValue(env.JNT_API_KEY)
  };
}
