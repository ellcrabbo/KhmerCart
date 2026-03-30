export const SELLER_RISK_TIER_VALUES = ["LOW", "MED", "HIGH"] as const;

export type SellerRiskTier = (typeof SELLER_RISK_TIER_VALUES)[number];

export const DEFAULT_PAYOUT_CSV_COLUMNS = [
  "batch_id",
  "reference",
  "seller_id",
  "seller_slug",
  "seller_name",
  "currency",
  "gross_amount_minor",
  "fee_amount_minor",
  "net_amount_minor",
  "payout_bank_name",
  "payout_account_name",
  "payout_account_number",
  "payout_routing_number",
  "period_start",
  "period_end",
  "item_count"
] as const;

export type PayoutCsvColumn = (typeof DEFAULT_PAYOUT_CSV_COLUMNS)[number];

export type LedgerConfig = {
  holdDaysByRiskTier: Record<SellerRiskTier, number>;
  payoutCsvColumns: PayoutCsvColumn[];
  platformFeeBps: number;
};

function parseNonNegativeInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function isPayoutCsvColumn(value: string): value is PayoutCsvColumn {
  return DEFAULT_PAYOUT_CSV_COLUMNS.includes(value as PayoutCsvColumn);
}

export function readLedgerConfig(
  env: NodeJS.ProcessEnv = process.env
): LedgerConfig {
  const configuredColumns = env.PAYOUT_CSV_COLUMNS?.trim();
  const parsedColumns =
    configuredColumns && configuredColumns.toLowerCase() !== "default"
      ? configuredColumns
          .split(",")
          .map((value) => value.trim().toLowerCase())
          .filter((value): value is PayoutCsvColumn => isPayoutCsvColumn(value))
      : [];

  return {
    holdDaysByRiskTier: {
      HIGH: parseNonNegativeInteger(env.HOLD_DAYS_TIER_HIGH, 14),
      LOW: parseNonNegativeInteger(env.HOLD_DAYS_TIER_LOW, 3),
      MED: parseNonNegativeInteger(env.HOLD_DAYS_TIER_MED, 7)
    },
    payoutCsvColumns:
      parsedColumns.length > 0
        ? Array.from(new Set(parsedColumns))
        : [...DEFAULT_PAYOUT_CSV_COLUMNS],
    platformFeeBps: parseNonNegativeInteger(env.PLATFORM_FEE_BPS, 500)
  };
}
