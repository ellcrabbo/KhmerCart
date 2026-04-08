import QRCode from "qrcode";
import {
  buildPaywayQrRequest,
  detectPaywaySandboxPlaceholderQr,
  isPaywayConfigured,
  readPaymentsConfig,
  resolvePaywayGenerateQrUrl
} from "@khmercart/core";
import { prisma } from "@khmercart/db";
import type { Prisma } from "@khmercart/db/prisma-client";

export const runtime = "nodejs";

type CheckoutRouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type PaywayResponseRecord = Record<string, unknown>;

type CachedPaywayCheckoutSession = {
  checkoutQrUrl: string | null;
  deeplink: string | null;
  expiresAt: string | null;
  generatedAt: string | null;
  qrImage: string | null;
  qrString: string | null;
  statusMessage: string | null;
  traceId: string | null;
};

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
      .qr-shell {
        margin-top: 1.75rem;
        display: grid;
        gap: 0.9rem;
        justify-items: center;
      }
      .qr-card {
        display: inline-flex;
        border-radius: 1.5rem;
        background: white;
        border: 1px solid rgba(28, 25, 23, 0.08);
        box-shadow: 0 16px 35px rgba(120, 53, 15, 0.12);
        padding: 1rem;
      }
      .qr-card svg {
        display: block;
        height: auto;
        width: min(100%, 18rem);
      }
      .qr-caption {
        margin: 0;
        text-align: center;
      }
      .warning {
        margin-top: 1rem;
        border-radius: 1rem;
        border: 1px solid rgba(194, 65, 12, 0.18);
        background: rgba(255, 237, 213, 0.78);
        color: #9a3412;
        padding: 1rem 1.1rem;
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

async function renderQrFallbackPage(input: {
  deeplink: string | null;
  orderId: string;
  orderNumber: string;
  qrImage: string | null;
  qrString: string | null;
  sandboxWarning: string | null;
  statusMessage: string | null;
}): Promise<Response> {
  let qrSvg: string | null = null;

  if (input.qrString) {
    try {
      qrSvg = await QRCode.toString(input.qrString, {
        errorCorrectionLevel: "M",
        margin: 1,
        type: "svg",
        width: 320
      });
    } catch {
      qrSvg = null;
    }
  }

  return htmlResponse(
    renderHtmlPage({
      body: `
        <section class="panel">
          <span class="eyebrow">KhmerCart Payments</span>
          <h1>Continue in ABA PayWay</h1>
          <p>
            PayWay generated a QR checkout for
            <strong>${escapeHtml(input.orderNumber)}</strong>. This only means the QR was
            created. KhmerCart will keep the payment pending until ABA confirms the
            charge.
          </p>
          ${
            input.statusMessage
              ? `<p><strong>QR generation:</strong> ${escapeHtml(input.statusMessage)}</p>`
              : ""
          }
          <p><strong>Current payment status:</strong> Awaiting payment confirmation.</p>
          ${
            input.sandboxWarning
              ? `<div class="warning">${escapeHtml(input.sandboxWarning)}</div>`
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
            input.qrImage || qrSvg
              ? `
                <div class="qr-shell">
                  <div class="qr-card" aria-label="ABA PayWay QR code">
                    ${
                      input.qrImage
                        ? `<img src="${escapeHtml(input.qrImage)}" alt="ABA PayWay QR code" style="display:block;width:min(100%,18rem);height:auto" />`
                        : qrSvg
                    }
                  </div>
                  <p class="qr-caption">Scan this QR in the ABA mobile app if the deeplink does not open.</p>
                </div>
              `
              : ""
          }
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

function readPaymentMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readCachedCheckoutSession(
  metadata: Record<string, unknown> | null
): CachedPaywayCheckoutSession | null {
  if (!metadata) {
    return null;
  }

  const rawSession = metadata.paywayCheckoutSession;

  if (!rawSession || typeof rawSession !== "object" || Array.isArray(rawSession)) {
    return null;
  }

  const session = rawSession as Record<string, unknown>;

  return {
    checkoutQrUrl: readTextValue(session.checkoutQrUrl),
    deeplink: readTextValue(session.deeplink),
    expiresAt: readTextValue(session.expiresAt),
    generatedAt: readTextValue(session.generatedAt),
    qrImage: readTextValue(session.qrImage),
    qrString: readTextValue(session.qrString),
    statusMessage: readTextValue(session.statusMessage),
    traceId: readTextValue(session.traceId)
  };
}

function isCachedCheckoutSessionFresh(
  session: CachedPaywayCheckoutSession | null,
  now = new Date()
): session is CachedPaywayCheckoutSession {
  if (!session) {
    return false;
  }

  if (!session.expiresAt) {
    return true;
  }

  const expiresAt = Date.parse(session.expiresAt);

  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

function buildCachedCheckoutMetadata(input: {
  checkoutQrUrl: string | null;
  deeplink: string | null;
  lifetimeMinutes: number;
  qrImage: string | null;
  qrString: string | null;
  statusMessage: string | null;
  traceId: string | null;
}): Prisma.InputJsonObject {
  const generatedAt = new Date();
  const expiresAt = new Date(
    generatedAt.getTime() + Math.max(input.lifetimeMinutes, 1) * 60 * 1000
  );

  return {
    checkoutQrUrl: input.checkoutQrUrl,
    deeplink: input.deeplink,
    expiresAt: expiresAt.toISOString(),
    generatedAt: generatedAt.toISOString(),
    qrImage: input.qrImage,
    qrString: input.qrString,
    statusMessage: input.statusMessage,
    traceId: input.traceId
  };
}

function buildSandboxWarning(qrString: string | null): string | null {
  if (!detectPaywaySandboxPlaceholderQr(qrString)) {
    return null;
  }

  return "PayWay sandbox returned a placeholder ABA merchant QR payload for this order, so the normal ABA mobile app will reject it with “Transaction not found”. KhmerCart is still waiting for a real payment callback. To run a true scan-and-pay test, ABA needs to enable a QR-payable sandbox profile for this merchant or provide production-ready QR credentials.";
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
  const metadata = readPaymentMetadata(payment.metadata);
  const cachedCheckoutSession = readCachedCheckoutSession(metadata);

  if (isCachedCheckoutSessionFresh(cachedCheckoutSession)) {
    if (cachedCheckoutSession.checkoutQrUrl) {
      return Response.redirect(cachedCheckoutSession.checkoutQrUrl, 302);
    }

    return renderQrFallbackPage({
      deeplink: cachedCheckoutSession.deeplink,
      orderId: order.id,
      orderNumber: order.orderNumber,
      qrImage: cachedCheckoutSession.qrImage,
      qrString: cachedCheckoutSession.qrString,
      sandboxWarning: buildSandboxWarning(cachedCheckoutSession.qrString),
      statusMessage: cachedCheckoutSession.statusMessage
    });
  }

  const qrRequest = buildPaywayQrRequest({
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
    paymentOption:
      metadata && typeof metadata.paymentOption === "string"
        ? metadata.paymentOption
        : null,
    qrImageTemplate:
      metadata && typeof metadata.qrImageTemplate === "string"
        ? metadata.qrImageTemplate
        : null,
    qrUrl:
      metadata && typeof metadata.generateQrUrl === "string"
        ? metadata.generateQrUrl
        : metadata && typeof metadata.purchaseUrl === "string"
          ? String(metadata.purchaseUrl).replace(
              /\/api\/payment-gateway\/v1\/payments\/purchase$/,
              "/api/payment-gateway/v1/payments/generate-qr"
            )
          : resolvePaywayGenerateQrUrl(paymentsConfig),
    webhookBaseUrl: paymentsConfig.webhookBaseUrl
  });

  let paywayResponse: Response;

  try {
    paywayResponse = await fetch(qrRequest.actionUrl, {
      body: JSON.stringify(qrRequest.body),
      cache: "no-store",
      headers: {
        accept: "application/json,text/html",
        "content-type": "application/json"
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
    const qrImage = readNestedTextValue(payload, [
      "qrImage",
      "qr_image",
      "data.qrImage",
      "data.qr_image"
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
    const traceId = readNestedTextValue(payload, [
      "status.trace_id",
      "trace_id",
      "data.status.trace_id"
    ]);
    const lifetimeMinutes =
      typeof qrRequest.body.lifetime === "number" && Number.isFinite(qrRequest.body.lifetime)
        ? qrRequest.body.lifetime
        : 60;

    const nextMetadata = {
      ...(metadata ?? {}),
      paywayCheckoutSession: buildCachedCheckoutMetadata({
        checkoutQrUrl,
        deeplink,
        lifetimeMinutes,
        qrImage,
        qrString,
        statusMessage,
        traceId
      })
    } satisfies Prisma.InputJsonObject;

    if (checkoutQrUrl) {
      await prisma.payment.update({
        data: {
          metadata: nextMetadata
        },
        where: {
          id: payment.id
        }
      });

      return Response.redirect(checkoutQrUrl, 302);
    }

    if (paywayResponse.ok && (deeplink || qrImage || qrString)) {
      await prisma.payment.update({
        data: {
          metadata: nextMetadata
        },
        where: {
          id: payment.id
        }
      });

      return renderQrFallbackPage({
        deeplink,
        orderId: order.id,
        orderNumber: order.orderNumber,
        qrImage,
        qrString,
        sandboxWarning: buildSandboxWarning(qrString),
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
      injectBaseHref(responseText, `${new URL(qrRequest.actionUrl).origin}/`)
    );
  }

  return renderErrorPage({
    code: "PAYWAY_RESPONSE_ERROR",
    message:
      "ABA PayWay returned an unexpected checkout payload. Please try again in a moment.",
    status: paywayResponse.ok ? 502 : paywayResponse.status
  });
}
