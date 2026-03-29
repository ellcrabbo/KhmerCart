import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@khmercart\/core\/auth$/,
        replacement: fileURLToPath(new URL("./packages/core/src/auth.ts", import.meta.url))
      },
      {
        find: /^@khmercart\/core$/,
        replacement: fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url))
      },
      {
        find: /^@khmercart\/db\/auth-store$/,
        replacement: fileURLToPath(new URL("./packages/db/src/auth-store.ts", import.meta.url))
      },
      {
        find: /^@khmercart\/db$/,
        replacement: fileURLToPath(new URL("./packages/db/src/index.ts", import.meta.url))
      }
    ]
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    include: ["tests/**/*.test.ts"]
  }
});
