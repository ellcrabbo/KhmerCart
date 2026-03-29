import type { PaymentAdapter } from "../PaymentAdapter";
import type { PaymentsConfig } from "../config";
import {
  buildFallbackProviderEventId,
  createStubCheckoutUrl,
  createStubProviderPaymentId,
  createWebhookUrl,
  findHeader,
  normalizeProviderStatus,
  parseJsonObject,
  pickString,
  verifyHmacSignature
} from "./shared";

export function createPaywayAdapter(config: PaymentsConfig): PaymentAdapter {
  const providerConfig = config.payway;

  return {
    provider: "PAYWAY",
    async createPaymentIntent(input) {
      const reference = `PAYWAY-${input.orderNumber}`;
      const checkoutBaseUrl =
        providerConfig.baseUrl ?? "https://payway-stub.khmercart.local";

      return {
        checkoutUrl: createStubCheckoutUrl(checkoutBaseUrl, input.orderId),
        displayName: "ABA PayWay",
        instructions:
          "Redirect the buyer to the PayWay checkout URL and wait for payment confirmation.",
        metadata: {
          apiKeyPresent: Boolean(providerConfig.apiKey),
          integrationMode: config.paymentsEnv,
          merchantId: providerConfig.merchantId ?? null,
          stub: true,
          // TODO(provider-mapping): Replace this stub URL and fields with the official PayWay payment-session payload.
          webhookUrl: createWebhookUrl(input.webhookBaseUrl, "/api/webhooks/payway")
        },
        provider: "PAYWAY",
        providerPaymentId: createStubProviderPaymentId("PAYWAY", input.orderId),
        qrPayload: null,
        reference,
        status: "PENDING"
      };
    },
    parseEvent(rawBody) {
      const payload = parseJsonObject(rawBody);

      return {
        eventType:
          pickString(payload, ["eventType", "type", "action"]) ?? "PAYMENT_UPDATE",
        idempotencyKey:
          pickString(payload, ["idempotencyKey", "requestId", "merchantRef"]) ?? null,
        metadata: payload,
        orderRef:
          pickString(payload, ["orderRef", "orderId", "merchantRef", "reference"]) ?? null,
        providerEventId:
          pickString(payload, ["eventId", "id", "paymentId", "transactionId"]) ??
          buildFallbackProviderEventId("PAYWAY", rawBody),
        providerPaymentId:
          pickString(payload, ["paymentId", "transactionId", "txnId"]) ?? null,
        status: normalizeProviderStatus(
          pickString(payload, ["status", "paymentStatus", "transactionStatus", "result"])
        )
      };
    },
    async reconcilePayment(input) {
      return {
        metadata: {
          ...(input.metadata ?? {}),
          // TODO(provider-mapping): Replace this stub with a real PayWay status lookup.
          reconciliationMode: "stub"
        },
        providerPaymentId: input.providerPaymentId,
        status: "PENDING"
      };
    },
    async verifyWebhook(rawBody, headers) {
      const secret = providerConfig.webhookSecret?.trim();

      if (!secret) {
        return true;
      }

      const signature = findHeader(headers, ["x-payway-signature", "x-signature"]);

      return signature ? verifyHmacSignature(rawBody, signature, secret) : false;
    }
  };
}
