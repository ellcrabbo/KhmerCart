"use client";

import type {
  BuyerCart,
  BuyerCheckoutResult,
  BuyerOrderTrackingData,
  CheckoutPreviewResult
} from "@khmercart/db";

export type PaymentMethod = "COD" | "KHQR" | "PAYWAY" | "TOANCHET" | "WING";

export type CheckoutAddressInput = {
  city?: string | null;
  country?: string | null;
  deliveryNotes?: string | null;
  fullName?: string | null;
  line1?: string | null;
  line2?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  stateProvince?: string | null;
};

export type AuthSession = {
  expiresAt: string;
  issuedAt: string;
  user: {
    email: string | null;
    id: string;
    phone: string | null;
    primaryRole: string | null;
    roles: string[];
  };
};

export type RequestOtpResponse = {
  challengeId: string;
  channel: "EMAIL" | "PHONE";
  devCode?: string;
  expiresAt: string;
  identifier: string;
  provider: string;
};

export type VerifyOtpResponse = {
  session: AuthSession;
  token: string;
};

export type SavedProductEntry = {
  createdAt: string;
  id: string;
  product: {
    id: string;
    imageUrl: string | null;
    name: string;
    priceMinor: number | null;
    sellerSlug: string;
    slug: string;
  };
};

export type FollowedSellerEntry = {
  createdAt: string;
  id: string;
  seller: {
    displayName: string;
    followerCount: number;
    id: string;
    slug: string;
  };
};

export type NotificationEntry = {
  actionUrl: string | null;
  body: string;
  createdAt: string;
  id: string;
  isRead: boolean;
  kind: string;
  title: string;
};

export type NotificationSummary = {
  unreadCount: number;
};

export type CheckoutConfigResponse = {
  paymentMethods: PaymentMethod[];
};

type JsonRequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PATCH";
  token?: string | null;
};

async function requestJson<T>(path: string, options: JsonRequestOptions = {}) {
  const response = await fetch(path, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers
    },
    method: options.method ?? "GET"
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const apiError = payload as { message?: string } | null;

    throw new Error(apiError?.message ?? `Request failed with ${response.status}.`);
  }

  return payload as T;
}

export function createIdempotencyKey() {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `web-${randomPart}`;
}

export function resolveAbsolutePaymentUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const normalized = value.startsWith("/") ? value : `/${value}`;

  return `${window.location.origin}${normalized}`;
}

export async function requestOtp(identifier: string) {
  return requestJson<RequestOtpResponse>("/api/auth/request-otp", {
    body: { identifier },
    method: "POST"
  });
}

export async function verifyOtp(identifier: string, code: string) {
  return requestJson<VerifyOtpResponse>("/api/auth/verify-otp", {
    body: { code, identifier },
    method: "POST"
  });
}

export async function readBuyerSession(token: string) {
  return requestJson<AuthSession>("/api/buyer/session", { token });
}

export async function readCart(token: string) {
  return requestJson<BuyerCart>("/api/cart", { token });
}

export async function mutateCartItem(
  token: string,
  input: { action?: "ADD" | "REMOVE" | "SET"; quantity?: number; variantId: string }
) {
  return requestJson<BuyerCart>("/api/cart/items", {
    body: input,
    method: "POST",
    token
  });
}

export async function readCheckoutConfig() {
  return requestJson<CheckoutConfigResponse>("/api/checkout");
}

export async function previewCheckout(token: string, couponCode?: string | null) {
  return requestJson<CheckoutPreviewResult>("/api/checkout", {
    body: { couponCode },
    method: "PATCH",
    token
  });
}

export async function submitCheckout(
  token: string,
  input: {
    billingAddress?: CheckoutAddressInput | null;
    couponCode?: string | null;
    notes?: string | null;
    paymentMethod?: PaymentMethod | null;
    shippingAddress: CheckoutAddressInput;
  }
) {
  return requestJson<BuyerCheckoutResult>("/api/checkout", {
    body: input,
    headers: { "Idempotency-Key": createIdempotencyKey() },
    method: "POST",
    token
  });
}

export async function readOrderTracking(token: string, orderId: string) {
  return requestJson<BuyerOrderTrackingData>(
    `/api/buyer/orders/${encodeURIComponent(orderId)}`,
    { token }
  );
}

export async function readSavedProducts(token: string) {
  return requestJson<SavedProductEntry[]>("/api/account/saved-products", { token });
}

export async function readFollowedSellers(token: string) {
  return requestJson<FollowedSellerEntry[]>("/api/account/followed-sellers", { token });
}

export async function readNotifications(token: string) {
  return requestJson<NotificationEntry[]>("/api/notifications", { token });
}

export async function readNotificationSummary(token: string) {
  return requestJson<NotificationSummary>("/api/notifications/summary", { token });
}

export async function markNotificationAsRead(token: string, notificationId: string) {
  return requestJson<{ success: boolean }>("/api/notifications", {
    body: { notificationId },
    method: "PATCH",
    token
  });
}

export async function toggleSavedProductState(token: string, productId: string) {
  return requestJson<{ saved: boolean }>(
    `/api/product-saves/${encodeURIComponent(productId)}`,
    {
      method: "POST",
      token
    }
  );
}

export async function toggleFollowedSellerState(token: string, sellerId: string) {
  return requestJson<{ following: boolean }>(
    `/api/sellers/${encodeURIComponent(sellerId)}/follow`,
    {
      method: "POST",
      token
    }
  );
}
