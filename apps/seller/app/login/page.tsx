import {
  appCatalog,
  readAuthConfig,
  requireRoleFromHeaders,
} from "@khmercart/core";
import { AppShell, RoleLoginPanel } from "@khmercart/ui";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function readSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeNextPath(
  value: string | undefined,
  fallback: string,
): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}

export default async function SellerLoginPage({
  searchParams,
}: LoginPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const nextPath = normalizeNextPath(
    readSingleValue(resolvedSearchParams.next),
    "/",
  );
  const errorCode = readSingleValue(resolvedSearchParams.error) ?? null;

  try {
    const session = await requireRoleFromHeaders(
      await headers(),
      readAuthConfig(process.env).jwtSecret,
      "SELLER",
    );

    if (session.user.id) {
      redirect(nextPath);
    }
  } catch {
    // Fall through to the login screen when no valid seller session is present.
  }

  return (
    <AppShell app="seller">
      <RoleLoginPanel
        appName={appCatalog.seller.title}
        description="Use your email to sign in or create a seller workspace. New sellers start onboarding after OTP verification."
        errorCode={errorCode}
        nextPath={nextPath}
        requestOtpUrl="/api/auth/request-otp"
        roleLabel="SELLER"
        verifyOtpUrl="/api/auth/verify-otp"
      />
    </AppShell>
  );
}
