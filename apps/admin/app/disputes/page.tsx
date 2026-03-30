import { listDisputes } from "@khmercart/db";
import { AdminConsoleShell } from "../admin-console-shell";
import { DisputesConsole } from "../disputes-console";
import { requireAdminSession } from "../_lib/auth";

export default async function DisputesPage() {
  await requireAdminSession();

  const disputes = await listDisputes();

  return (
    <AdminConsoleShell
      current="disputes"
      description="Track dispute intake, move cases into review, approve refunds when justified, and keep every decision tied to the order it affects."
      title="Disputes"
    >
      <DisputesConsole disputes={disputes} />
    </AdminConsoleShell>
  );
}
