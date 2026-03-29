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

export function createToanchetAdapter(config: PaymentsConfig): PaymentAdapter {
  const providerConfig = config.toanchet;

  return {
    provider: "TOANCHET",
    async createPaymentIntent(input) {
      const reference = `TOANCHET-${input.orderNumber}`;
      const checkoutBaseUrl =
        providerConfig.baseUrl ?? "https://toanchet-stub.khmercart.local";

      return {
        checkoutUrl: createStubCheckoutUrl(checkoutBaseUrl, input.orderId),
        displayName: "ACLEDA Toanchet",
        instructions:
          "Redirect the buyer to the ACLEDA Toanchet checkout URL and wait for payment confirmation.",
        metadata: {
          apiKeyPresent: Boolean(providerConfig.apiKey),
          integrationMode: config.paymentsEnv,
          merchantId: providerConfig.merchantId ?? null,
          stub: true,
          // TODO(provider-mapping): Replace this stub flow with the official ACLEDA Toanchet fields and redirect contract.
          webhookUrl: createWebhookUrl(input.webhookBaseUrl, "/api/webhooks/toanchet")
        },
        provider: "TOANCHET",
        providerPaymentId: createStubProviderPaymentId("TOANCHET", input.orderId),
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
          buildFallbackProviderEventId("TOANCHET", rawBody),
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
          // TODO(provider-mapping): Replace this stub with a real ACLEDA Toanchet status lookup.
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

      const signature = findHeader(headers, ["x-toanchet-signature", "x-signature"]);

      return signature ? verifyHmacSignature(rawBody, signature, secret) : false;
    }
  };
}
