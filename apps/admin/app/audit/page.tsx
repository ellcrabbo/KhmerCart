import { listAuditLogs } from "@khmercart/db";
import { AdminConsoleShell } from "../admin-console-shell";
import { AuditLogViewer } from "../audit-log-viewer";
import { requireAdminSession } from "../_lib/auth";

export default async function AuditPage() {
  await requireAdminSession();

  const entries = await listAuditLogs();

  return (
    <AdminConsoleShell
      current="audit"
      description="Review privileged state changes with actor context and before/after snapshots for seller approvals, product moderation, disputes, and other sensitive operations."
      title="Audit logs"
    >
      <AuditLogViewer entries={entries} />
    </AdminConsoleShell>
  );
}
