import type { AdminOrderAddress, AdminOrderDetail } from "@khmercart/db";
import Link from "next/link";

type OrderDetailPanelProps = {
  order: AdminOrderDetail;
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

function formatLabel(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return value.replaceAll("_", " ").toLowerCase();
}

function renderAddress(address: AdminOrderAddress | null) {
  if (!address) {
    return <p className="mt-2 text-sm text-stone-600">Not recorded</p>;
  }

  return (
    <div className="mt-2 space-y-1 text-sm text-stone-700">
      {address.recipient ? <p className="font-medium text-stone-950">{address.recipient}</p> : null}
      {address.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

export function OrderDetailPanel({ order }: OrderDetailPanelProps) {
  const paywayPayment = order.payments.find((payment) => payment.provider === "PAYWAY");
  const paywayStatusHref = paywayPayment
    ? `https://api.khmercart.shop/payments/payway/complete?orderId=${encodeURIComponent(order.id)}`
    : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_23rem]">
      <article className="grid gap-6 rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Order detail
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              {order.orderNumber}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {order.buyer.fullName} • {order.seller.displayName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-stone-50">
              {formatLabel(order.state)}
            </span>
            {order.shipment ? (
              <span className="rounded-full bg-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-stone-700">
                {formatLabel(order.shipment.status)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Created
            </p>
            <p className="mt-2 text-sm font-medium text-stone-950">{formatTimestamp(order.createdAt)}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Placed
            </p>
            <p className="mt-2 text-sm font-medium text-stone-950">{formatTimestamp(order.placedAt)}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Payment method
            </p>
            <p className="mt-2 text-sm font-medium text-stone-950">{order.paymentMethod}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Total
            </p>
            <p className="mt-2 text-sm font-medium text-stone-950">
              {formatMoney(order.totalMinor, order.currency)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[1.4rem] border border-black/10 bg-stone-50/85 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Buyer
            </p>
            <div className="mt-3 space-y-1 text-sm text-stone-700">
              <p className="font-medium text-stone-950">{order.buyer.fullName}</p>
              <p>{order.buyer.email ?? "No email"}</p>
              <p>{order.buyer.phone ?? "No phone"}</p>
            </div>
          </section>
          <section className="rounded-[1.4rem] border border-black/10 bg-stone-50/85 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Seller
            </p>
            <div className="mt-3 space-y-1 text-sm text-stone-700">
              <p className="font-medium text-stone-950">{order.seller.displayName}</p>
              <p>/{order.seller.slug}</p>
              <p>{order.seller.supportEmail ?? order.seller.supportPhone ?? "No support contact"}</p>
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[1.4rem] border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Shipping address
            </p>
            {renderAddress(order.addresses.shipping)}
          </section>
          <section className="rounded-[1.4rem] border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Billing address
            </p>
            {renderAddress(order.addresses.billing)}
          </section>
        </div>

        <section className="rounded-[1.4rem] border border-black/10 bg-stone-50/85 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Shipment
            </p>
            {order.shipment?.trackingUrl ? (
              <a
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-700 transition hover:-translate-y-0.5"
                href={order.shipment.trackingUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open tracking link
              </a>
            ) : null}
          </div>
          {order.shipment ? (
            <>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                    Carrier
                  </p>
                  <p className="mt-2 text-sm text-stone-950">{order.shipment.carrier ?? "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                    Tracking
                  </p>
                  <p className="mt-2 break-all text-sm text-stone-950">
                    {order.shipment.trackingNumber ?? "Not recorded"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                    Shipped
                  </p>
                  <p className="mt-2 text-sm text-stone-950">{formatTimestamp(order.shipment.shippedAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                    Delivered
                  </p>
                  <p className="mt-2 text-sm text-stone-950">{formatTimestamp(order.shipment.deliveredAt)}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {order.shipment.updates.length ? (
                  order.shipment.updates.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-[1.1rem] border border-black/8 bg-white px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-stone-950">
                          {formatLabel(event.status)}
                        </p>
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                          {formatTimestamp(event.occurredAt)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-stone-700">
                        {event.message ?? "No shipment note recorded."}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                        {event.source}
                        {event.actorName ? ` · ${event.actorName}` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-600">No shipment events recorded yet.</p>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-stone-600">No shipment record has been created yet.</p>
          )}
        </section>
      </article>

      <aside className="grid gap-6">
        <section className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Payments
            </p>
            <Link
              className="rounded-full border border-black/10 bg-stone-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-700 transition hover:-translate-y-0.5"
              href="/payments"
            >
              Back to payments
            </Link>
          </div>
          <div className="mt-4 grid gap-4">
            {order.payments.length ? (
              order.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-[1.3rem] border border-black/10 bg-stone-50/85 px-4 py-4 text-sm text-stone-700"
                >
                  <p className="font-semibold text-stone-950">
                    {payment.provider} • {payment.status}
                  </p>
                  <p className="mt-2">{formatMoney(payment.amountMinor, order.currency)}</p>
                  <p className="mt-1 break-all text-xs text-stone-500">
                    {payment.providerPaymentId ?? payment.providerReference ?? "No provider reference"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                    Reconciled {formatTimestamp(payment.lastReconciledAt)}
                  </p>
                  {payment.latestEvent ? (
                    <p className="mt-2 text-xs text-stone-600">
                      Latest event: {payment.latestEvent.eventType} • {payment.latestEvent.providerStatus}
                    </p>
                  ) : null}
                  {payment.payway?.sandboxPlaceholder ? (
                    <p className="mt-2 text-xs text-amber-800">
                      PayWay sandbox is still returning a placeholder QR payload for this order.
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-600">No payments recorded yet.</p>
            )}
            {paywayStatusHref ? (
              <a
                className="rounded-full bg-stone-950 px-4 py-3 text-center text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5"
                href={paywayStatusHref}
                rel="noreferrer"
                target="_blank"
              >
                Open PayWay status page
              </a>
            ) : null}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
            Order timeline
          </p>
          <div className="mt-4 grid gap-3">
            {order.events.length ? (
              order.events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[1.2rem] border border-black/10 bg-stone-50/85 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-950">{event.type}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                      {formatTimestamp(event.createdAt)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-stone-700">
                    {event.message ?? "No event note recorded."}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                    {event.fromState ?? "NONE"} → {event.toState ?? "NONE"}
                    {event.actorName ? ` · ${event.actorName}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-600">No order events recorded yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
            Items
          </p>
          <div className="mt-4 grid gap-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.2rem] border border-black/10 bg-stone-50/85 px-4 py-3"
              >
                <p className="text-sm font-semibold text-stone-950">{item.title}</p>
                <p className="mt-1 text-sm text-stone-700">{item.variantName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                  {item.sku} • Qty {item.quantity}
                </p>
                <p className="mt-2 text-sm text-stone-700">
                  {formatMoney(item.lineTotalMinor, order.currency)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
