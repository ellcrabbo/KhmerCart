import type { ExternalPaymentProvider } from "@khmercart/core";
import { processPaymentWebhook } from "@khmercart/db";
import { NextResponse } from "next/server";
import { jsonErrorResponse } from "../../auth/_lib/auth-route";

function normalizeRequestHeaders(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

export async function handlePaymentWebhookRequest(
  request: Request,
  provider: ExternalPaymentProvider
) {
  try {
    const rawBody = await request.text();
    const result = await processPaymentWebhook({
      headers: normalizeRequestHeaders(request.headers),
      provider,
      rawBody
    });

    return NextResponse.json(
      {
        ok: true,
        ...result
      },
      { status: 200 }
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
