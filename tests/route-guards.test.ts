import { issueSessionToken } from "@khmercart/core/auth";
import { proxy as adminProxy } from "../apps/admin/proxy";
import { GET as getSellerSession } from "../apps/api/app/api/seller/session/route";
import { POST as postDisputeDecision } from "../apps/admin/app/api/disputes/[disputeId]/decision/route";
import { POST as postProductDecision } from "../apps/admin/app/api/products/[productId]/decision/route";
import { POST as postSellerDecision } from "../apps/admin/app/api/sellers/[sellerId]/decision/route";
import { proxy as apiProxy } from "../apps/api/proxy";
import { proxy as sellerProxy } from "../apps/seller/proxy";
import { NextRequest } from "./shims/next-server";

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

  it("returns 403 from the seller approval route for buyer-only sessions", async () => {
    const token = await createToken(["BUYER"]);
    const request = new NextRequest("http://localhost:3003/api/sellers/seller_1/decision", {
      body: JSON.stringify({
        decision: "APPROVE"
      }),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      method: "POST"
    });

    const response = await postSellerDecision(request, {
      params: Promise.resolve({ sellerId: "seller_1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "FORBIDDEN",
      message: "FORBIDDEN"
    });
  });

  it("redirects anonymous admin page requests to the same-domain login page", async () => {
    const request = new NextRequest("http://localhost:3003/approvals");

    const response = await adminProxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3003/login?error=session&next=%2Fapprovals"
    );
  });

  it("redirects anonymous seller page requests to the same-domain login page", async () => {
    const request = new NextRequest("http://localhost:3001/");

    const response = await sellerProxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/login?error=session&next=%2F"
    );
  });

  it("redirects wrong-role admin page requests to the login page with a forbidden error", async () => {
    const token = await createToken(["BUYER"]);
    const request = new NextRequest("http://localhost:3003/approvals", {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const response = await adminProxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3003/login?error=forbidden&next=%2Fapprovals"
    );
  });

  it("returns 403 from the product moderation route for buyer-only sessions", async () => {
    const token = await createToken(["BUYER"]);
    const request = new NextRequest("http://localhost:3003/api/products/product_1/decision", {
      body: JSON.stringify({
        decision: "APPROVE"
      }),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      method: "POST"
    });

    const response = await postProductDecision(request, {
      params: Promise.resolve({ productId: "product_1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "FORBIDDEN",
      message: "FORBIDDEN"
    });
  });

  it("returns 403 from the dispute decision route for buyer-only sessions", async () => {
    const token = await createToken(["BUYER"]);
    const request = new NextRequest("http://localhost:3003/api/disputes/dispute_1/decision", {
      body: JSON.stringify({
        status: "UNDER_REVIEW"
      }),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      method: "POST"
    });

    const response = await postDisputeDecision(request, {
      params: Promise.resolve({ disputeId: "dispute_1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "FORBIDDEN",
      message: "FORBIDDEN"
    });
  });
});
