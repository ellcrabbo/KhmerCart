# KhmerCart Release Readiness

## Mobile-first web smoke

Use the web storefront as the broad public launch surface. Test it at a phone viewport first.

1. Start the API and web apps.
   - `pnpm --filter @khmercart/api dev`
   - `pnpm --filter @khmercart/web dev`
2. Open `http://localhost:3000`.
3. Sign in from the buyer dock with `buyer@khmercart.local`.
4. Use the dev OTP shown by the local stub.
5. Open a product, add a variant to cart, then return to the buyer dock.
6. Confirm cart total, select `ABA PayWay`, place the order, and open the PayWay bridge.
7. Confirm the payment remains pending unless ABA sends a real provider callback.
8. Check saved products, followed sellers, and notifications from the account tab.

## PayWay sandbox notes

PayWay QR generation success is not payment confirmation.

- `PAYWAY_BASE_URL`: `https://checkout-sandbox.payway.com.kh`
- `PAYWAY_API_KEY`: ABA credential email field labeled `Public Key`
- `PAYWAY_MERCHANT_ID`: ABA merchant id
- Webhook endpoint: `/api/webhooks/payway`
- Browser completion page: `/payments/payway/complete?orderId=<orderId>`
- Checkout bridge: `/payments/payway/checkout/<orderId>`

Latest sandbox evidence to share with ABA:

- Transaction number / `tran_id`: `KC-07B45D19B056`
- Order id: `cmohgft18000243vdygmrsak0`
- QR trace id: `91027294bc9b72763d1c8defc0c8c089`
- QR generation status: `Success.`
- Local payment status: `PENDING`

If the QR payload is detected as the placeholder ABA sandbox merchant QR, the normal ABA app may reject it. Ask ABA to confirm whether the sandbox merchant profile is QR-payable or whether they need to issue a different sandbox credential set.

## Native mobile smoke

1. Confirm `apps/mobile/.env.local` points `EXPO_PUBLIC_API_BASE_URL` at the API.
2. Run `pnpm mobile:start` and `pnpm mobile:run:ios`.
3. Test buyer login, feed, product detail, cart, checkout, PayWay link open, order tracking, notifications, saved products, and followed sellers.
4. Build TestFlight only after the deployed API URL and mobile-first web checkout flow pass smoke.

## Preflight

Run this before demos or release builds:

```bash
pnpm release:preflight
pnpm e2e
pnpm vitest run tests/payway-provider.test.ts tests/payment-webhooks.test.ts --testTimeout=20000
pnpm typecheck
```

The preflight script reports missing env names only. It does not print secret values.
The local `pnpm e2e` command ensures the minimal demo fixture first so the checkout smoke starts from a known catalog and buyer account.

For deployed smoke runs, point the same Playwright suite at the public web URL:

```bash
PLAYWRIGHT_BASE_URL=https://<web-demo-domain> pnpm e2e
```
