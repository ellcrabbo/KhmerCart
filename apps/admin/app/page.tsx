import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { listRecentSellerAuditActivity, listSellerApprovalQueue } from "@khmercart/db";
import { headers } from "next/headers";
import { AppShell } from "@khmercart/ui";
import { AdminQueue } from "./admin-queue";

export default async function AdminPage() {
  const headerList = await headers();

  await requireRoleFromHeaders(headerList, readAuthConfig(process.env).jwtSecret, "ADMIN");
  const [queue, recentActivity] = await Promise.all([
    listSellerApprovalQueue(),
    listRecentSellerAuditActivity()
  ]);

  return (
    <AppShell app="admin">
      <AdminQueue queue={queue} recentActivity={recentActivity} />
    </AppShell>
  );
}
