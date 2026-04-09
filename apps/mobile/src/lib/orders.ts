import type { BuyerCheckoutResult, BuyerOrderTrackingData } from "../api/client";
import * as SecureStore from "expo-secure-store";

const BUYER_RECENT_ORDERS_KEY = "khmercart.buyer.recent-orders";
const MAX_RECENT_ORDERS = 10;

export type BuyerRecentOrder = {
  currency: BuyerCheckoutResult["currency"];
  orderId: string;
  orderNumber: string;
  paymentMethod: BuyerCheckoutResult["payment"]["method"];
  paymentStatus: BuyerCheckoutResult["payment"]["status"];
  sellerDisplayName: string;
  state: BuyerCheckoutResult["state"];
  totalMinor: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
  updatedAt: string;
};

function clampRecentOrders(orders: BuyerRecentOrder[]) {
  return orders
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MAX_RECENT_ORDERS);
}

function parseRecentOrders(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const payload = JSON.parse(value) as BuyerRecentOrder[];

    return Array.isArray(payload) ? clampRecentOrders(payload) : [];
  } catch {
    return [];
  }
}

async function writeRecentOrders(orders: BuyerRecentOrder[]) {
  await SecureStore.setItemAsync(
    BUYER_RECENT_ORDERS_KEY,
    JSON.stringify(clampRecentOrders(orders))
  );
}

export function applyCheckoutToRecentOrders(
  current: BuyerRecentOrder[],
  result: BuyerCheckoutResult
) {
  const nextItem: BuyerRecentOrder = {
    currency: result.currency,
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    paymentMethod: result.payment.method,
    paymentStatus: result.payment.status,
    sellerDisplayName: result.seller.displayName,
    state: result.state,
    totalMinor: result.totalMinor,
    trackingNumber: null,
    trackingUrl: null,
    updatedAt: new Date().toISOString()
  };

  return clampRecentOrders([
    nextItem,
    ...current.filter((item) => item.orderId !== result.orderId)
  ]);
}

export function applyTrackingToRecentOrders(
  current: BuyerRecentOrder[],
  tracking: BuyerOrderTrackingData
) {
  const existing = current.find((item) => item.orderId === tracking.orderId);

  const nextItem: BuyerRecentOrder = {
    currency: tracking.currency,
    orderId: tracking.orderId,
    orderNumber: tracking.orderNumber,
    paymentMethod: existing?.paymentMethod ?? "COD",
    paymentStatus: existing?.paymentStatus ?? "NOT_REQUIRED",
    sellerDisplayName: tracking.seller.displayName,
    state: tracking.state,
    totalMinor: tracking.totalMinor,
    trackingNumber: tracking.shipment?.trackingNumber ?? null,
    trackingUrl: tracking.shipment?.trackingUrl ?? null,
    updatedAt: new Date().toISOString()
  };

  return clampRecentOrders([
    nextItem,
    ...current.filter((item) => item.orderId !== tracking.orderId)
  ]);
}

export async function readRecentOrders() {
  const storedValue = await SecureStore.getItemAsync(BUYER_RECENT_ORDERS_KEY);

  return parseRecentOrders(storedValue);
}

export async function rememberCheckoutOrder(
  current: BuyerRecentOrder[],
  result: BuyerCheckoutResult
) {
  const nextOrders = applyCheckoutToRecentOrders(current, result);
  await writeRecentOrders(nextOrders);
  return nextOrders;
}

export async function rememberTrackedOrder(
  current: BuyerRecentOrder[],
  tracking: BuyerOrderTrackingData
) {
  const nextOrders = applyTrackingToRecentOrders(current, tracking);
  await writeRecentOrders(nextOrders);
  return nextOrders;
}
