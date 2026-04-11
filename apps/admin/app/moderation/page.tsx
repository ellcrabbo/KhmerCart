import {
  listProductModerationQueue,
  listVideoPostModerationQueue
} from "@khmercart/db";
import { AdminConsoleShell } from "../admin-console-shell";
import { requireAdminSession } from "../_lib/auth";
import { ProductModerationQueue } from "../product-moderation-queue";
import { VideoPostModerationQueue } from "../video-post-moderation-queue";

export default async function ModerationPage() {
  await requireAdminSession();

  const [queue, videoQueue] = await Promise.all([
    listProductModerationQueue(),
    listVideoPostModerationQueue()
  ]);

  return (
    <AdminConsoleShell
      current="moderation"
      description="Review listings that are pending or previously rejected, record moderation notes, and approve or reject products without leaving the admin console."
      title="Moderation"
    >
      <div className="grid gap-6">
        <ProductModerationQueue queue={queue} />
        <VideoPostModerationQueue queue={videoQueue} />
      </div>
    </AdminConsoleShell>
  );
}
