import type { SupportedCurrency } from "../catalog";

export const PAYMENT_PROVIDER_VALUES = [
  "COD",
  "BAKONG",
  "PAYWAY",
  "TOANCHET",
  "WING"
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDER_VALUES)[number];

export type ExternalPaymentProvider = Exclude<PaymentProvider, "COD">;

export const PAYMENT_STATUS_VALUES = [
  "NOT_REQUIRED",
  "PENDING",
  "PROCESSING",
  "AUTHORIZED",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "EXPIRED"
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

export type CreatePaymentIntentInput = {
  amountMinor: number;
  currency: SupportedCurrency;
  metadata?: Record<string, unknown> | null;
  orderId: string;
  orderNumber: string;
  webhookBaseUrl: string;
};

export type PaymentIntentResult = {
  checkoutUrl: string | null;
  displayName: string;
  instructions: string;
  metadata: Record<string, unknown>;
  provider: ExternalPaymentProvider;
  providerPaymentId: string | null;
  qrPayload: string | null;
  reference: string;
  status: PaymentStatus;
};

export type PaymentWebhookEvent = {
  eventType: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  orderRef?: string | null;
  providerEventId: string;
  providerPaymentId?: string | null;
  status: string;
};

export type ReconcilePaymentInput = {
  amountMinor: number;
  currency: SupportedCurrency;
  metadata: Record<string, unknown> | null;
  orderId: string;
  paymentId: string;
  providerPaymentId: string | null;
  reference: string | null;
};

export type PaymentReconciliationResult = {
  metadata?: Record<string, unknown> | null;
  providerPaymentId?: string | null;
  status: string;
};

export interface PaymentAdapter {
  provider: ExternalPaymentProvider;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  parseEvent(rawBody: string): PaymentWebhookEvent;
  reconcilePayment?(
    input: ReconcilePaymentInput
  ): Promise<PaymentReconciliationResult | null>;
  verifyWebhook(
    rawBody: string,
    headers: Record<string, string>
  ): Promise<boolean>;
}
