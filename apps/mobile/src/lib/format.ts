import type { BuyerLocale } from "./i18n";

export function formatMoney(
  locale: BuyerLocale,
  currency: "KHR" | "USD",
  amountMinor: number
): string {
  const normalizedAmount = currency === "USD" ? amountMinor / 100 : amountMinor;
  const localeId = locale === "km" ? "km-KH" : "en-US";

  return new Intl.NumberFormat(localeId, {
    currency,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
    minimumFractionDigits: currency === "USD" ? 2 : 0,
    style: "currency"
  }).format(normalizedAmount);
}

export function formatDateTime(locale: BuyerLocale, value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const localeId = locale === "km" ? "km-KH" : "en-US";

  return new Intl.DateTimeFormat(localeId, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
