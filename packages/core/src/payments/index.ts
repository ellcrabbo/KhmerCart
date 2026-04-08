import type { ExternalPaymentProvider, PaymentAdapter } from "./PaymentAdapter";
import { createBakongAdapter } from "./providers/bakong";
import {
  buildPaywayQrRequest,
  createPaywayAdapter,
  detectPaywaySandboxPlaceholderQr,
  createPaywayWebhookSignature,
  isPaywayConfigured,
  resolvePaywayGenerateQrUrl,
  resolvePaywayPurchaseUrl,
  verifyPaywayWebhookSignature
} from "./providers/payway";
import { createToanchetAdapter } from "./providers/toanchet";
import { createWingAdapter } from "./providers/wing";
import { readPaymentsConfig } from "./config";

export * from "./config";
export * from "./PaymentAdapter";
export { createHmacSignature } from "./providers/shared";
export {
  buildPaywayQrRequest,
  detectPaywaySandboxPlaceholderQr,
  createPaywayWebhookSignature,
  isPaywayConfigured,
  resolvePaywayGenerateQrUrl,
  resolvePaywayPurchaseUrl,
  verifyPaywayWebhookSignature
};

export function createPaymentAdapter(
  provider: ExternalPaymentProvider,
  env: NodeJS.ProcessEnv = process.env
): PaymentAdapter {
  const config = readPaymentsConfig(env);

  if (provider === "BAKONG") {
    return createBakongAdapter(config);
  }

  if (provider === "PAYWAY") {
    return createPaywayAdapter(config);
  }

  if (provider === "TOANCHET") {
    return createToanchetAdapter(config);
  }

  return createWingAdapter(config);
}
