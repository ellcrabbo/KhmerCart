import { readAuthConfig, requireRoleFromHeaders, type AuthSession } from "@khmercart/core/auth";
import { headers } from "next/headers";

export async function requireAdminSession(): Promise<AuthSession> {
  const headerList = await headers();

  return requireRoleFromHeaders(headerList, readAuthConfig(process.env).jwtSecret, "ADMIN");
}
