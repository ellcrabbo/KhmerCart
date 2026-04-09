import { getPaymentDetail } from "@khmercart/db";
import { notFound } from "next/navigation";
import { AdminConsoleShell } from "../../admin-console-shell";
import { PaymentDetailPanel } from "../../payment-detail-panel";
import { requireAdminSession } from "../../_lib/auth";

export default async function PaymentDetailPage({
  params
}: {
  params: Promise<{ paymentId: string }>;
}) {
  await requireAdminSession();

  const { paymentId } = await params;
  const payment = await getPaymentDetail(paymentId);

  if (!payment) {
    notFound();
  }

  return (
    <AdminConsoleShell
      current="payments"
      description="Inspect the provider event trail, order composition, and reconciliation context before changing any operational state."
      title="Payment detail"
    >
      <PaymentDetailPanel payment={payment} />
    </AdminConsoleShell>
  );
}
