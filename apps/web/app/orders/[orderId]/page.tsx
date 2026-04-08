import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { BuyerShell } from "../../buyer-shell";
import {
  getBuyerDictionary,
  readDefaultBuyerLocale,
  readSupportedBuyerLocales,
  resolveBuyerLocale
} from "../../lib/i18n";
import { OrderTrackingView } from "../../order-tracking-view";
import { headers } from "next/headers";
import { getBuyerOrderTrackingData, ShippingServiceError } from "@khmercart/db";

type BuyerOrderTrackingPageProps = {
  params: Promise<{
    orderId: string;
  }>;
  searchParams: Promise<{
    locale?: string;
  }>;
};

export default async function BuyerOrderTrackingPage({
  params,
  searchParams
}: BuyerOrderTrackingPageProps) {
  const [{ orderId }, query, headerList] = await Promise.all([
    params,
    searchParams,
    headers()
  ]);
  const supportedLocales = readSupportedBuyerLocales(process.env);
  const locale = resolveBuyerLocale(
    query.locale,
    supportedLocales,
    readDefaultBuyerLocale(process.env)
  );
  const dictionary = getBuyerDictionary(locale);
  const session = await requireRoleFromHeaders(
    headerList,
    readAuthConfig(process.env).jwtSecret,
    "BUYER"
  );
  let tracking = null;
  let trackingUnavailable = false;

  try {
    tracking = await getBuyerOrderTrackingData(session.user.id, orderId);
  } catch (error) {
    if (!(error instanceof ShippingServiceError) || error.code !== "NOT_FOUND") {
      throw error;
    }
    trackingUnavailable = true;
  }

  return (
    <BuyerShell locale={locale} supportedLocales={supportedLocales}>
      {tracking && !trackingUnavailable ? (
        <OrderTrackingView data={tracking} locale={locale} />
      ) : (
        <section className="rounded-[2rem] border border-black/10 bg-white/82 px-6 py-10 text-center shadow-[0_18px_45px_rgba(41,24,8,0.06)]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
            KhmerCart
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
            {dictionary.trackingTitle}
          </h1>
          <p className="mt-3 text-sm text-stone-600">
            {dictionary.trackingAccessDenied}
          </p>
        </section>
      )}
    </BuyerShell>
  );
}
