import { issueSessionToken } from "@khmercart/core/auth";
import { GET as getSellerSession } from "../apps/api/app/api/seller/session/route";
import { proxy as apiProxy } from "../apps/api/proxy";
import { NextRequest } from "next/server";

const jwtSecret = "test-secret";

async function createToken(roles: Array<"BUYER" | "SELLER" | "ADMIN">) {
  const issuedAt = new Date("2099-03-29T14:00:00.000Z");
  const expiresAt = new Date("2099-03-29T15:00:00.000Z");

  return issueSessionToken(
    {
      email: "buyer@khmercart.local",
      id: "user_buyer",
      phone: "+85510000002",
      primaryRole: roles[0] ?? null,
      roles
    },
    jwtSecret,
    issuedAt,
    expiresAt
  );
}

describe("route guards", () => {
  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = jwtSecret;
  });

  it("blocks seller API routes for buyer-only sessions in proxy", async () => {
    const token = await createToken(["BUYER"]);
    const request = new NextRequest("http://localhost:3002/api/seller/session", {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const response = await apiProxy(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "FORBIDDEN" });
  });

  it("returns a forbidden response from the seller session handler for buyer-only sessions", async () => {
    const token = await createToken(["BUYER"]);
    const request = new Request("http://localhost:3002/api/seller/session", {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const response = await getSellerSession(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "FORBIDDEN",
      message: "FORBIDDEN"
    });
  });

  it("allows seller sessions through the seller session handler", async () => {
    const token = await createToken(["SELLER"]);
    const request = new Request("http://localhost:3002/api/seller/session", {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const response = await getSellerSession(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.user.primaryRole).toBe("SELLER");
    expect(payload.user.roles).toEqual(["SELLER"]);
  });
});
