import type { AdminPaymentConsoleEntry } from "@khmercart/db";

const PAYWAY_STATUS_BASE_URL = "https://api.khmercart.shop";

type PaymentOperationsConsoleProps = {
  payments: AdminPaymentConsoleEntry[];
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

function statusTone(status: AdminPaymentConsoleEntry["status"]) {
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

function orderTone(state: string) {
  return state === "PAYMENT_CONFIRMED"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-stone-200 text-stone-700";
}

export function PaymentOperationsConsole({
  payments
}: PaymentOperationsConsoleProps) {
  const pendingCount = payments.filter((payment) =>
    payment.status === "PENDING" ||
    payment.status === "PROCESSING" ||
    payment.status === "AUTHORIZED"
  ).length;
  const succeededCount = payments.filter((payment) => payment.status === "SUCCEEDED").length;
  const actionNeededCount = payments.filter((payment) =>
    payment.status === "FAILED" ||
    payment.status === "CANCELLED" ||
    payment.status === "EXPIRED"
  ).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_20rem]">
      <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Provider operations
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              Payment runs and callback activity
            </h2>
          </div>
          <span className="rounded-full bg-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-stone-700">
            {payments.length} payments
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Pending
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Confirmed
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">{succeededCount}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Action needed
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">{actionNeededCount}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {payments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 bg-stone-50/85 px-5 py-6 text-sm text-stone-600">
              No payments have been created yet.
            </div>
          ) : (
            payments.map((payment) => {
              const statusPageHref =
                payment.provider === "PAYWAY"
                  ? `${PAYWAY_STATUS_BASE_URL}/payments/payway/complete?orderId=${encodeURIComponent(payment.orderId)}`
                  : null;

              return (
                <section
                  key={payment.id}
                  className="rounded-[1.5rem] border border-black/10 bg-stone-50/85 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-stone-950">{payment.orderNumber}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
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
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]",
                          orderTone(payment.orderState)
                        ].join(" ")}
                      >
                        {payment.orderState}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Buyer
                      </p>
                      <p className="mt-2 text-stone-950">{payment.buyerName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                        Seller • {payment.sellerName}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Amount
                      </p>
                      <p className="mt-2 text-stone-950">
                        {formatMoney(payment.amountMinor, payment.currency)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                        Created {formatTimestamp(payment.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Provider refs
                      </p>
                      <p className="mt-2 break-all text-stone-950">
                        {payment.providerPaymentId ?? "No provider payment id yet"}
                      </p>
                      <p className="mt-1 break-all text-xs uppercase tracking-[0.22em] text-stone-500">
                        {payment.providerReference ?? "No provider reference"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm text-stone-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Latest provider event
                      </p>
                      {payment.latestEvent ? (
                        <>
                          <p className="mt-2 text-stone-950">
                            {payment.latestEvent.eventType} • {payment.latestEvent.providerStatus}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                            {formatTimestamp(payment.latestEvent.receivedAt)}
                          </p>
                          <p className="mt-1 break-all text-xs text-stone-500">
                            Event id: {payment.latestEvent.providerEventId ?? "Not supplied"}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            Signature {payment.latestEvent.signatureVerified ? "verified" : "not verified"}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-stone-600">
                          No callback events have been recorded yet.
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm text-stone-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Reconciliation snapshot
                      </p>
                      <p className="mt-2 text-stone-950">
                        Last reconciled {formatTimestamp(payment.lastReconciledAt)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                        Updated {formatTimestamp(payment.updatedAt)}
                      </p>
                      {payment.failedAt ? (
                        <p className="mt-1 text-xs text-rose-700">
                          Failure recorded {formatTimestamp(payment.failedAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {payment.payway ? (
                    <div className="mt-5 rounded-[1.25rem] border border-black/10 bg-white px-4 py-4 text-sm text-stone-700">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                          PayWay QR state
                        </p>
                        {statusPageHref ? (
                          <a
                            className="rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-50 transition hover:-translate-y-0.5"
                            href={statusPageHref}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open status page
                          </a>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-stone-950">
                            QR generation: {payment.payway.qrGenerationStatus ?? "Not recorded"}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                            Generated {formatTimestamp(payment.payway.qrGeneratedAt)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                            Expires {formatTimestamp(payment.payway.qrExpiresAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-stone-950">
                            Provider status: {payment.payway.latestProviderStatus ?? "Pending"}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                            Webhook {formatTimestamp(payment.payway.lastWebhookReceivedAt)}
                          </p>
                          <p className="mt-1 break-all text-xs text-stone-500">
                            Trace id: {payment.payway.qrTraceId ?? "Not supplied"}
                          </p>
                        </div>
                      </div>
                      {payment.payway.sandboxPlaceholder ? (
                        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Sandbox QR uses a placeholder ABA merchant payload. The normal ABA
                          mobile app will reject it until ABA enables a QR-payable sandbox
                          profile for this merchant.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              );
            })
          )}
        </div>
      </article>

      <aside className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
          Pending-state guide
        </p>
        <div className="mt-4 space-y-3 text-sm leading-7 text-stone-700">
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="font-semibold text-stone-950">QR generated ≠ paid</p>
            <p className="mt-2">
              A provider can return checkout success while the payment itself remains
              pending. Wait for a callback or reconciliation update before treating the
              order as paid.
            </p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="font-semibold text-stone-950">Use the provider event first</p>
            <p className="mt-2">
              If the latest event is missing, use the customer status page or the next
              reconciliation run to confirm whether the provider has moved the payment out
              of pending.
            </p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="font-semibold text-stone-950">Sandbox warning</p>
            <p className="mt-2">
              Placeholder PayWay QR payloads are a provider-side sandbox limitation, not a
              KhmerCart checkout success. Keep the order pending until ABA confirms a
              payable test profile.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
