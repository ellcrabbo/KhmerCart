import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const envTargets = [
  {
    label: "root",
    path: ".env.local",
    required: [
      "DATABASE_URL",
      "AUTH_JWT_SECRET",
      "PAYMENTS_ENV",
      "PAYMENT_METHODS",
      "WEBHOOK_BASE_URL",
      "PAYWAY_BASE_URL",
      "PAYWAY_MERCHANT_ID",
      "PAYWAY_API_KEY"
    ]
  },
  {
    label: "api",
    path: "apps/api/.env.local",
    required: [
      "DATABASE_URL",
      "AUTH_JWT_SECRET",
      "PAYMENTS_ENV",
      "PAYMENT_METHODS",
      "WEBHOOK_BASE_URL",
      "PAYWAY_BASE_URL",
      "PAYWAY_MERCHANT_ID",
      "PAYWAY_API_KEY"
    ]
  },
  {
    label: "web",
    path: "apps/web/.env.local",
    required: ["DATABASE_URL", "AUTH_JWT_SECRET", "SUPPORTED_LOCALES"]
  },
  {
    label: "mobile",
    path: "apps/mobile/.env.local",
    required: ["EXPO_PUBLIC_API_BASE_URL"]
  }
];

function parseEnvFile(path) {
  const fullPath = join(root, path);

  if (!existsSync(fullPath)) {
    return null;
  }

  const entries = new Map();
  const lines = readFileSync(fullPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);

    if (!match) {
      continue;
    }

    const value = match[2]?.replace(/^['"]|['"]$/g, "").trim() ?? "";

    entries.set(match[1], value);
  }

  return entries;
}

let hasFailure = false;

for (const target of envTargets) {
  const entries = parseEnvFile(target.path);

  if (!entries) {
    hasFailure = true;
    console.log(`${target.label}: missing ${target.path}`);
    continue;
  }

  const missing = target.required.filter((key) => !entries.get(key));
  const postgresUrls = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"]
    .map((key) => entries.get(key))
    .filter(Boolean);
  const weakSslUrls = postgresUrls.filter((value) => /sslmode=require\b/.test(value));

  if (missing.length > 0 || weakSslUrls.length > 0) {
    hasFailure = true;
    console.log(`${target.label}: needs attention`);

    if (missing.length > 0) {
      console.log(`  missing: ${missing.join(", ")}`);
    }

    if (weakSslUrls.length > 0) {
      console.log("  postgres sslmode=require found; use sslmode=verify-full");
    }
  } else {
    console.log(`${target.label}: ok`);
  }
}

if (hasFailure) {
  process.exitCode = 1;
}
