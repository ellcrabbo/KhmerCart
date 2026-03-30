import { getDisputeDetail } from "@khmercart/db";
import { AdminConsoleShell } from "../../admin-console-shell";
import { DisputeDetailPanel } from "../../dispute-detail-panel";
import { requireAdminSession } from "../../_lib/auth";

export default async function DisputeDetailPage({
  params
}: {
  params: Promise<{ disputeId: string }>;
}) {
  await requireAdminSession();

  const { disputeId } = await params;
  const dispute = await getDisputeDetail(disputeId);

  return (
    <AdminConsoleShell
      current="disputes"
      description="Inspect the dispute context, record notes, and move the case into review, refund approval, rejection, or closure with a full audit trail."
      title="Dispute detail"
    >
      <DisputeDetailPanel dispute={dispute} />
    </AdminConsoleShell>
  );
}
