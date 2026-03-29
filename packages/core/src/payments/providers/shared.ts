import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { ExternalPaymentProvider } from "../PaymentAdapter";

export function parseJsonObject(rawBody: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawBody);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}

export function pickString(
  payload: Record<string, unknown>,
  paths: string[]
): string | null {
  for (const path of paths) {
    const segments = path.split(".");
    let current: unknown = payload;

    for (const segment of segments) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        current = null;
        break;
      }

      current = (current as Record<string, unknown>)[segment];
    }

    if (typeof current === "string") {
      const normalized = current.trim();

      if (normalized) {
        return normalized;
      }
    }

    if (typeof current === "number" || typeof current === "boolean") {
      return String(current);
    }
  }

  return null;
}

export function normalizeHeaders(
  headers: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
}

export function findHeader(
  headers: Record<string, string>,
  headerNames: string[]
): string | null {
  const normalizedHeaders = normalizeHeaders(headers);

  for (const headerName of headerNames) {
    const value = normalizedHeaders[headerName.toLowerCase()]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export function createHmacSignature(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

function normalizeSignature(value: string): string {
  return value.trim().replace(/^sha256=/i, "").toLowerCase();
}

export function verifyHmacSignature(
  rawBody: string,
  providedSignature: string,
  secret: string
): boolean {
  const normalizedProvidedSignature = normalizeSignature(providedSignature);
  const expectedSignature = createHmacSignature(rawBody, secret);

  if (normalizedProvidedSignature.length !== expectedSignature.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(normalizedProvidedSignature, "utf8"),
    Buffer.from(expectedSignature, "utf8")
  );
}

export function createStubCheckoutUrl(
  baseUrl: string,
  orderId: string
): string {
  return `${baseUrl.replace(/\/+$/, "")}/checkout/${orderId}`;
}

export function createWebhookUrl(
  baseUrl: string,
  path: string
): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function createStubProviderPaymentId(
  provider: ExternalPaymentProvider,
  orderId: string
): string {
  return `${provider.toLowerCase()}_${orderId}`;
}

export function buildFallbackProviderEventId(
  provider: ExternalPaymentProvider,
  rawBody: string
): string {
  return `${provider.toLowerCase()}_${createHash("sha256")
    .update(rawBody)
    .digest("hex")
    .slice(0, 24)}`;
}

export function normalizeProviderStatus(status: string | null | undefined): string {
  return status?.trim().toUpperCase() || "PENDING";
}
