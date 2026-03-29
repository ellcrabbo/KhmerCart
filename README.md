# KhmerCart

KhmerCart is a pnpm + Turborepo monorepo for a Cambodia-focused marketplace. It currently includes buyer, seller, admin, and API Next.js apps plus shared database, domain, and UI packages.

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
  buyer/    Buyer storefront, discovery feed, and PDP
  seller/   Seller onboarding and catalog management

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

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

3. Start local infrastructure:

   ```bash
   docker compose up -d
   ```

4. Apply database migrations:

   ```bash
   pnpm db:migrate
   ```

5. Seed local data:

   ```bash
   pnpm db:seed
   ```

6. Start the monorepo in dev mode:

   ```bash
   pnpm dev
   ```

## Local URLs

- Buyer app: [http://localhost:3000](http://localhost:3000)
- Seller app: [http://localhost:3001](http://localhost:3001)
- API app: [http://localhost:3002](http://localhost:3002)
- Admin app: [http://localhost:3003](http://localhost:3003)

## Health endpoints

- Buyer: [http://localhost:3000/health](http://localhost:3000/health)
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
pnpm db:seed
```

Run a single app:

```bash
pnpm --filter @khmercart/buyer dev
pnpm --filter @khmercart/seller dev
pnpm --filter @khmercart/api dev
pnpm --filter @khmercart/admin dev
```

## Environment

The main local configuration lives in [`.env.example`](./.env.example).

Important variables:

- `DATABASE_URL`
- `REDIS_URL`
- `SUPPORTED_CURRENCIES`
- `DEFAULT_LOCALE`
- `SUPPORTED_LOCALES`
- `AUTH_JWT_SECRET`
- `OTP_PROVIDER`
- `KYC_DOCUMENT_TYPES`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_KEY`
- `S3_SECRET`

The buyer app defaults to English and supports locale switching between English and Khmer.

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

## GitHub Actions

CI is defined in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

On pushes and pull requests to `main`, it:

- installs dependencies with pnpm
- boots PostgreSQL and Redis service containers
- runs Prisma migrations
- runs lint
- runs typecheck
- runs tests

## Current feature areas

- OTP auth with role-based access for buyer, seller, and admin flows
- Seller onboarding, KYC upload flow, and admin approval queue
- Product catalog, variants, inventory protection, and validation rules
- Buyer-facing discovery feed and product detail pages with locale scaffolding
