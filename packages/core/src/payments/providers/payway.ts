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

type PaywayQrRequestInput = {
  amountMinor: number;
  apiKey: string;
  currency: SupportedCurrency;
  customerEmail: string | null;
  customerFullName: string | null;
  customerPhone: string | null;
  items: PaywayLineItem[];
  lifetimeMinutes?: number;
  merchantId: string;
  orderId: string;
  orderNumber: string;
  paymentOption?: string | null;
  qrImageTemplate?: string | null;
  qrUrl: string;
  shippingMinor?: number;
  webhookBaseUrl: string;
};

type PaywayQrRequest = {
  actionUrl: string;
  body: Record<string, number | string | null>;
};

type TlvSegment = {
  id: string;
  value: string;
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

export function resolvePaywayGenerateQrUrl(config: PaymentsConfig): string {
  const baseUrl = resolvePaywayBaseUrl(config);

  if (baseUrl.includes("/api/payment-gateway/v1/payments/generate-qr")) {
    return baseUrl;
  }

  if (baseUrl.includes("/api/payment-gateway/v1/payments/purchase")) {
    return baseUrl.replace(
      /\/api\/payment-gateway\/v1\/payments\/purchase$/,
      "/api/payment-gateway/v1/payments/generate-qr"
    );
  }

  if (baseUrl.includes("/api/payment-gateway/v1/payments/check-transaction-2")) {
    return baseUrl.replace(
      /\/api\/payment-gateway\/v1\/payments\/check-transaction-2$/,
      "/api/payment-gateway/v1/payments/generate-qr"
    );
  }

  return `${baseUrl}/api/payment-gateway/v1/payments/generate-qr`;
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

  if (baseUrl.includes("/api/payment-gateway/v1/payments/generate-qr")) {
    return baseUrl.replace(
      /\/api\/payment-gateway\/v1\/payments\/generate-qr$/,
      "/api/payment-gateway/v1/payments/check-transaction-2"
    );
  }

  return `${baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`;
}

export function isPaywayConfigured(config: PaymentsConfig): boolean {
  return Boolean(config.payway.apiKey?.trim() && config.payway.merchantId?.trim());
}

function parseTlvSegments(value: string): TlvSegment[] {
  const segments: TlvSegment[] = [];
  let offset = 0;

  while (offset + 4 <= value.length) {
    const id = value.slice(offset, offset + 2);
    const rawLength = value.slice(offset + 2, offset + 4);
    const length = Number.parseInt(rawLength, 10);

    if (!Number.isFinite(length) || length < 0) {
      break;
    }

    const valueStart = offset + 4;
    const valueEnd = valueStart + length;

    if (valueEnd > value.length) {
      break;
    }

    segments.push({
      id,
      value: value.slice(valueStart, valueEnd)
    });

    offset = valueEnd;

    if (id === "63") {
      break;
    }
  }

  return segments;
}

export function detectPaywaySandboxPlaceholderQr(
  qrString: string | null | undefined
): boolean {
  if (!qrString) {
    return false;
  }

  const merchantTemplate = parseTlvSegments(qrString).find(
    (segment) => segment.id === "30"
  );

  if (!merchantTemplate) {
    return false;
  }

  const merchantSegments = parseTlvSegments(merchantTemplate.value);
  const bakongId =
    merchantSegments.find((segment) => segment.id === "00")?.value ?? null;
  const merchantAccountId =
    merchantSegments.find((segment) => segment.id === "01")?.value ?? null;

  return (
    bakongId === "abaakhppxxx@abaa" || merchantAccountId === "111111111111111"
  );
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

  if (normalized === "0" || normalized === "00") {
    return "SUCCEEDED";
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

export function buildPaywayQrRequest(
  input: PaywayQrRequestInput
): PaywayQrRequest {
  const reqTime = formatPaywayUtcTimestamp(new Date());
  const { firstname, lastname } = splitCustomerName(input.customerFullName);
  const callbackUrl = encodeBase64Utf8(
    createWebhookUrl(input.webhookBaseUrl, "/api/webhooks/payway")
  );
  const items = encodePaywayItems(input.items);
  const amount = formatPaywayAmount(input.amountMinor, input.currency);
  const email = normalizePaywayText(input.customerEmail, 50);
  const phone = normalizePaywayText(input.customerPhone, 20);
  const paymentOption =
    normalizePaywayText(input.paymentOption, 20) || "abapay_khqr";
  const qrImageTemplate =
    normalizePaywayText(input.qrImageTemplate, 32) || "template3_color";
  const lifetime = input.lifetimeMinutes ?? 60;
  const customFields = encodeBase64Utf8(
    JSON.stringify({
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      provider: "PAYWAY"
    })
  );
  const body: Record<string, number | string | null> = {
    amount: input.currency === "USD" ? Number(amount) : Number.parseInt(amount, 10),
    callback_url: callbackUrl,
    currency: input.currency,
    custom_fields: customFields,
    email,
    first_name: firstname,
    hash: "",
    items,
    last_name: lastname,
    lifetime,
    merchant_id: input.merchantId,
    payment_option: paymentOption,
    payout: null,
    phone,
    purchase_type: "purchase",
    qr_image_template: qrImageTemplate,
    req_time: reqTime,
    return_deeplink: null,
    return_params: input.orderId,
    tran_id: input.orderNumber,
  };

  const signaturePayload = [
    String(body.req_time ?? ""),
    String(body.merchant_id ?? ""),
    String(body.tran_id ?? ""),
    String(body.amount ?? ""),
    String(body.items ?? ""),
    String(body.first_name ?? ""),
    String(body.last_name ?? ""),
    String(body.email ?? ""),
    String(body.phone ?? ""),
    String(body.purchase_type ?? ""),
    String(body.payment_option ?? ""),
    String(body.callback_url ?? ""),
    String(body.return_deeplink ?? ""),
    String(body.currency ?? ""),
    String(body.custom_fields ?? ""),
    String(body.return_params ?? ""),
    String(body.payout ?? ""),
    String(body.lifetime ?? ""),
    String(body.qr_image_template ?? "")
  ].join("");

  body.hash = createPaywayBase64Hmac(signaturePayload, input.apiKey);

  return {
    actionUrl: input.qrUrl,
    body
  };
}

export function createPaywayAdapter(config: PaymentsConfig): PaymentAdapter {
  const providerConfig = config.payway;

  return {
    provider: "PAYWAY",
    async createPaymentIntent(input) {
      const reference = input.orderNumber;

      if (!isPaywayConfigured(config)) {
        return {
          checkoutUrl: createStubCheckoutUrl(
            "https://payway-stub.khmercart.local",
            input.orderId
          ),
          displayName: "ABA PayWay",
          instructions:
            "Show the buyer the ABA PayWay QR checkout page and wait for payment confirmation.",
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
          "Show the buyer the ABA PayWay QR checkout page and wait for payment confirmation.",
        metadata: {
          callbackUrl: createWebhookUrl(input.webhookBaseUrl, "/api/webhooks/payway"),
          generateQrUrl: resolvePaywayGenerateQrUrl(config),
          integrationMode: config.paymentsEnv,
          merchantId: providerConfig.merchantId ?? null,
          merchantRefNo: input.orderNumber,
          paymentOption: "abapay_khqr",
          qrImageTemplate: "template3_color",
          stub: false,
          transactionId: input.orderNumber,
          webhookUrl: createWebhookUrl(input.webhookBaseUrl, "/api/webhooks/payway")
        },
        provider: "PAYWAY",
        providerPaymentId: null,
        qrPayload: null,
        reference,
        status: "PENDING"
      };
    },
    parseEvent(rawBody) {
      const payload = parseJsonObject(rawBody);
      const explicitPaymentStatus = pickString(payload, [
        "payment_status",
        "data.payment_status",
        "paymentStatus",
        "transactionStatus",
        "data.payment_status_code"
      ]);
      const isQrCallback = Boolean(
        pickString(payload, ["merchant_ref_no", "merchantRefNo"])
      );
      const resolvedStatus = explicitPaymentStatus
        ? normalizePaywayProviderStatus(explicitPaymentStatus) || "PENDING"
        : isQrCallback
          ? "PENDING"
          : normalizePaywayProviderStatus(
              pickString(payload, ["status", "status.code", "statusCode", "status_code"])
            ) || "PENDING";

      return {
        eventType:
          pickString(payload, ["eventType", "type", "action"]) ?? "PAYMENT_UPDATE",
        idempotencyKey: pickString(payload, ["idempotencyKey", "requestId"]) ?? null,
        metadata: payload,
        orderRef:
          pickString(payload, [
            "merchant_ref_no",
            "merchantRefNo",
            "return_params",
            "orderRef",
            "orderId",
            "merchantRef",
            "reference",
            "tran_id"
          ]) ?? null,
        providerEventId:
          pickString(payload, ["eventId", "id", "tran_id", "merchant_ref_no"]) ??
          buildFallbackProviderEventId("PAYWAY", rawBody),
        providerPaymentId:
          pickString(payload, ["tran_id", "paymentId", "transactionId", "txnId"]) ?? null,
        status: normalizeProviderStatus(resolvedStatus)
      };
    },
    async reconcilePayment(input) {
      const apiKey = providerConfig.apiKey?.trim();
      const merchantId = providerConfig.merchantId?.trim();
      const transactionId =
        input.providerPaymentId ??
        input.reference ??
        (input.metadata &&
        typeof input.metadata === "object" &&
        !Array.isArray(input.metadata) &&
        typeof input.metadata.merchantRefNo === "string"
          ? input.metadata.merchantRefNo
          : null);

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
