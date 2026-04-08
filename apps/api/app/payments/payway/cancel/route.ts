import { prisma } from "@khmercart/db";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId")?.trim();

  if (!orderId) {
    return htmlResponse("Missing orderId.", 400);
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId
    }
  });

  if (!order) {
    return htmlResponse("Order not found.", 404);
  }

  return htmlResponse(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(`PayWay cancelled | ${order.orderNumber}`)}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(239, 68, 68, 0.16), transparent 38%),
          linear-gradient(180deg, #fff7ed 0%, #ffffff 100%);
        color: #1c1917;
        font-family: "Geist", "Helvetica Neue", Arial, sans-serif;
      }
      article {
        width: min(42rem, calc(100vw - 2rem));
        border-radius: 1.75rem;
        border: 1px solid rgba(28, 25, 23, 0.08);
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 24px 60px rgba(153, 27, 27, 0.12);
        padding: 2rem;
      }
      .eyebrow {
        display: inline-flex;
        border-radius: 999px;
        background: rgba(239, 68, 68, 0.12);
        color: #991b1b;
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
        color: #b45309;
        font-weight: 700;
        text-decoration: none;
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
        background: #b45309;
        color: white;
        display: inline-flex;
        font-size: 0.95rem;
        font-weight: 700;
        justify-content: center;
        padding: 0.9rem 1.25rem;
      }
      .button-link.secondary {
        background: rgba(180, 83, 9, 0.08);
        color: #b45309;
      }
    </style>
  </head>
  <body>
    <article>
      <span class="eyebrow">Payment cancelled</span>
      <h1>PayWay checkout was not completed</h1>
      <p>
        Order <strong>${escapeHtml(order.orderNumber)}</strong> is still waiting for payment.
        The payment was not confirmed, so KhmerCart has left the order in a retryable state.
      </p>
      <div class="actions">
        <a class="button-link" href="/payments/payway/checkout/${escapeHtml(order.id)}">Retry checkout</a>
        <a class="button-link secondary" href="https://www.khmercart.shop">Back to KhmerCart</a>
      </div>
    </article>
  </body>
</html>`);
}
