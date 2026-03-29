import { BuyerCatalogError } from "@khmercart/db";
import { NextResponse } from "next/server";

export function jsonErrorResponse(error: unknown): NextResponse {
  if (error instanceof BuyerCatalogError) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message
      },
      {
        status: error.status
      }
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong."
    },
    {
      status: 500
    }
  );
}
