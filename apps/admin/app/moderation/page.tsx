import { listProductModerationQueue } from "@khmercart/db";
import { AdminConsoleShell } from "../admin-console-shell";
import { requireAdminSession } from "../_lib/auth";
import { ProductModerationQueue } from "../product-moderation-queue";

export default async function ModerationPage() {
  await requireAdminSession();

  const queue = await listProductModerationQueue();

  return (
    <AdminConsoleShell
      current="moderation"
      description="Review listings that are pending or previously rejected, record moderation notes, and approve or reject products without leaving the admin console."
      title="Moderation"
    >
      <ProductModerationQueue queue={queue} />
    </AdminConsoleShell>
  );
}
