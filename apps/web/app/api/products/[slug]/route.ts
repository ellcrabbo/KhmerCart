import { getBuyerProductBySlug } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse } from "../../_lib/route";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    return NextResponse.json(await getBuyerProductBySlug(slug));
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
