import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupportedCurrency } from "../../catalog";
import type { PaymentAdapter } from "../PaymentAdapter";
import type { PaymentsConfig } from "../config";
import {
  buildFallbackProviderEventId,
  createStubCheckoutUrl,
  createWebhookUrl,
  findHeader,
  normalizeProviderStatus,
  parseJsonObject,
  pickString
} from "./shared";

const PAYWAY_SANDBOX_BASE_URL = "https://checkout-sandbox.payway.com.kh";
const PAYWAY_PRODUCTION_BASE_URL = "https://checkout.payway.com.kh";

type PaywayLineItem = {
  name: string;
  quantity: number;
  unitPriceMinor: number;
  currency: SupportedCurrency;
};

type PaywayPurchaseFormInput = {
  amountMinor: number;
  apiKey: string;
  currency: SupportedCurrency;
  customerEmail: string | null;
  customerFullName: string | null;
  customerPhone: string | null;
  items: PaywayLineItem[];
  merchantId: string;
  orderId: string;
  orderNumber: string;
  paymentOption?: string | null;
  purchaseUrl: string;
  shippingMinor?: number;
  webhookBaseUrl: string;
};

type PaywayPurchaseForm = {
  actionUrl: string;
  fields: Record<string, string>;
};

function resolvePaywayBaseUrl(config: PaymentsConfig): string {
  const configuredBaseUrl = config.payway.baseUrl?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  return config.paymentsEnv === "prod"
    ? PAYWAY_PRODUCTION_BASE_URL
    : PAYWAY_SANDBOX_BASE_URL;
}

export function resolvePaywayPurchaseUrl(config: PaymentsConfig): string {
  const baseUrl = resolvePaywayBaseUrl(config);

  if (baseUrl.includes("/api/payment-gateway/v1/payments/purchase")) {
    return baseUrl;
  }

  return `${baseUrl}/api/payment-gateway/v1/payments/purchase`;
}

export function resolvePaywayCheckTransactionUrl(config: PaymentsConfig): string {
  const baseUrl = resolvePaywayBaseUrl(config);

  if (baseUrl.includes("/api/payment-gateway/v1/payments/check-transaction-2")) {
    return baseUrl;
  }

  if (baseUrl.includes("/api/payment-gateway/v1/payments/purchase")) {
    return baseUrl.replace(
      /\/api\/payment-gateway\/v1\/payments\/purchase$/,
      "/api/payment-gateway/v1/payments/check-transaction-2"
    );
  }

  return `${baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`;
}

export function isPaywayConfigured(config: PaymentsConfig): boolean {
  return Boolean(config.payway.apiKey?.trim() && config.payway.merchantId?.trim());
}

