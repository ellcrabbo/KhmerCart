import { runPaymentReconciliationJob } from "@khmercart/db";

async function main() {
  const result = await runPaymentReconciliationJob();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
