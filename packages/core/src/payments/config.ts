import type { ExternalPaymentProvider } from "./PaymentAdapter";

export type PaymentEnvironment = "local" | "prod";

type BakongConfig = {
  apiBaseUrl?: string;
  clientId?: string;
  clientSecret?: string;
};

type ProviderWebhookConfig = {
  apiKey?: string;
  baseUrl?: string;
  merchantId?: string;
  webhookSecret?: string;
};

export type PaymentsConfig = {
  bakong: BakongConfig;
  payway: ProviderWebhookConfig;
  paymentsEnv: PaymentEnvironment;
  toanchet: ProviderWebhookConfig;
  webhookBaseUrl: string;
  wing: ProviderWebhookConfig;
};

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const normalized = normalizeOptionalValue(value) ?? fallback;

  return normalized.replace(/\/+$/, "");
}

export function readPaymentsConfig(
  env: NodeJS.ProcessEnv = process.env
): PaymentsConfig {
  const paymentsEnv = env.PAYMENTS_ENV?.trim().toLowerCase() === "prod" ? "prod" : "local";

  return {
    bakong: {
      apiBaseUrl: normalizeOptionalValue(env.BAKONG_API_BASE),
      clientId: normalizeOptionalValue(env.BAKONG_CLIENT_ID),
      clientSecret: normalizeOptionalValue(env.BAKONG_CLIENT_SECRET)
    },
    paymentsEnv,
    payway: {
      apiKey: normalizeOptionalValue(env.PAYWAY_API_KEY),
      baseUrl: normalizeOptionalValue(env.PAYWAY_BASE_URL),
      merchantId: normalizeOptionalValue(env.PAYWAY_MERCHANT_ID),
      webhookSecret: normalizeOptionalValue(env.PAYWAY_WEBHOOK_SECRET)
    },
    toanchet: {
      apiKey: normalizeOptionalValue(env.TOANCHET_API_KEY),
      baseUrl: normalizeOptionalValue(env.TOANCHET_BASE_URL),
      merchantId: normalizeOptionalValue(env.TOANCHET_MERCHANT_ID),
      webhookSecret: normalizeOptionalValue(env.TOANCHET_WEBHOOK_SECRET)
    },
    webhookBaseUrl: normalizeBaseUrl(env.WEBHOOK_BASE_URL, "http://localhost:3002"),
    wing: {
      apiKey: normalizeOptionalValue(env.WING_API_KEY),
      baseUrl: normalizeOptionalValue(env.WING_BASE_URL),
      merchantId: normalizeOptionalValue(env.WING_MERCHANT_ID),
      webhookSecret: normalizeOptionalValue(env.WING_WEBHOOK_SECRET)
    }
  };
}

export function isWebhookVerificationEnabled(
  provider: ExternalPaymentProvider,
  config: PaymentsConfig
): boolean {
  if (provider === "BAKONG") {
    return Boolean(config.bakong.clientSecret);
  }

  if (provider === "PAYWAY") {
    return Boolean(config.payway.webhookSecret);
  }

  if (provider === "TOANCHET") {
    return Boolean(config.toanchet.webhookSecret);
  }

  return Boolean(config.wing.webhookSecret);
}
