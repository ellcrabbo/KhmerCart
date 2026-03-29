import type { PaymentAdapter } from "../PaymentAdapter";
import type { PaymentsConfig } from "../config";
import {
  buildFallbackProviderEventId,
  createStubProviderPaymentId,
  createWebhookUrl,
  findHeader,
  normalizeProviderStatus,
  parseJsonObject,
  pickString,
  verifyHmacSignature
} from "./shared";

export function createBakongAdapter(config: PaymentsConfig): PaymentAdapter {
  const providerConfig = config.bakong;

  return {
    provider: "BAKONG",
    async createPaymentIntent(input) {
      const reference = `KHQR-${input.orderNumber}`;
      const qrPayload =
        `bakong://khqr/stub?reference=${encodeURIComponent(reference)}` +
        `&amount=${input.amountMinor}&currency=${input.currency}`;

      return {
        checkoutUrl: null,
        displayName: "Bakong KHQR",
        instructions:
          "Display the KHQR payload to the buyer and wait for payment confirmation.",
        metadata: {
          apiBaseUrl: providerConfig.apiBaseUrl ?? null,
          clientId: providerConfig.clientId ?? null,
          integrationMode: config.paymentsEnv,
          stub: true,
          // TODO(provider-mapping): Replace this stub payload with the official Bakong KHQR request/response fields.
          webhookUrl: createWebhookUrl(input.webhookBaseUrl, "/api/webhooks/bakong")
        },
        provider: "BAKONG",
        providerPaymentId: createStubProviderPaymentId("BAKONG", input.orderId),
        qrPayload,
        reference,
        status: "PENDING"
      };
    },
    parseEvent(rawBody) {
      const payload = parseJsonObject(rawBody);

      return {
        eventType:
          pickString(payload, ["eventType", "type", "action", "transaction.type"]) ??
          "PAYMENT_UPDATE",
        idempotencyKey:
          pickString(payload, ["idempotencyKey", "requestId", "traceId"]) ?? null,
        metadata: payload,
        orderRef:
          pickString(payload, [
            "orderRef",
            "orderId",
            "merchantRef",
            "reference",
            "transaction.orderId"
          ]) ?? null,
        providerEventId:
          pickString(payload, [
            "eventId",
            "id",
            "transactionId",
            "txId",
            "transaction.id"
          ]) ?? buildFallbackProviderEventId("BAKONG", rawBody),
        providerPaymentId:
          pickString(payload, ["paymentId", "transactionId", "txId", "transaction.id"]) ??
          null,
        status: normalizeProviderStatus(
          pickString(payload, ["status", "paymentStatus", "transaction.status", "result"])
        )
      };
    },
    async reconcilePayment(input) {
      return {
        metadata: {
          ...(input.metadata ?? {}),
          // TODO(provider-mapping): Call the official Bakong status endpoint once field mappings are confirmed.
          reconciliationMode: "stub"
        },
        providerPaymentId: input.providerPaymentId,
        status: "PENDING"
      };
    },
    async verifyWebhook(rawBody, headers) {
      const secret = providerConfig.clientSecret?.trim();

      if (!secret) {
        return true;
      }

      const signature = findHeader(headers, ["x-bakong-signature", "x-signature"]);

      return signature ? verifyHmacSignature(rawBody, signature, secret) : false;
    }
  };
}
