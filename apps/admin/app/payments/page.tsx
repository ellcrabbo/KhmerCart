import { listRecentPayments } from "@khmercart/db";
import { AdminConsoleShell } from "../admin-console-shell";
import { PaymentOperationsConsole } from "../payment-operations-console";
import { requireAdminSession } from "../_lib/auth";

export default async function PaymentsPage() {
  await requireAdminSession();

  const payments = await listRecentPayments();

  return (
    <AdminConsoleShell
      current="payments"
      description="Track provider state, callback activity, and reconciliation drift before operations mistakes a generated checkout for a confirmed payment."
      title="Payments & reconciliation"
    >
      <PaymentOperationsConsole payments={payments} />
    </AdminConsoleShell>
  );
}
