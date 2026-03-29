import { getHealthPayload } from "@khmercart/db";

export const runtime = "nodejs";

export async function GET() {
  const payload = await getHealthPayload("admin");
  const status = payload.status === "OK" ? 200 : 503;

  return Response.json(payload, { status });
}
