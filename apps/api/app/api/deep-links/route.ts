import { recordDeepLinkEvent } from "@khmercart/db";
import type { Prisma } from "@khmercart/db/prisma-client";
import { NextResponse } from "next/server";
import { jsonErrorResponse, readJsonBody } from "../auth/_lib/auth-route";

export const runtime = "nodejs";

type DeepLinkBody = {
  metadata?: Record<string, unknown> | null;
  orderId?: string | null;
  source?: string | null;
  targetId?: string;
  targetType?: "POST" | "PRODUCT" | "ORDER" | "SELLER";
};

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<DeepLinkBody>(request);

    return NextResponse.json(
      await recordDeepLinkEvent({
        metadata: (body.metadata ?? null) as Prisma.InputJsonValue | null,
        orderId: body.orderId ?? null,
        source: body.source ?? null,
        targetId: body.targetId ?? "",
        targetType: body.targetType ?? "PRODUCT",
      })
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
