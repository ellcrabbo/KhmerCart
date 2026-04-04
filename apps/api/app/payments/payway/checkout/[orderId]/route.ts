import {
  buildPaywayPurchaseForm,
  isPaywayConfigured,
  readPaymentsConfig,
  resolvePaywayPurchaseUrl
} from "@khmercart/core";
import { prisma } from "@khmercart/db";

export const runtime = "nodejs";

type CheckoutRouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type PaywayResponseRecord = Record<string, unknown>;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHtmlPage(input: {
  body: string;
  title: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Geist", "Helvetica Neue", Arial, sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top, rgba(245, 158, 11, 0.18), transparent 35%),
          linear-gradient(180deg, #fef7ed 0%, #fffaf2 48%, #ffffff 100%);
        color: #1c1917;
      }
      main {
        max-width: 44rem;
        margin: 0 auto;
        padding: 4rem 1.5rem;
      }
      .panel {
        border: 1px solid rgba(28, 25, 23, 0.08);
        border-radius: 1.75rem;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 24px 70px rgba(120, 53, 15, 0.12);
        padding: 2rem;
      }
      .eyebrow {
        display: inline-flex;
        padding: 0.5rem 0.85rem;
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.12);
        color: #9a3412;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.24em;
        text-transform: uppercase;
      }
      h1 {
        margin: 1rem 0 0;
        font-size: clamp(2rem, 5vw, 3rem);
        line-height: 1;
      }
      p {
        margin: 1rem 0 0;
        color: #57534e;
        line-height: 1.7;
      }
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-top: 1.5rem;
        border: 0;
        border-radius: 999px;
        background: #d97706;
        color: white;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        padding: 0.95rem 1.4rem;
      }
      button:hover {
        background: #b45309;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.9rem;
        margin-top: 1.5rem;
      }
      .button-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #d97706;
        color: white;
        font-weight: 700;
        padding: 0.95rem 1.4rem;
        text-decoration: none;
      }
      .button-link:hover {
        background: #b45309;
      }
      .button-link.secondary {
        background: rgba(217, 119, 6, 0.08);
        color: #9a3412;
      }
      .button-link.secondary:hover {
        background: rgba(217, 119, 6, 0.16);
      }
      pre {
        margin: 1.5rem 0 0;
        border-radius: 1rem;
        background: #1c1917;
        color: #fafaf9;
        overflow-x: auto;
        padding: 1rem;
        white-space: pre-wrap;
        word-break: break-all;
      }
      code {
        font-family: "Geist Mono", ui-monospace, SFMono-Regular, monospace;
        font-size: 0.9em;
      }
    </style>
  </head>
  <body>
    <main>${input.body}</main>
  </body>
</html>`;
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

function renderErrorPage(input: {
  code: string;
  message: string;
  status: number;
}): Response {
  return htmlResponse(
    renderHtmlPage({
      body: `
        <section class="panel">
          <span class="eyebrow">KhmerCart Payments</span>
          <h1>${escapeHtml(input.code)}</h1>
          <p>${escapeHtml(input.message)}</p>
        </section>
      `,
      title: `${input.code} | KhmerCart`
    }),
    input.status
  );
}

function readTextValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized ? normalized : null;
}

function readNestedTextValue(
  payload: PaywayResponseRecord,
  paths: string[]
): string | null {
  for (const path of paths) {
    const segments = path.split(".");
    let current: unknown = payload;

    for (const segment of segments) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        current = null;
        break;
      }

      current = (current as PaywayResponseRecord)[segment];
    }

    const resolved = readTextValue(current);

    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function parsePaywayJsonPayload(rawValue: string): PaywayResponseRecord | null {
  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as PaywayResponseRecord;
  } catch {
    return null;
  }
}

function injectBaseHref(html: string, baseHref: string): string {
  if (/<base\s/i.test(html)) {
    return html;
  }

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1><base href="${escapeHtml(baseHref)}" />`);
  }

  return html;
}

function renderQrFallbackPage(input: {
  deeplink: string | null;
  orderId: string;
  orderNumber: string;
  qrString: string | null;
  statusMessage: string | null;
}): Response {
  return htmlResponse(
    renderHtmlPage({
      body: `
        <section class="panel">
          <span class="eyebrow">KhmerCart Payments</span>
          <h1>Continue in ABA PayWay</h1>
          <p>
            PayWay returned a QR checkout for
            <strong>${escapeHtml(input.orderNumber)}</strong>. Open the checkout in ABA,
            or use the QR payload below if you need to complete it manually.
          </p>
          ${
            input.statusMessage
              ? `<p><strong>Status:</strong> ${escapeHtml(input.statusMessage)}</p>`
              : ""
          }
          <div class="actions">
            ${
              input.deeplink
                ? `<a class="button-link" href="${escapeHtml(input.deeplink)}">Open ABA Pay</a>`
                : ""
            }
            <a class="button-link secondary" href="/payments/payway/complete?orderId=${escapeHtml(input.orderId)}">
              Refresh payment status
            </a>
          </div>
          ${
            input.qrString
              ? `<pre><code>${escapeHtml(input.qrString)}</code></pre>`
              : ""
          }
        </section>
      `,
      title: `PayWay checkout | ${input.orderNumber}`
    })
  );
}

function readAddressDetails(value: unknown): {
  fullName: string | null;
  phone: string | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      fullName: null,
      phone: null
    };
  }

  const record = value as Record<string, unknown>;

  return {
    fullName:
      typeof record.fullName === "string" && record.fullName.trim()
        ? record.fullName.trim()
        : null,
    phone:
      typeof record.phone === "string" && record.phone.trim()
        ? record.phone.trim()
        : null
  };
}

