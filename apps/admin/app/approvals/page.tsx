import { listRecentSellerAuditActivity, listSellerApprovalQueue } from "@khmercart/db";
import { AdminQueue } from "../admin-queue";
import { AdminConsoleShell } from "../admin-console-shell";
import { requireAdminSession } from "../_lib/auth";

export default async function ApprovalsPage() {
  await requireAdminSession();

  const [queue, recentActivity] = await Promise.all([
    listSellerApprovalQueue(),
    listRecentSellerAuditActivity()
  ]);

  return (
    <AdminConsoleShell
      current="approvals"
      description="Approve or reject seller onboarding submissions, review uploaded KYC documents, and keep a short operational audit trail close to the queue."
      title="Approvals"
    >
      <AdminQueue queue={queue} recentActivity={recentActivity} />
    </AdminConsoleShell>
  );
}
