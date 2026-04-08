import { detectPaywaySandboxPlaceholderQr } from "@khmercart/core";
import { prisma, reconcileProviderPaymentByOrderId } from "@khmercart/db";

export const runtime = "nodejs";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readJsonText(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();

    return normalized || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function readNestedJsonText(
  payload: Record<string, unknown> | null,
  paths: string[]
): string | null {
  if (!payload) {
    return null;
  }

  for (const path of paths) {
    const segments = path.split(".");
    let current: unknown = payload;

    for (const segment of segments) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        current = null;
        break;
      }

      current = (current as Record<string, unknown>)[segment];
    }

    const resolved = readJsonText(current);

    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8"
    },
    status
  });
}

function renderPage(input: {
  checkoutHref: string | null;
  lastReconciledAt: string | null;
  lastWebhookReceivedAt: string | null;
  message: string;
  orderNumber: string;
  providerPaymentId: string | null;
  providerReference: string | null;
  providerStatus: string | null;
  qrTraceId: string | null;
  sandboxWarning: string | null;
  statusLabel: string;
  title: string;
  tone: "failed" | "pending" | "success";
}) {
  const tone = {
    badge:
      input.tone === "success"
        ? "background: rgba(34, 197, 94, 0.12); color: #166534;"
        : input.tone === "failed"
          ? "background: rgba(239, 68, 68, 0.12); color: #991b1b;"
          : "background: rgba(245, 158, 11, 0.12); color: #9a3412;",
    background:
      input.tone === "success"
        ? "radial-gradient(circle at top, rgba(34, 197, 94, 0.14), transparent 38%), linear-gradient(180deg, #ecfdf5 0%, #fffbeb 100%)"
        : input.tone === "failed"
          ? "radial-gradient(circle at top, rgba(239, 68, 68, 0.16), transparent 38%), linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)"
          : "radial-gradient(circle at top, rgba(245, 158, 11, 0.16), transparent 38%), linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)"
  };

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: ${tone.background};
        color: #1c1917;
        font-family: "Geist", "Helvetica Neue", Arial, sans-serif;
      }
      article {
        width: min(48rem, calc(100vw - 2rem));
        border-radius: 1.75rem;
        border: 1px solid rgba(28, 25, 23, 0.08);
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 24px 60px rgba(16, 24, 40, 0.12);
        padding: 2rem;
      }
      .eyebrow {
        display: inline-flex;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.24em;
        padding: 0.5rem 0.85rem;
        text-transform: uppercase;
        ${tone.badge}
      }
      h1 {
        margin: 1rem 0 0;
        font-size: clamp(2rem, 5vw, 3rem);
      }
      p {
        color: #57534e;
        line-height: 1.7;
      }
      a {
        color: #166534;
        font-weight: 700;
        text-decoration: none;
      }
      .status-grid {
        margin-top: 1rem;
        display: grid;
        gap: 0.9rem;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
      }
      .status-card {
        border-radius: 1rem;
        background: #f5f5f4;
        padding: 0.9rem 1rem;
      }
      .label {
        color: #78716c;
        display: block;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }
      .value {
        display: block;
        font-family: "Geist Mono", ui-monospace, monospace;
        font-size: 0.95rem;
        margin-top: 0.6rem;
        word-break: break-word;
      }
      .warning {
        margin-top: 1rem;
        border-radius: 1rem;
        border: 1px solid rgba(194, 65, 12, 0.18);
        background: rgba(255, 237, 213, 0.78);
        color: #9a3412;
        padding: 1rem 1.1rem;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.9rem;
        margin-top: 1.4rem;
      }
      .button-link {
        align-items: center;
        border-radius: 999px;
        background: #166534;
        color: white;
        display: inline-flex;
        font-size: 0.95rem;
        font-weight: 700;
        justify-content: center;
        padding: 0.9rem 1.25rem;
      }
      .button-link.secondary {
        background: rgba(22, 101, 52, 0.08);
        color: #166534;
      }
    </style>
  </head>
  <body>
    <article>
      <span class="eyebrow">Payment status</span>
      <h1>PayWay checkout finished</h1>
      <p>${escapeHtml(input.message)}</p>
      ${
        input.sandboxWarning
          ? `<div class="warning">${escapeHtml(input.sandboxWarning)}</div>`
          : ""
      }
      <div class="status-grid">
        <div class="status-card">
          <span class="label">Order</span>
          <span class="value">${escapeHtml(input.orderNumber)}</span>
        </div>
        <div class="status-card">
          <span class="label">Payment status</span>
          <span class="value">${escapeHtml(input.statusLabel)}</span>
        </div>
        <div class="status-card">
          <span class="label">Provider status</span>
          <span class="value">${escapeHtml(input.providerStatus ?? "Pending")}</span>
        </div>
        <div class="status-card">
          <span class="label">Provider payment id</span>
          <span class="value">${escapeHtml(input.providerPaymentId ?? "Not assigned yet")}</span>
        </div>
        <div class="status-card">
          <span class="label">Provider reference</span>
          <span class="value">${escapeHtml(input.providerReference ?? "Not assigned yet")}</span>
        </div>
        <div class="status-card">
          <span class="label">Last webhook</span>
          <span class="value">${escapeHtml(formatTimestamp(input.lastWebhookReceivedAt))}</span>
        </div>
        <div class="status-card">
          <span class="label">Last reconcile</span>
          <span class="value">${escapeHtml(formatTimestamp(input.lastReconciledAt))}</span>
        </div>
        <div class="status-card">
          <span class="label">Trace id</span>
          <span class="value">${escapeHtml(input.qrTraceId ?? "Not supplied")}</span>
        </div>
      </div>
      <div class="actions">
        <a class="button-link secondary" href="">Refresh status</a>
        ${
          input.checkoutHref
            ? `<a class="button-link" href="${escapeHtml(input.checkoutHref)}">Return to checkout</a>`
            : ""
        }
      </div>
      <p>
        You can close this page or head back to
        <a href="https://www.khmercart.shop">KhmerCart</a>.
      </p>
    </article>
  </body>
