import { getOtpAbuseOverview, listUserDirectory } from "@khmercart/db";
import { readAuthConfig } from "@khmercart/core/auth";
import { AccessManager } from "../access-manager";
import { AdminConsoleShell } from "../admin-console-shell";
import { requireAdminSession } from "../_lib/auth";

export default async function AccountsPage() {
  await requireAdminSession();

  const authConfig = readAuthConfig(process.env);
  const [users, overview] = await Promise.all([
    listUserDirectory(),
    getOtpAbuseOverview(authConfig)
  ]);

  return (
    <AdminConsoleShell
      current="accounts"
      description="Adjust account emails and roles without touching the database directly, then keep an eye on live OTP traffic before it turns into an abuse incident."
      title="Accounts & OTP controls"
    >
      <AccessManager overview={overview} users={users} />
    </AdminConsoleShell>
  );
}
