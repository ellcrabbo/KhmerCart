import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!process.env.PLAYWRIGHT_BASE_URL) {
  run("node", ["./scripts/ensure-e2e-fixtures.mjs"]);
}

run("pnpm", ["exec", "playwright", "test"]);
