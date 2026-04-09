import type { AdminPaymentDetail } from "@khmercart/db";
import Link from "next/link";

const PAYWAY_STATUS_BASE_URL = "https://api.khmercart.shop";

type PaymentDetailPanelProps = {
  payment: AdminPaymentDetail;
};

function formatMoney(amountMinor: number, currency: string) {
  if (currency === "USD") {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }

  return `${currency} ${amountMinor.toLocaleString()}`;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

function formatJson(value: unknown) {
  if (value === null || value === undefined) {
    return "No metadata recorded.";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Unable to serialize metadata.";
  }
}

function statusTone(status: AdminPaymentDetail["status"]) {
  switch (status) {
    case "SUCCEEDED":
      return "bg-emerald-100 text-emerald-800";
    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
      return "bg-rose-100 text-rose-800";
    case "AUTHORIZED":
    case "PROCESSING":
      return "bg-sky-100 text-sky-800";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

export function PaymentDetailPanel({ payment }: PaymentDetailPanelProps) {
  const statusPageHref =
    payment.provider === "PAYWAY"
      ? `${PAYWAY_STATUS_BASE_URL}/payments/payway/complete?orderId=${encodeURIComponent(payment.orderId)}`
      : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
      <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Payment detail
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              {payment.orderNumber}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {payment.provider} • {payment.method} • {payment.id}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]",
                statusTone(payment.status)
              ].join(" ")}
            >
              {payment.status}
            </span>
            <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-stone-700">
              {payment.orderState}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Buyer
            </p>
            <p className="mt-2 font-medium text-stone-950">{payment.buyerName}</p>
            <p className="mt-1 text-sm text-stone-700">{payment.buyerEmail ?? "No email on file"}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
              {payment.buyerPhone ?? "No phone on file"}
            </p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Seller
            </p>
            <p className="mt-2 font-medium text-stone-950">{payment.sellerName}</p>
            <p className="mt-1 text-sm text-stone-700">{payment.sellerSlug}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Amount
            </p>
            <p className="mt-2 font-medium text-stone-950">
              {formatMoney(payment.amountMinor, payment.currency)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
              Created {formatTimestamp(payment.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-[1.5rem] border border-black/10 bg-white px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Provider references
            </p>
            <div className="mt-3 space-y-3 text-sm text-stone-700">
              <p>
                <span className="font-semibold text-stone-950">Payment id:</span>{" "}
                <span className="break-all">{payment.providerPaymentId ?? "Not assigned yet"}</span>
              </p>
              <p>
                <span className="font-semibold text-stone-950">Reference:</span>{" "}
                <span className="break-all">{payment.providerReference ?? "Not assigned yet"}</span>
              </p>
              <p>
                <span className="font-semibold text-stone-950">Last reconciled:</span>{" "}
                {formatTimestamp(payment.lastReconciledAt)}
              </p>
              <p>
                <span className="font-semibold text-stone-950">Failed at:</span>{" "}
                {formatTimestamp(payment.failedAt)}
              </p>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-black/10 bg-white px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Order summary
            </p>
            <div className="mt-3 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-stone-950">Subtotal:</span>{" "}
                {formatMoney(payment.order.subtotalMinor, payment.order.currency)}
              </p>
              <p>
                <span className="font-semibold text-stone-950">Shipping:</span>{" "}
                {formatMoney(payment.order.shippingMinor, payment.order.currency)}
              </p>
              <p>
                <span className="font-semibold text-stone-950">Tax:</span>{" "}
                {formatMoney(payment.order.taxMinor, payment.order.currency)}
              </p>
              <p>
                <span className="font-semibold text-stone-950">Discount:</span>{" "}
                {formatMoney(payment.order.discountMinor, payment.order.currency)}
              </p>
              <p>
                <span className="font-semibold text-stone-950">Total:</span>{" "}
                {formatMoney(payment.order.totalMinor, payment.order.currency)}
              </p>
              <p>
                <span className="font-semibold text-stone-950">Placed:</span>{" "}
                {formatTimestamp(payment.order.placedAt)}
              </p>
              <p>
                <span className="font-semibold text-stone-950">Paid:</span>{" "}
                {formatTimestamp(payment.order.paidAt)}
              </p>
              <p>
                <span className="font-semibold text-stone-950">Cancelled:</span>{" "}
                {formatTimestamp(payment.order.cancelledAt)}
              </p>
            </div>
            {payment.order.notes ? (
              <p className="mt-4 text-sm leading-7 text-stone-700">
                <span className="font-semibold text-stone-950">Order notes:</span>{" "}
                {payment.order.notes}
              </p>
            ) : null}
          </section>
        </div>

        <section className="mt-6 rounded-[1.5rem] border border-black/10 bg-white px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Payment timeline
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-full border border-black/10 bg-stone-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-700 transition hover:-translate-y-0.5"
                href="/payments"
              >
                Back to payments
              </Link>
              {statusPageHref ? (
                <a
                  className="rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-50 transition hover:-translate-y-0.5"
                  href={statusPageHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  Customer status page
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {payment.events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-stone-50/85 px-4 py-5 text-sm text-stone-600">
                No provider events have been recorded yet.
              </div>
            ) : (
              payment.events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-950">
                        {event.eventType} • {event.providerStatus}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                        {formatTimestamp(event.receivedAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-stone-700">
                      {event.signatureVerified ? "Signature verified" : "Signature not verified"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-stone-500 md:grid-cols-2">
                    <p className="break-all">Event id: {event.providerEventId ?? "Not supplied"}</p>
                    <p className="break-all">Idempotency key: {event.idempotencyKey ?? "Not supplied"}</p>
                    <p className="break-all">Payload hash: {event.payloadHash}</p>
                    <p className="break-all">Headers hash: {event.headersHash ?? "Not supplied"}</p>
                    <p>Processed {formatTimestamp(event.processedAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-black/10 bg-white px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
            Order items
          </p>
          <div className="mt-4 space-y-3">
            {payment.order.items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-950">{item.productName}</p>
                    <p className="mt-1 text-sm text-stone-700">{item.variantName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                      {item.sku}
                    </p>
                  </div>
                  <div className="text-right text-sm text-stone-700">
                    <p>Qty {item.quantity}</p>
                    <p>{formatMoney(item.unitPriceMinor, payment.order.currency)} each</p>
                    <p className="font-medium text-stone-950">
                      {formatMoney(item.subtotalMinor, payment.order.currency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </article>

      <aside className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
          Provider diagnostics
        </p>

        {payment.payway ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4 text-sm text-stone-700">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                PayWay QR state
              </p>
              <p className="mt-3">
                <span className="font-semibold text-stone-950">Generation:</span>{" "}
                {payment.payway.qrGenerationStatus ?? "Not recorded"}
              </p>
              <p className="mt-2">
                <span className="font-semibold text-stone-950">Generated:</span>{" "}
                {formatTimestamp(payment.payway.qrGeneratedAt)}
              </p>
              <p className="mt-2">
                <span className="font-semibold text-stone-950">Expires:</span>{" "}
                {formatTimestamp(payment.payway.qrExpiresAt)}
              </p>
              <p className="mt-2 break-all">
                <span className="font-semibold text-stone-950">Trace id:</span>{" "}
                {payment.payway.qrTraceId ?? "Not supplied"}
              </p>
              <p className="mt-2">
                <span className="font-semibold text-stone-950">Provider status:</span>{" "}
                {payment.payway.latestProviderStatus ?? "Pending"}
              </p>
              <p className="mt-2">
                <span className="font-semibold text-stone-950">Last webhook:</span>{" "}
                {formatTimestamp(payment.payway.lastWebhookReceivedAt)}
              </p>
              <p className="mt-2">
                <span className="font-semibold text-stone-950">Last reconcile:</span>{" "}
                {formatTimestamp(payment.payway.lastReconciliationRunAt)}
              </p>
            </div>

            {payment.payway.sandboxPlaceholder ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
                PayWay returned a placeholder ABA sandbox merchant payload for this QR. The
                normal ABA app will reject it until ABA enables a payable sandbox profile for
                this merchant.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-stone-50/85 px-4 py-5 text-sm text-stone-600">
            No provider-specific diagnostics are available for this payment.
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
            Metadata snapshot
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6 text-stone-700">
            {formatJson(payment.metadata)}
          </pre>
        </div>

        {payment.qrPayload ? (
          <div className="mt-5 rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              QR payload
            </p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6 text-stone-700">
              {payment.qrPayload}
            </pre>
          </div>
        ) : null}

        {payment.instructions ? (
          <div className="mt-5 rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4 text-sm leading-7 text-stone-700">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Instructions
            </p>
            <p className="mt-3">{payment.instructions}</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
