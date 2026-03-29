import type { BuyerOrderTrackingData } from "@khmercart/db";
import Link from "next/link";
import { formatMoney } from "./lib/format";
import { getBuyerDictionary, type BuyerLocale } from "./lib/i18n";

type OrderTrackingViewProps = {
  data: BuyerOrderTrackingData;
  locale: BuyerLocale;
};

function formatStatusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function formatTimestamp(value: string, locale: BuyerLocale) {
  return new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function OrderTrackingView({ data, locale }: OrderTrackingViewProps) {
  const dictionary = getBuyerDictionary(locale);

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

        <Link
          className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:-translate-y-0.5 hover:text-stone-950"
          href={`/?locale=${locale}`}
        >
          {dictionary.backToFeed}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="grid gap-4 rounded-[2rem] border border-black/10 bg-white/82 p-6 shadow-[0_18px_45px_rgba(41,24,8,0.06)]">
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
                {formatStatusLabel(data.state)}
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
              <p>{data.seller.contact}</p>
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                /{data.seller.slug}
              </p>
            </div>
          </div>

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
        </article>

        <article className="rounded-[2rem] border border-black/10 bg-white/82 p-6 shadow-[0_18px_45px_rgba(41,24,8,0.06)]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
            {dictionary.trackingTimeline}
          </p>

          <div className="mt-4 grid gap-4">
            {data.shipment?.updates.length ? (
              data.shipment.updates.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[1.35rem] border border-black/8 bg-stone-50/85 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-950">
                      {formatStatusLabel(event.status)}
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
                {dictionary.timelineEmpty}
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
