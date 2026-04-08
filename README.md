# KhmerCart

KhmerCart is a pnpm + Turborepo monorepo for a Cambodia-focused marketplace. It now separates the customer-facing surface into a web storefront and a mobile app, alongside seller, admin, and API apps plus shared database, domain, and UI packages.

## Stack

- `pnpm` workspaces
- `turbo` task orchestration
- `Next.js` App Router + TypeScript
- `Prisma` + PostgreSQL
- `Redis`
- `Tailwind CSS`
- `ESLint` + `Prettier`
- `Vitest`

## Monorepo layout

```text
apps/
  admin/    Admin review and seller approval UI
  api/      Auth and backend-facing API routes
  mobile/   Expo React Native iOS/mobile app
  seller/   Seller onboarding and catalog management
  web/      Web storefront, discovery feed, and PDP

packages/
  core/     Shared auth, catalog, seller, and health logic
  db/       Prisma client, database services, storage helpers
  ui/       Shared React UI primitives

prisma/
  schema.prisma
  migrations/
  seed.ts
```

## Prerequisites

- Node.js `20+`
- `pnpm` `10.33.0`
- Docker with Compose

## Quick start

1. Copy the environment template:

   ```bash
   cp .env.example .env.local
   cp .env.test.example .env.test
   ```

2. Start local infrastructure:

   ```bash
   docker compose up -d
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Apply database migrations:

   ```bash
   pnpm db:migrate
   ```

5. Seed local data:

   ```bash
   pnpm db:seed
   ```

6. Start the web/API/admin/seller apps in dev mode:

   ```bash
   pnpm dev
   ```

Fresh clone validation path:

```bash
docker compose up -d
pnpm install
pnpm db:migrate
pnpm test
```

## Local URLs

- Web app: [http://localhost:3000](http://localhost:3000)
- Seller app: [http://localhost:3001](http://localhost:3001)
- API app: [http://localhost:3002](http://localhost:3002)
- Admin app: [http://localhost:3003](http://localhost:3003)

## Health endpoints

- Web: [http://localhost:3000/health](http://localhost:3000/health)
- Seller: [http://localhost:3001/health](http://localhost:3001/health)
- API: [http://localhost:3002/health](http://localhost:3002/health)
- API JSON health: [http://localhost:3002/api/health](http://localhost:3002/api/health)
- Admin: [http://localhost:3003/health](http://localhost:3003/health)

## Common commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm db:migrate
pnpm db:reset
pnpm db:seed
```

Run a single app:

```bash
pnpm --filter @khmercart/web dev
pnpm --filter @khmercart/seller dev
pnpm --filter @khmercart/api dev
pnpm --filter @khmercart/admin dev
```

Run the mobile app separately:

```bash
pnpm mobile:start
pnpm mobile:ios
pnpm mobile:run:ios
```

For the iOS simulator, `pnpm mobile:start` now runs the Expo dev client server on `localhost`, which is more reliable than LAN mode for the simulator. For a physical device on your Wi‑Fi network, use:

```bash
pnpm --filter @khmercart/mobile start:lan
```

Mobile environment:

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

- `EXPO_PUBLIC_API_BASE_URL` defaults to `http://127.0.0.1:3002` for the iOS simulator.
- On a physical device, replace it with your Mac's LAN IP.
- The mobile app currently covers buyer discovery, product detail, locale toggle, and OTP-backed buyer session restore.

## iOS release flow

Local native iOS build:

```bash
pnpm mobile:run:ios
```

Cloud build for TestFlight/App Store:

```bash
pnpm mobile:build:ios
```

Submit an existing iOS build to App Store Connect:

```bash
pnpm mobile:submit:ios
```

Notes:

- The EAS commands use `pnpm dlx eas-cli@16.20.0`, so you do not need a separate global `eas` install.
- You must be logged into Expo/EAS and Apple Developer for cloud builds and TestFlight submission.
- Before shipping, confirm the production mobile API URL in `apps/mobile/.env.local` or the corresponding EAS environment.
- The current iOS bundle identifier is `com.khmercart.mobile`.
- The generated native iOS project lives in `apps/mobile/ios`.

## Environment

Recommended local layout:

- [`.env.local`](./.env.example): app runtime values for local development or Vercel-pulled values via `vercel env pull`
- [`.env.test`](./.env.test.example): local Docker/test defaults for Vitest and safe local database workflows
- [`.env`](./.env.example): legacy fallback only; avoid relying on it for new setup

Setup:

```bash
cp .env.example .env.local
cp .env.test.example .env.test
```

Behavior:

