import { appCatalog, readAuthConfig, requireRoleFromHeaders } from "@khmercart/core";
import { AppShell, RoleLoginPanel } from "@khmercart/ui";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function readSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeNextPath(value: string | undefined, fallback: string): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const nextPath = normalizeNextPath(readSingleValue(resolvedSearchParams.next), "/approvals");
  const errorCode = readSingleValue(resolvedSearchParams.error) ?? null;

  try {
    const session = await requireRoleFromHeaders(
      await headers(),
      readAuthConfig(process.env).jwtSecret,
      "ADMIN"
    );

    if (session.user.id) {
      redirect(nextPath);
    }
  } catch {
    // Fall through to the login screen when no valid admin session is present.
  }

  return (
    <AppShell app="admin">
      <RoleLoginPanel
        appName={appCatalog.admin.title}
        errorCode={errorCode}
        nextPath={nextPath}
        requestOtpUrl="/api/auth/request-otp"
        roleLabel="ADMIN"
        verifyOtpUrl="/api/auth/verify-otp"
      />
    </AppShell>
  );
}
