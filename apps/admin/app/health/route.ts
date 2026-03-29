import { getHealthPayload } from "@khmercart/db";

export const runtime = "nodejs";

export async function GET() {
  const payload = await getHealthPayload("admin");
  const status = payload.status === "OK" ? 200 : 503;

  return new Response(payload.status, {
    headers: {
      "content-type": "text/plain; charset=utf-8"
    },
    status
  });
}