- DB helper scripts like `pnpm db:migrate` load `.env.local` first, then `.env`
- tests prefer `.env.test.local`, then `.env.test`, then `.env`, then `.env.local`
- Vercel CLI writes pulled project secrets into `.env.local`

Important variables:

- `DATABASE_URL`
- `REDIS_URL`
- `SUPPORTED_CURRENCIES`
- `DEFAULT_LOCALE`
- `SUPPORTED_LOCALES`
- `AUTH_JWT_SECRET`
- `OTP_PROVIDER`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `AUTH_OTP_REQUEST_LIMIT`
- `AUTH_OTP_REQUEST_IP_LIMIT`
- `AUTH_OTP_VERIFY_LIMIT`
- `AUTH_OTP_VERIFY_IP_LIMIT`
- `KYC_DOCUMENT_TYPES`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_KEY`
- `S3_SECRET`
- `WEBHOOK_BASE_URL`
- `PAYWAY_BASE_URL`
- `PAYWAY_MERCHANT_ID`
- `PAYWAY_API_KEY`

The web storefront defaults to English and supports locale switching between English and Khmer.

PayWay notes:

- `PAYWAY_BASE_URL` should be the PayWay checkout host, not a fabricated local URL.
  - Sandbox: `https://checkout-sandbox.payway.com.kh`
  - Production: `https://checkout.payway.com.kh`
- `PAYWAY_API_KEY` is the PayWay HMAC signing key labeled as the `Public Key` in ABA’s merchant credential email.
- `PAYWAY_MERCHANT_ID` is the merchant id from the same credential bundle.
- `PAYWAY_WEBHOOK_SECRET` is optional, but if ABA has enabled signed pushbacks for your profile, set it so `/api/webhooks/payway` can verify `x-payway-hmac-sha512`.
- KhmerCart now opens PayWay through an API-domain handoff page that auto-posts the official purchase form, then uses:
  - `/api/webhooks/payway` for PayWay pushback notifications
  - `/payments/payway/complete` for the browser success return
  - `/payments/payway/cancel` for browser cancellations

Real OTP delivery:

- Keep `OTP_PROVIDER=DEV_STUB` for local/demo flows that surface the code in the UI.
- Set `OTP_PROVIDER=REAL` in Vercel to enable actual delivery.
- Cheapest rollout: use email OTP everywhere first and leave the Twilio variables empty.
- Phone identifiers are delivered through Twilio SMS using:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`
- Email identifiers are delivered through Resend using:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
- OTP delivery now applies both identifier and IP throttles. The default starter values are:
  - `AUTH_OTP_REQUEST_LIMIT=5`
  - `AUTH_OTP_REQUEST_IP_LIMIT=20`
  - `AUTH_OTP_VERIFY_LIMIT=5`
  - `AUTH_OTP_VERIFY_IP_LIMIT=20`
- The admin console now includes an `Accounts` section for safe email/role updates plus live OTP abuse visibility from recent rate-limit buckets and challenges.
- Seeded demo emails:
  - `admin@khmercart.local`
  - `buyer@khmercart.local`
  - `mekong-crafts@khmercart.local`
  - `tonle-gourmet@khmercart.local`
  - `pending-seller@khmercart.local`

## Database workflow

Generate Prisma client:

```bash
pnpm db:generate
```

Deploy migrations:

```bash
pnpm db:migrate
```

Seed repeatable fixture data:

```bash
pnpm db:seed
```

Reset the local database, re-apply migrations, and re-run seed data:

```bash
pnpm db:reset
```

## Migration runbook

Create a new local migration after editing the Prisma schema:

```bash
pnpm exec prisma migrate dev --name <migration_name>
```

Deploy committed migrations into the current database:

```bash
pnpm db:migrate
```

Verify the result locally with seed and tests:

```bash
pnpm db:seed
pnpm test
```

Rollback guidance:

- Prefer a forward fix migration instead of editing an already-applied migration.
- For local-only recovery, use `pnpm db:reset`.
- For shared or production databases, restore from backup or manually revert the SQL change, then mark migration state with `pnpm exec prisma migrate resolve ...` only after the database has been corrected.

## GitHub Actions

CI is defined in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

On pushes and pull requests to `main`, it:

- installs dependencies with pnpm
- boots PostgreSQL and Redis service containers
- migrates a clean test database
- runs lint
- runs typecheck
- runs unit and integration tests

## Current feature areas

- OTP auth with role-based access for buyer, seller, and admin flows
- Seller onboarding, KYC upload flow, and admin approval queue
- Product catalog, variants, inventory protection, and validation rules
- Buyer-facing discovery feed and product detail pages with locale scaffolding
