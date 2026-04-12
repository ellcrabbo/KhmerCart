import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { createSellerBundle } from "@khmercart/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonErrorResponse, readJsonBody } from "../_lib/route";

export const runtime = "nodejs";

type CreateBundleBody = {
  description?: string;
  name?: string;
  productIds?: string[];
};

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleFromHeaders(
      request.headers,
      readAuthConfig(process.env).jwtSecret,
      "SELLER"
    );
    const body = await readJsonBody<CreateBundleBody>(request);

    return NextResponse.json(
      await createSellerBundle({
        description: body.description,
        name: body.name,
        productIds: body.productIds,
        userId: session.user.id,
      }),
      { status: 201 }
    );
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