export async function GET(request: Request, context: CheckoutRouteContext) {
  const { orderId } = await context.params;
  const order = await prisma.order.findUnique({
    include: {
      buyer: true,
      items: true,
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

  if (!order || order.paymentMethod !== "PAYWAY") {
    return renderErrorPage({
      code: "PAYMENT_NOT_FOUND",
      message: "That PayWay checkout session does not exist anymore.",
      status: 404
    });
  }

  const payment = order.payments[0] ?? null;

  if (!payment) {
    return renderErrorPage({
      code: "PAYMENT_NOT_READY",
      message: "The order exists, but its PayWay payment record has not been created yet.",
      status: 409
    });
  }

  const paymentsConfig = readPaymentsConfig(process.env);

  if (!isPaywayConfigured(paymentsConfig)) {
    return renderErrorPage({
      code: "PAYWAY_NOT_CONFIGURED",
      message:
        "PayWay merchant credentials are missing from the current environment.",
      status: 503
    });
  }

  if (payment.status === "SUCCEEDED") {
    const successUrl = new URL(request.url);
    successUrl.pathname = "/payments/payway/complete";
    successUrl.search = `orderId=${encodeURIComponent(order.id)}`;

    return Response.redirect(successUrl, 302);
  }

  if (payment.status === "FAILED" || payment.status === "CANCELLED") {
    const cancelUrl = new URL(request.url);
    cancelUrl.pathname = "/payments/payway/cancel";
    cancelUrl.search = `orderId=${encodeURIComponent(order.id)}`;

    return Response.redirect(cancelUrl, 302);
  }

  const shippingAddress = readAddressDetails(order.shippingAddress);
  const purchaseForm = buildPaywayPurchaseForm({
    amountMinor: order.totalMinor,
    apiKey: paymentsConfig.payway.apiKey!.trim(),
    currency: order.currency,
    customerEmail: order.buyer.email,
    customerFullName: shippingAddress.fullName ?? order.buyer.fullName,
    customerPhone: shippingAddress.phone ?? order.buyer.phone,
    items: order.items.map((item) => ({
      currency: item.currency,
      name: `${item.productName} · ${item.variantName}`,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor
    })),
    merchantId: paymentsConfig.payway.merchantId!.trim(),
    orderId: order.id,
    orderNumber: order.orderNumber,
    purchaseUrl:
      payment.metadata &&
      typeof payment.metadata === "object" &&
      !Array.isArray(payment.metadata) &&
      typeof (payment.metadata as Record<string, unknown>).purchaseUrl === "string"
        ? ((payment.metadata as Record<string, unknown>).purchaseUrl as string)
        : resolvePaywayPurchaseUrl(paymentsConfig),
    shippingMinor: order.shippingMinor,
    webhookBaseUrl: paymentsConfig.webhookBaseUrl
  });

  const purchaseRequestBody = new URLSearchParams();

  for (const [name, value] of Object.entries(purchaseForm.fields)) {
    purchaseRequestBody.set(name, value);
  }

  let paywayResponse: Response;

  try {
    paywayResponse = await fetch(purchaseForm.actionUrl, {
      body: purchaseRequestBody,
      cache: "no-store",
      headers: {
        accept: "text/html,application/json",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      method: "POST",
      redirect: "follow"
    });
  } catch {
    return renderErrorPage({
      code: "PAYWAY_UNAVAILABLE",
      message: "We could not reach ABA PayWay. Please try again in a moment.",
      status: 502
    });
  }

  const responseText = await paywayResponse.text();
  const contentType = (paywayResponse.headers.get("content-type") ?? "").toLowerCase();
  const payload =
    contentType.includes("application/json") || responseText.trim().startsWith("{")
      ? parsePaywayJsonPayload(responseText)
      : null;

  if (payload) {
    const checkoutQrUrl = readNestedTextValue(payload, [
      "checkout_qr_url",
      "checkoutUrl",
      "checkout_url",
      "data.checkout_qr_url",
      "data.checkoutUrl",
      "data.checkout_url"
    ]);
    const deeplink = readNestedTextValue(payload, [
      "abapay_deeplink",
      "data.abapay_deeplink",
      "checkout_deeplink",
      "data.checkout_deeplink"
    ]);
    const qrString = readNestedTextValue(payload, [
      "qrString",
      "qr_string",
      "data.qrString",
      "data.qr_string"
    ]);
    const statusCode = readNestedTextValue(payload, [
      "status.code",
      "statusCode",
      "status_code",
      "data.status.code"
    ]);
    const statusMessage = readNestedTextValue(payload, [
      "status.message",
      "message",
      "description",
      "data.status.message"
    ]);

    if (checkoutQrUrl) {
      return Response.redirect(checkoutQrUrl, 302);
    }

    if (paywayResponse.ok && (deeplink || qrString)) {
      return renderQrFallbackPage({
        deeplink,
        orderId: order.id,
        orderNumber: order.orderNumber,
        qrString,
        statusMessage
      });
    }

    return renderErrorPage({
      code: statusCode ? `PAYWAY_${statusCode}` : "PAYWAY_RESPONSE_ERROR",
      message:
        statusMessage ??
        "ABA PayWay returned an unexpected purchase response for this order.",
      status: paywayResponse.ok ? 502 : paywayResponse.status
    });
  }

  if (contentType.includes("text/html") || /<!doctype html|<html/i.test(responseText)) {
    return htmlResponse(
      injectBaseHref(responseText, `${new URL(purchaseForm.actionUrl).origin}/`)
    );
  }

  return renderErrorPage({
    code: "PAYWAY_RESPONSE_ERROR",
    message:
      "ABA PayWay returned an unexpected checkout payload. Please try again in a moment.",
    status: paywayResponse.ok ? 502 : paywayResponse.status
  });
}
