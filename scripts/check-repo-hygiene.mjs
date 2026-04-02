import { execFileSync } from "node:child_process";

const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  cwd: process.cwd(),
  encoding: "utf8"
})
  .split("\0")
  .filter(Boolean);

const forbiddenPatterns = [
  {
    description: "TypeScript build info",
    test: (file) => file.endsWith(".tsbuildinfo")
  },
  {
    description: "Next.js build output",
    test: (file) => file.includes("/.next/")
  },
  {
    description: "Turborepo cache output",
    test: (file) => file.includes("/.turbo/")
  },
  {
    description: "Generated Prisma client output",
    test: (file) => file.startsWith("packages/db/generated/")
  }
];

const violations = trackedFiles.flatMap((file) =>
  forbiddenPatterns
    .filter((pattern) => pattern.test(file))
    .map((pattern) => ({ file, reason: pattern.description }))
);

if (violations.length === 0) {
  console.log("Repo hygiene check passed.");
  process.exit(0);
}

console.error("Repo hygiene check failed. Remove generated artifacts from git:");

for (const violation of violations) {
  console.error(`- ${violation.file} (${violation.reason})`);
}

process.exit(1);
