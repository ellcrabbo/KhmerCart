import { SellerServiceError } from "@khmercart/db";
import { NextRequest } from "next/server";
import {
  getClientIpAddress,
  jsonErrorResponse,
  readJsonBody
} from "../apps/seller/app/api/_lib/route";

describe("seller route utilities", () => {
  it("reads the first forwarded client IP address", () => {
    const request = new NextRequest("http://localhost:3001/api/onboarding", {
      headers: {
        "x-forwarded-for": "203.0.113.7, 198.51.100.9"
      }
    });

    expect(getClientIpAddress(request)).toBe("203.0.113.7");
  });

  it("parses JSON request bodies and rejects malformed payloads", async () => {
    const validRequest = new Request("http://localhost:3001/api/onboarding", {
      body: JSON.stringify({ displayName: "Seller Studio" }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    await expect(readJsonBody<{ displayName: string }>(validRequest)).resolves.toEqual({
      displayName: "Seller Studio"
    });

    const invalidRequest = new Request("http://localhost:3001/api/onboarding", {
      body: "{invalid",
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    await expect(readJsonBody(invalidRequest)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Request body must be valid JSON.",
      status: 400
    });
  });

  it("returns structured JSON errors for known seller service failures", async () => {
    const response = jsonErrorResponse(
      new SellerServiceError("SELLER_NOT_APPROVED", "Listings are still locked.", 403)
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "SELLER_NOT_APPROVED",
      message: "Listings are still locked."
    });
  });
});
