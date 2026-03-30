#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WORKSPACE_TEST_MAP = {
  "@khmercart/admin": ["tests/admin-client-helpers.test.ts"],
  "@khmercart/api": [
    "tests/checkout.test.ts",
    "tests/payment-webhooks.test.ts",
    "tests/route-guards.test.ts"
  ],
  "@khmercart/buyer": ["tests/buyer-i18n.test.ts"],
  "@khmercart/core": ["tests/auth.test.ts", "tests/order-state-machine.test.ts"],
  "@khmercart/db": [
    "tests/admin-mutations-audit.test.ts",
    "tests/buyer-catalog.test.ts",
    "tests/catalog.test.ts",
    "tests/ledger-payout.test.ts",
    "tests/order-transitions.test.ts",
    "tests/seller-onboarding.test.ts",
    "tests/shipping.test.ts"
  ],
  "@khmercart/seller": ["tests/seller-route-utils.test.ts"],
  "@khmercart/ui": ["tests/ui.test.ts"]
};

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workspaceName = process.argv[2];
const testFiles = workspaceName ? WORKSPACE_TEST_MAP[workspaceName] : undefined;

if (!workspaceName || !testFiles) {
  console.error(
    `Unknown or missing workspace name. Received: ${workspaceName ?? "<none>"}`
  );
  process.exit(1);
}

const lockDirectory = join(tmpdir(), "khmercart-workspace-vitest.lock");
const lockPidFile = join(lockDirectory, "pid");

const exitCode = await withLock(async () => {
  return runVitest(testFiles);
});

process.exit(exitCode);

async function withLock(callback) {
  const startedAt = Date.now();
  const timeoutMs = 10 * 60 * 1000;

  while (true) {
    try {
      await mkdir(lockDirectory);
      await writeFile(lockPidFile, `${process.pid}\n`, "utf8");
      break;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
        if (await clearStaleLock(timeoutMs)) {
          continue;
        }

        if (Date.now() - startedAt > timeoutMs) {
          throw new Error(`Timed out waiting for workspace test lock at ${lockDirectory}`);
        }

        await sleep(200);
        continue;
      }

      throw error;
    }
  }

  try {
    return await callback();
  } finally {
    await rm(lockDirectory, { force: true, recursive: true });
  }
}

function runVitest(testFiles) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      ["exec", "vitest", "run", "--config", "vitest.config.ts", ...testFiles],
      {
        cwd: repoRoot,
        stdio: "inherit"
      }
    );

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
    child.on("error", reject);
  });
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function clearStaleLock(timeoutMs) {
  try {
    const lockStats = await stat(lockDirectory);
    const lockAgeMs = Date.now() - lockStats.mtimeMs;
    const lockPid = await readLockPid();

    if ((lockPid !== null && !isProcessRunning(lockPid)) || lockAgeMs > timeoutMs) {
      await rm(lockDirectory, { force: true, recursive: true });
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

async function readLockPid() {
  try {
    const pid = Number.parseInt((await readFile(lockPidFile, "utf8")).trim(), 10);

    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
