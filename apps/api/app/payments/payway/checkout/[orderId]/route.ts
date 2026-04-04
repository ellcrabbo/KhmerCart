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

  const hiddenInputs = Object.entries(purchaseForm.fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`
    )
    .join("");

  return htmlResponse(
    renderHtmlPage({
      body: `
        <section class="panel">
          <span class="eyebrow">KhmerCart Payments</span>
          <h1>Redirecting you to ABA PayWay</h1>
          <p>
            We are opening the hosted PayWay checkout for
            <strong>${escapeHtml(order.orderNumber)}</strong>. If nothing happens in a
            moment, use the button below.
          </p>
          <form id="payway-checkout-form" method="POST" action="${escapeHtml(
            purchaseForm.actionUrl
          )}">
            ${hiddenInputs}
            <button type="submit">Continue to PayWay</button>
          </form>
        </section>
        <script>
          window.setTimeout(function () {
            var form = document.getElementById("payway-checkout-form");
            if (form) {
              form.submit();
            }
          }, 120);
        </script>
      `,
      title: `PayWay checkout | ${order.orderNumber}`
    })
  );
}
