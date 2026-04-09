import { getAdminOrderDetail } from "@khmercart/db";
import { notFound } from "next/navigation";
import { AdminConsoleShell } from "../../admin-console-shell";
import { OrderDetailPanel } from "../../order-detail-panel";
import { requireAdminSession } from "../../_lib/auth";

type OrderDetailPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  await requireAdminSession();

  const { orderId } = await params;
  const order = await getAdminOrderDetail(orderId);

  if (!order) {
    notFound();
  }

  return (
    <AdminConsoleShell
      current="payments"
      description="Review the full order, payment, and shipment picture before treating a pending provider callback as a completed customer outcome."
      title={`Order ${order.orderNumber}`}
    >
      <OrderDetailPanel order={order} />
    </AdminConsoleShell>
  );
}