function formatPaywayUtcTimestamp(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  const seconds = String(value.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function formatPaywayAmount(
  amountMinor: number,
  currency: SupportedCurrency
): string {
  if (currency === "USD") {
    return (amountMinor / 100).toFixed(2);
  }

  return String(Math.trunc(amountMinor));
}

function encodeBase64Utf8(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function normalizePaywayText(value: string | null | undefined, maxLength: number): string {
  const normalized = value?.trim() ?? "";

  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function splitCustomerName(fullName: string | null | undefined): {
  firstname: string;
  lastname: string;
} {
  const normalized = normalizePaywayText(fullName, 180);

  if (!normalized) {
    return {
      firstname: "KhmerCart",
      lastname: "Customer"
    };
  }

  const segments = normalized.split(/\s+/).filter(Boolean);
  const firstname = segments.shift() ?? "KhmerCart";
  const lastname = segments.join(" ") || "Customer";

  return {
    firstname: normalizePaywayText(firstname, 100),
    lastname: normalizePaywayText(lastname, 100)
  };
}

function encodePaywayItems(items: PaywayLineItem[]): string {
  const normalizedItems = items
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      name: normalizePaywayText(item.name, 80) || "KhmerCart item",
      price:
        item.currency === "USD"
          ? Number((item.unitPriceMinor / 100).toFixed(2))
          : item.unitPriceMinor,
      quantity: item.quantity
    }));

  const fullEncoded = encodeBase64Utf8(JSON.stringify(normalizedItems));

  if (fullEncoded.length <= 500) {
    return fullEncoded;
  }

  const summaryEncoded = encodeBase64Utf8(
    JSON.stringify([
      {
        name: `KhmerCart order (${normalizedItems.length} items)`,
        price:
          normalizedItems.reduce(
            (runningTotal, item) => runningTotal + Number(item.price) * item.quantity,
            0
          ),
        quantity: 1
      }
    ])
  );

  return summaryEncoded;
}

function normalizePaywayProviderStatus(
  status: string | null | undefined
): string {
  const normalized = status?.trim().toUpperCase() ?? "";

  if (normalized === "0") {
    return "APPROVED";
  }

  if (normalized === "2") {
    return "PENDING";
  }

  if (normalized === "3") {
    return "DECLINED";
  }

  if (normalized === "4") {
    return "REFUNDED";
  }

  if (normalized === "7") {
    return "CANCELLED";
  }

  return normalized || "PENDING";
}

function createPaywayBase64Hmac(message: string, secret: string): string {
  return createHmac("sha512", secret).update(message, "utf8").digest("base64");
}

function normalizeComparableSignature(signature: string): string {
  return signature.trim();
}

function isMatchingBase64Signature(
  expectedSignature: string,
  providedSignature: string
): boolean {
  const normalizedExpectedSignature = normalizeComparableSignature(expectedSignature);
  const normalizedProvidedSignature = normalizeComparableSignature(providedSignature);

  if (normalizedExpectedSignature.length !== normalizedProvidedSignature.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(normalizedExpectedSignature, "utf8"),
    Buffer.from(normalizedProvidedSignature, "utf8")
  );
}

function stringifyWebhookValue(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return value == null ? "" : String(value);
}

export function createPaywayWebhookSignature(
  payload: Record<string, unknown>,
  secret: string
): string {
  const message = Object.keys(payload)
    .sort((leftKey, rightKey) => leftKey.localeCompare(rightKey))
    .map((key) => stringifyWebhookValue(payload[key]))
    .join("");

  return createPaywayBase64Hmac(message, secret);
}

export function verifyPaywayWebhookSignature(
  rawBody: string,
  headers: Record<string, string>,
  secret: string
): boolean {
  const signature = findHeader(headers, [
    "x-payway-hmac-sha512",
    "x-payway-signature",
    "x-signature"
  ]);

  if (!signature) {
    return false;
  }

  const payload = parseJsonObject(rawBody);
  const expectedSignature = createPaywayWebhookSignature(payload, secret);

  return isMatchingBase64Signature(expectedSignature, signature);
}

export function buildPaywayPurchaseForm(
  input: PaywayPurchaseFormInput
): PaywayPurchaseForm {
  const reqTime = formatPaywayUtcTimestamp(new Date());
  const { firstname, lastname } = splitCustomerName(input.customerFullName);
  const returnUrl = encodeBase64Utf8(
    createWebhookUrl(input.webhookBaseUrl, "/api/webhooks/payway")
  );
  const cancelUrl = createWebhookUrl(
    input.webhookBaseUrl,
    `/payments/payway/cancel?orderId=${encodeURIComponent(input.orderId)}`
  );
  const continueSuccessUrl = createWebhookUrl(
    input.webhookBaseUrl,
    `/payments/payway/complete?orderId=${encodeURIComponent(input.orderId)}`
  );
  const items = encodePaywayItems(input.items);
  const shipping = formatPaywayAmount(input.shippingMinor ?? 0, input.currency);
  const amount = formatPaywayAmount(input.amountMinor, input.currency);
  const email = normalizePaywayText(input.customerEmail, 50);
  const phone = normalizePaywayText(input.customerPhone, 20);
  const paymentOption = normalizePaywayText(input.paymentOption, 20);
  const customFields = encodeBase64Utf8(
    JSON.stringify({
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      provider: "PAYWAY"
    })
  );
  const returnParams = input.orderId;
  const skipSuccessPage = "1";

  const fields: Record<string, string> = {
    amount,
    cancel_url: cancelUrl,
    continue_success_url: continueSuccessUrl,
    currency: input.currency,
    custom_fields: customFields,
    email,
    firstname,
    hash: "",
    items,
    lastname,
    merchant_id: input.merchantId,
    phone,
    req_time: reqTime,
    return_params: returnParams,
    return_url: returnUrl,
    shipping,
    skip_success_page: skipSuccessPage,
    tran_id: input.orderNumber,
    type: "purchase",
    view_type: "hosted_view"
  };

  if (paymentOption) {
    fields.payment_option = paymentOption;
  }

  const signaturePayload = [
    fields.req_time,
    fields.merchant_id,
    fields.tran_id,
    fields.amount,
    fields.items,
    fields.shipping,
    fields.firstname,
    fields.lastname,
    fields.email,
    fields.phone,
    fields.type,
    fields.payment_option ?? "",
    fields.return_url,
    fields.cancel_url,
    fields.continue_success_url,
    "",
    fields.currency,
    fields.custom_fields,
    fields.return_params,
    "",
    "",
    "",
    "",
    fields.skip_success_page
  ].join("");

  fields.hash = createPaywayBase64Hmac(signaturePayload, input.apiKey);

  return {
    actionUrl: input.purchaseUrl,
    fields
  };
}

export function createPaywayAdapter(config: PaymentsConfig): PaymentAdapter {
  const providerConfig = config.payway;

  return {
    provider: "PAYWAY",
    async createPaymentIntent(input) {
      const reference = `PAYWAY-${input.orderNumber}`;

      if (!isPaywayConfigured(config)) {
        return {
          checkoutUrl: createStubCheckoutUrl(
            "https://payway-stub.khmercart.local",
            input.orderId
          ),
          displayName: "ABA PayWay",
          instructions:
            "Redirect the buyer to the PayWay checkout URL and wait for payment confirmation.",
          metadata: {
            apiKeyPresent: Boolean(providerConfig.apiKey),
            integrationMode: config.paymentsEnv,
            merchantId: providerConfig.merchantId ?? null,
            stub: true,
            webhookUrl: createWebhookUrl(input.webhookBaseUrl, "/api/webhooks/payway")
          },
          provider: "PAYWAY",
          providerPaymentId: `payway_${input.orderId}`,
          qrPayload: null,
          reference,
          status: "PENDING"
        };
      }

      return {
        checkoutUrl: createWebhookUrl(
          input.webhookBaseUrl,
          `/payments/payway/checkout/${encodeURIComponent(input.orderId)}`
        ),
        displayName: "ABA PayWay",
        instructions:
          "Redirect the buyer to the PayWay checkout URL and wait for payment confirmation.",
        metadata: {
          integrationMode: config.paymentsEnv,
          merchantId: providerConfig.merchantId ?? null,
          purchaseUrl: resolvePaywayPurchaseUrl(config),
          stub: false,
          transactionId: input.orderNumber,
          webhookUrl: createWebhookUrl(input.webhookBaseUrl, "/api/webhooks/payway")
        },
        provider: "PAYWAY",
        providerPaymentId: input.orderNumber,
        qrPayload: null,
        reference,
        status: "PENDING"
      };
    },
    parseEvent(rawBody) {
      const payload = parseJsonObject(rawBody);
      const resolvedStatus =
        normalizePaywayProviderStatus(
          pickString(payload, [
            "payment_status",
            "data.payment_status",
            "status",
            "paymentStatus",
            "transactionStatus",
            "data.payment_status_code"
          ])
        ) || "PENDING";

      return {
        eventType:
          pickString(payload, ["eventType", "type", "action"]) ?? "PAYMENT_UPDATE",
        idempotencyKey: pickString(payload, ["idempotencyKey", "requestId"]) ?? null,
        metadata: payload,
        orderRef:
          pickString(payload, [
            "return_params",
            "orderRef",
            "orderId",
            "merchantRef",
            "reference",
            "tran_id"
          ]) ?? null,
        providerEventId:
          pickString(payload, ["eventId", "id", "tran_id"]) ??
          buildFallbackProviderEventId("PAYWAY", rawBody),
        providerPaymentId:
          pickString(payload, ["paymentId", "transactionId", "txnId", "tran_id"]) ?? null,
        status: normalizeProviderStatus(resolvedStatus)
      };
    },
    async reconcilePayment(input) {
      const apiKey = providerConfig.apiKey?.trim();
      const merchantId = providerConfig.merchantId?.trim();
      const transactionId = input.providerPaymentId ?? input.reference ?? null;

      if (!apiKey || !merchantId || !transactionId) {
        return {
          metadata: {
            ...(input.metadata ?? {}),
            reconciliationMode: "stub"
          },
          providerPaymentId: input.providerPaymentId,
          status: "PENDING"
        };
      }

      const reqTime = formatPaywayUtcTimestamp(new Date());
      const hash = createPaywayBase64Hmac(
        `${reqTime}${merchantId}${transactionId}`,
        apiKey
      );

      try {
        const response = await fetch(resolvePaywayCheckTransactionUrl(config), {
          body: JSON.stringify({
            hash,
            merchant_id: merchantId,
            req_time: reqTime,
            tran_id: transactionId
          }),
          headers: {
            "content-type": "application/json"
          },
          method: "POST"
        });

        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as Record<string, unknown>;
        const data =
          payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
            ? (payload.data as Record<string, unknown>)
            : payload;
        const nextStatus = normalizePaywayProviderStatus(
          pickString(data, ["payment_status", "payment_status_code", "status"])
        );

        return {
          metadata: {
            ...(input.metadata ?? {}),
            paywayCheckTransaction: data,
            reconciliationMode: "payway"
          },
          providerPaymentId: transactionId,
          status: nextStatus || "PENDING"
        };
      } catch {
        return null;
      }
    },
    async verifyWebhook(rawBody, headers) {
      const secret = providerConfig.webhookSecret?.trim();

      if (!secret) {
        return true;
      }

      return verifyPaywayWebhookSignature(rawBody, headers, secret);
    }
  };
}
