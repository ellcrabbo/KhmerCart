import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

for (const fileName of [".env.test.local", ".env.test", ".env", ".env.local"]) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    continue;
  }

  config({
    override: false,
    path: filePath
  });
}

process.env.NODE_ENV ??= "test";
