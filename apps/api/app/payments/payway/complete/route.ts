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
  message: string;
  orderNumber: string;
  statusLabel: string;
  title: string;
}) {
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
        background:
          radial-gradient(circle at top, rgba(34, 197, 94, 0.14), transparent 38%),
          linear-gradient(180deg, #ecfdf5 0%, #fffbeb 100%);
        color: #1c1917;
        font-family: "Geist", "Helvetica Neue", Arial, sans-serif;
      }
      article {
        width: min(42rem, calc(100vw - 2rem));
        border-radius: 1.75rem;
        border: 1px solid rgba(28, 25, 23, 0.08);
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 24px 60px rgba(21, 128, 61, 0.12);
        padding: 2rem;
      }
      .eyebrow {
        display: inline-flex;
        border-radius: 999px;
        background: rgba(34, 197, 94, 0.12);
        color: #166534;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.24em;
        padding: 0.5rem 0.85rem;
        text-transform: uppercase;
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
      }
      .status {
        margin-top: 1rem;
        border-radius: 1rem;
        background: #f5f5f4;
        padding: 0.9rem 1rem;
        font-family: "Geist Mono", ui-monospace, monospace;
      }
    </style>
  </head>
  <body>
    <article>
      <span class="eyebrow">Payment returned</span>
      <h1>PayWay checkout finished</h1>
      <p>${escapeHtml(input.message)}</p>
      <div class="status">
        Order: ${escapeHtml(input.orderNumber)}<br />
        Current payment status: ${escapeHtml(input.statusLabel)}
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
  const statusLabel = payment?.status ?? "PENDING";
  const message =
    payment?.status === "SUCCEEDED"
      ? "Your payment was confirmed. KhmerCart has recorded the order and the seller can continue fulfillment."
      : "PayWay redirected back before KhmerCart saw a final success signal. If the status is still pending, wait a few seconds and refresh this page.";

  return htmlResponse(
    renderPage({
      message,
      orderNumber: order.orderNumber,
      statusLabel,
      title: `PayWay result | ${order.orderNumber}`
    })
  );
}
