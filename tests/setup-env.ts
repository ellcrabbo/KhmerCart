import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

for (const fileName of [".env.local", ".env"]) {
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