</html>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId")?.trim();

  if (!orderId) {
    return htmlResponse("Missing orderId.", 400);
  }

  const order = await prisma.order.findUnique({
    include: {
      payments: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1,
        where: {
          provider: "PAYWAY"
        }
      }
    },
    where: {
      id: orderId
    }
  });

  if (!order) {
    return htmlResponse("Order not found.", 404);
  }

  const latestPayment = order.payments[0] ?? null;

  if (
    latestPayment &&
    (latestPayment.status === "PENDING" ||
      latestPayment.status === "PROCESSING" ||
      latestPayment.status === "AUTHORIZED")
  ) {
    await reconcileProviderPaymentByOrderId({
      orderId: order.id,
      provider: "PAYWAY"
    });
  }

  const refreshedOrder = await prisma.order.findUnique({
    include: {
      payments: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1,
        where: {
          provider: "PAYWAY"
        }
      }
    },
    where: {
      id: order.id
    }
  });

  const payment = refreshedOrder?.payments[0] ?? latestPayment;
  const metadata = readJsonRecord(payment?.metadata);
  const checkoutSession = readJsonRecord(metadata?.paywayCheckoutSession);
  const qrString = readNestedJsonText(checkoutSession, ["qrString"]);
  const sandboxWarning = detectPaywaySandboxPlaceholderQr(qrString)
    ? "PayWay sandbox generated a placeholder ABA merchant QR payload for this order, so the normal ABA mobile app will reject it with “Transaction not found”. KhmerCart is still waiting for a real payment callback."
    : null;
  const statusLabel = payment?.status ?? "PENDING";
  const providerStatus = readNestedJsonText(metadata, [
    "providerStatus",
    "paywayCheckTransaction.payment_status",
    "paywayCheckTransaction.payment_status_code"
  ]);
  const lastWebhookReceivedAt = readNestedJsonText(metadata, ["latestWebhookReceivedAt"]);
  const lastReconciliationRunAt = readNestedJsonText(metadata, [
    "lastReconciliationRunAt"
  ]);
  const qrTraceId = readNestedJsonText(checkoutSession, ["traceId"]);
  const checkoutHref =
    payment?.checkoutUrl ?? `${new URL(request.url).origin}/payments/payway/checkout/${encodeURIComponent(order.id)}`;

  const tone =
    payment?.status === "SUCCEEDED"
      ? "success"
      : payment?.status === "FAILED" ||
          payment?.status === "CANCELLED" ||
          payment?.status === "EXPIRED"
        ? "failed"
        : "pending";
  const message =
    payment?.status === "SUCCEEDED"
      ? "Your payment was confirmed. KhmerCart has recorded the order and the seller can continue fulfillment."
      : payment?.status === "FAILED" ||
          payment?.status === "CANCELLED" ||
          payment?.status === "EXPIRED"
        ? "PayWay did not complete this payment. You can return to the checkout bridge and try again."
        : "KhmerCart is still waiting for ABA to confirm this payment. Refresh this page after the provider callback lands, or reopen the checkout bridge if the buyer still needs to complete the payment.";

  return htmlResponse(
    renderPage({
      checkoutHref,
      lastReconciledAt: payment?.lastReconciledAt
        ? payment.lastReconciledAt.toISOString()
        : lastReconciliationRunAt,
      lastWebhookReceivedAt,
      message,
      orderNumber: order.orderNumber,
      providerPaymentId: payment?.providerPaymentId ?? null,
      providerReference: payment?.providerReference ?? null,
      providerStatus,
      qrTraceId,
      sandboxWarning,
      statusLabel,
      title: `PayWay result | ${order.orderNumber}`,
      tone
    })
  );
}
