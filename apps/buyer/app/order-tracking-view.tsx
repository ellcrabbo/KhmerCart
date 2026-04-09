import type { BuyerOrderTrackingData } from "@khmercart/db";
import Link from "next/link";
import { formatMoney } from "./lib/format";
import {
  getBuyerDictionary,
  resolveBuyerOrderStateLabel,
  resolveBuyerShipmentStatusLabel,
  type BuyerLocale
} from "./lib/i18n";

type OrderTrackingViewProps = {
  data: BuyerOrderTrackingData;
  locale: BuyerLocale;
};

function formatTimestamp(value: string, locale: BuyerLocale) {
  return new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function readNextStepMessage(data: BuyerOrderTrackingData, locale: BuyerLocale) {
  const dictionary = getBuyerDictionary(locale);

  if (data.state === "PAYMENT_PENDING") {
    return dictionary.trackingPendingPaymentBody;
  }

  if (data.state === "SELLER_CONFIRMED" || data.state === "PACKED") {
    return dictionary.trackingSellerConfirmedBody;
  }

  if (
    data.state === "HANDED_TO_CARRIER" ||
    data.state === "IN_TRANSIT" ||
    data.shipment?.status === "HANDED_TO_CARRIER" ||
    data.shipment?.status === "IN_TRANSIT"
  ) {
    return dictionary.trackingInTransitBody;
  }

  if (data.state === "DELIVERED" || data.shipment?.status === "DELIVERED") {
    return dictionary.trackingDeliveredBody;
  }

  return dictionary.trackingFallbackBody;
}

function readSupportHref(contact: string) {
  if (contact.includes("@")) {
    return `mailto:${contact}`;
  }

  const digits = contact.replaceAll(/\s+/g, "");

  if (digits.startsWith("+")) {
    return `tel:${digits}`;
  }

  return null;
}

export function OrderTrackingView({ data, locale }: OrderTrackingViewProps) {
  const dictionary = getBuyerDictionary(locale);
  const refreshHref = `/orders/${encodeURIComponent(data.orderId)}?locale=${locale}`;
  const supportHref = readSupportHref(data.seller.contact);
  const orderStateLabel = resolveBuyerOrderStateLabel(locale, data.state);
  const shipmentStatusLabel = data.shipment
    ? resolveBuyerShipmentStatusLabel(locale, data.shipment.status)
    : dictionary.shipmentPending;
  const nextStepMessage = readNextStepMessage(data, locale);

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
            {dictionary.trackingTitle}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            {data.orderNumber}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-stone-600">
            {dictionary.trackingSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:-translate-y-0.5 hover:text-stone-950"
            href={refreshHref}
          >
            {dictionary.refreshTracking}
          </Link>
          <Link
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:-translate-y-0.5 hover:text-stone-950"
            href={`/?locale=${locale}`}
          >
            {dictionary.backToFeed}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="grid gap-4 rounded-[2rem] border border-black/10 bg-white/82 p-6 shadow-[0_18px_45px_rgba(41,24,8,0.06)]">
          <div className="rounded-[1.45rem] border border-emerald-200/60 bg-[linear-gradient(135deg,rgba(220,252,231,0.75),rgba(240,253,244,0.9))] px-5 py-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-emerald-700">
              {dictionary.trackingCurrentStatus}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
                {orderStateLabel}
              </h2>
              <span className="rounded-full bg-white/80 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-emerald-800">
                {shipmentStatusLabel}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-700">
              {nextStepMessage}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-black/8 bg-stone-50/85 px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                {dictionary.orderNumber}
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">{data.orderNumber}</p>
            </div>
            <div className="rounded-[1.3rem] border border-black/8 bg-stone-50/85 px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                {dictionary.orderState}
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">
                {orderStateLabel}
              </p>
            </div>
            <div className="rounded-[1.3rem] border border-black/8 bg-stone-50/85 px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                {dictionary.placedAt}
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">
                {data.placedAt ? formatTimestamp(data.placedAt, locale) : dictionary.trackingPending}
              </p>
            </div>
            <div className="rounded-[1.3rem] border border-black/8 bg-stone-50/85 px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                {dictionary.orderTotal}
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">
                {formatMoney(locale, data.currency, data.totalMinor)}
              </p>
            </div>
          </div>

          <div className="rounded-[1.3rem] border border-black/8 bg-stone-50/85 px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
              {dictionary.seller}
            </p>
            <div className="mt-2 space-y-2 text-sm text-stone-700">
              <p className="font-semibold text-stone-950">{data.seller.displayName}</p>
              {supportHref ? (
                <a
                  className="text-emerald-700 underline underline-offset-4"
                  href={supportHref}
                >
                  {data.seller.contact}
                </a>
              ) : (
                <p>{data.seller.contact}</p>
              )}
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                /{data.seller.slug}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.3rem] border border-black/8 bg-stone-50/85 px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                {dictionary.trackingCarrier}
              </p>
              <div className="mt-2 space-y-2 text-sm text-stone-700">
                <p>
                  <span className="font-semibold text-stone-950">{dictionary.trackingCarrier}:</span>{" "}
                  {data.shipment?.carrier ?? dictionary.trackingPending}
                </p>
                <p>
                  <span className="font-semibold text-stone-950">{dictionary.trackingNumber}:</span>{" "}
                  {data.shipment?.trackingNumber ?? dictionary.trackingPending}
                </p>
                {data.shipment?.trackingUrl ? (
                  <p>
                    <span className="font-semibold text-stone-950">{dictionary.trackingLink}:</span>{" "}
                    <a
                      className="text-emerald-700 underline underline-offset-4"
                      href={data.shipment.trackingUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {dictionary.viewTracking}
                    </a>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.3rem] border border-black/8 bg-stone-50/85 px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                {dictionary.trackingNextStep}
              </p>
              <div className="mt-2 space-y-2 text-sm text-stone-700">
                <p>
                  <span className="font-semibold text-stone-950">{dictionary.shipmentStatusLabel}:</span>{" "}
                  {shipmentStatusLabel}
                </p>
                <p>
                  <span className="font-semibold text-stone-950">{dictionary.sellerSupport}:</span>{" "}
                  {data.seller.contact}
                </p>
                <p>{nextStepMessage}</p>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-black/10 bg-white/82 p-6 shadow-[0_18px_45px_rgba(41,24,8,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
              {dictionary.trackingTimeline}
            </p>
            <Link
              className="rounded-full border border-black/10 bg-stone-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-700 transition hover:-translate-y-0.5"
              href={refreshHref}
            >
              {dictionary.refreshTracking}
            </Link>
          </div>

          <div className="mt-4 grid gap-4">
            {data.shipment?.updates.length ? (
              data.shipment.updates.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[1.35rem] border border-black/8 bg-stone-50/85 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-950">
                      {resolveBuyerShipmentStatusLabel(locale, event.status)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                      {event.occurredAt
                        ? formatTimestamp(event.occurredAt, locale)
                        : dictionary.trackingPending}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{event.message}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                    {event.source}
                    {event.actorName ? ` · ${dictionary.trackingUpdatedBy}: ${event.actorName}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-black/10 bg-stone-50/85 px-4 py-5 text-sm text-stone-600">
                {data.shipment ? dictionary.timelineEmpty : dictionary.shipmentPending}
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
