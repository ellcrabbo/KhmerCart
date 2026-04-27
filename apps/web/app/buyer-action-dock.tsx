"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatMoney } from "./lib/format";
import type { BuyerLocale } from "./lib/i18n";
import {
  markNotificationAsRead,
  previewCheckout,
  readBuyerSession,
  readCart,
  readCheckoutConfig,
  readFollowedSellers,
  readNotifications,
  readNotificationSummary,
  readSavedProducts,
  requestOtp,
  resolveAbsolutePaymentUrl,
  submitCheckout,
  verifyOtp,
  type AuthSession,
  type CheckoutAddressInput,
  type FollowedSellerEntry,
  type NotificationEntry,
  type PaymentMethod,
  type SavedProductEntry
} from "./lib/buyer-api";
import type {
  BuyerCart,
  BuyerCheckoutResult,
  CheckoutPreviewResult
} from "@khmercart/db";

type BuyerActionDockProps = {
  locale: BuyerLocale;
};

type DockTab = "cart" | "checkout" | "account";

const SESSION_STORAGE_KEY = "khmercart.web.sessionToken";

const defaultAddress: CheckoutAddressInput = {
  city: "Phnom Penh",
  country: "KH",
  deliveryNotes: "Mobile web checkout",
  fullName: "Sample Buyer",
  line1: "123 Norodom Boulevard",
  line2: "Sangkat Tonle Bassac",
  phone: "+85512345678",
  postalCode: "120101",
  stateProvince: "Phnom Penh"
};

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function readStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}

function storeToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export function BuyerActionDock({ locale }: BuyerActionDockProps) {
  const [activeTab, setActiveTab] = useState<DockTab>("cart");
  const [identifier, setIdentifier] = useState("buyer@khmercart.local");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [cart, setCart] = useState<BuyerCart | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("PAYWAY");
  const [couponCode, setCouponCode] = useState("");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState<CheckoutAddressInput>(defaultAddress);
  const [checkoutPreview, setCheckoutPreview] =
    useState<CheckoutPreviewResult | null>(null);
  const [checkoutResult, setCheckoutResult] =
    useState<BuyerCheckoutResult | null>(null);
  const [savedProducts, setSavedProducts] = useState<SavedProductEntry[]>([]);
  const [followedSellers, setFollowedSellers] = useState<FollowedSellerEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const isSignedIn = Boolean(sessionToken && session);
  const cartCurrency = cart?.currency ?? "KHR";
  const canCheckout = Boolean(isSignedIn && cart && cart.itemCount > 0);
  const paymentUrl = checkoutResult?.payment.checkoutUrl
    ? resolveAbsolutePaymentUrl(checkoutResult.payment.checkoutUrl)
    : null;
  const checkoutStatus = useMemo(() => {
    if (!checkoutResult) {
      return null;
    }

    return `${checkoutResult.orderNumber} · ${formatStatus(checkoutResult.state)} · ${formatStatus(
      checkoutResult.payment.status
    )}`;
  }, [checkoutResult]);

  const refreshBuyerData = useCallback(async (token = sessionToken) => {
    if (!token) {
      return;
    }

    const [nextSession, nextCart, checkoutConfig, saved, followed, inbox, summary] =
      await Promise.all([
        readBuyerSession(token),
        readCart(token),
        readCheckoutConfig(),
        readSavedProducts(token),
        readFollowedSellers(token),
        readNotifications(token),
        readNotificationSummary(token)
      ]);

    setSession(nextSession);
    setCart(nextCart);
    setPaymentMethods(checkoutConfig.paymentMethods);
    setSavedProducts(saved);
    setFollowedSellers(followed);
    setNotifications(inbox);
    setUnreadCount(summary.unreadCount);

    if (!checkoutConfig.paymentMethods.includes(selectedPaymentMethod)) {
      setSelectedPaymentMethod(checkoutConfig.paymentMethods[0] ?? "COD");
    }
  }, [selectedPaymentMethod, sessionToken]);

  useEffect(() => {
    const token = readStoredToken();

    if (!token) {
      return;
    }

    setSessionToken(token);
    void refreshBuyerData(token).catch(() => {
      storeToken(null);
      setSessionToken(null);
      setSession(null);
    });
  }, [refreshBuyerData]);

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    function handleCartUpdated() {
      void refreshBuyerData(sessionToken).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Unable to refresh cart.");
      });
    }

    window.addEventListener("khmercart:cart-updated", handleCartUpdated);

    return () => window.removeEventListener("khmercart:cart-updated", handleCartUpdated);
  }, [refreshBuyerData, sessionToken]);

  useEffect(() => {
    if (!sessionToken || !cart || cart.itemCount === 0) {
      setCheckoutPreview(null);
      return;
    }

    let isActive = true;

    void previewCheckout(sessionToken, couponCode.trim() || null)
      .then((preview) => {
        if (isActive) {
          setCheckoutPreview(preview);
        }
      })
      .catch(() => {
        if (isActive) {
          setCheckoutPreview(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [cart, couponCode, sessionToken]);

  async function handleRequestOtp() {
    setIsBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await requestOtp(identifier);

      setDevCode(response.devCode ?? null);
      setStatusMessage(
        response.devCode
          ? `Dev OTP ready: ${response.devCode}`
          : `OTP sent by ${response.channel.toLowerCase()}.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to request OTP.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setIsBusy(true);
    setErrorMessage(null);

    try {
      const response = await verifyOtp(identifier, code);

      storeToken(response.token);
      setSessionToken(response.token);
      setSession(response.session);
      setCode("");
      setDevCode(null);
      setStatusMessage("Signed in. Cart and account data are ready.");
      await refreshBuyerData(response.token);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to verify OTP.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCheckout() {
    if (!sessionToken || !canCheckout) {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await submitCheckout(sessionToken, {
        billingAddress: address,
        couponCode: couponCode.trim() || null,
        notes: notes.trim() || null,
        paymentMethod: selectedPaymentMethod,
        shippingAddress: address
      });

      setCheckoutResult(result);
      setStatusMessage(
        result.payment.status === "PENDING"
          ? "Checkout created. Open PayWay to generate or complete the provider QR."
          : "Checkout created."
      );
      await refreshBuyerData(sessionToken);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to place order.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMarkNotification(notificationId: string) {
    if (!sessionToken) {
      return;
    }

    await markNotificationAsRead(sessionToken, notificationId);
    await refreshBuyerData(sessionToken);
  }

  function handleSignOut() {
    storeToken(null);
    setSessionToken(null);
    setSession(null);
    setCart(null);
    setSavedProducts([]);
    setFollowedSellers([]);
    setNotifications([]);
    setUnreadCount(0);
    setCheckoutResult(null);
    setStatusMessage("Signed out.");
  }

  function updateAddress(field: keyof CheckoutAddressInput, value: string) {
    setAddress((current) => ({
      ...current,
      [field]: value
    }));
  }

  return (
    <section className="grid gap-4 rounded-[1.35rem] border border-black/10 bg-white/88 p-4 shadow-[0_18px_45px_rgba(41,24,8,0.07)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-stone-500">
            Mobile checkout
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">
            {isSignedIn ? `Ready for ${session?.user.email ?? "buyer"}` : "Sign in to shop"}
          </h2>
        </div>
        {isSignedIn ? (
          <button
            className="min-h-11 rounded-full border border-black/10 bg-stone-50 px-4 text-sm font-semibold text-stone-700"
            onClick={handleSignOut}
            type="button"
          >
            Sign out
          </button>
        ) : null}
      </div>

      {!isSignedIn ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            className="min-h-12 rounded-2xl border border-black/10 bg-stone-50 px-4 text-sm text-stone-950 outline-none focus:border-emerald-700"
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="buyer@khmercart.local"
            type="text"
            value={identifier}
          />
          <button
            className="min-h-12 rounded-full bg-stone-950 px-5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={isBusy}
            onClick={handleRequestOtp}
            type="button"
          >
            Send OTP
          </button>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              className="min-h-12 rounded-2xl border border-black/10 bg-stone-50 px-4 text-sm text-stone-950 outline-none focus:border-emerald-700"
              onChange={(event) => setCode(event.target.value)}
              placeholder={devCode ?? "Code"}
              type="text"
              value={code}
            />
            <button
              className="min-h-12 rounded-full bg-[#0f5346] px-5 text-sm font-semibold text-white disabled:opacity-50"
              disabled={isBusy || !code.trim()}
              onClick={handleVerifyOtp}
              type="button"
            >
              Verify
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-2 rounded-full bg-stone-100 p-1">
            {(["cart", "checkout", "account"] as DockTab[]).map((tab) => (
              <button
                key={tab}
                className={[
                  "min-h-10 rounded-full text-sm font-semibold capitalize transition",
                  activeTab === tab ? "bg-white text-stone-950 shadow-sm" : "text-stone-600"
                ].join(" ")}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab}
                {tab === "cart" && cart?.itemCount ? ` (${cart.itemCount})` : ""}
                {tab === "account" && unreadCount ? ` (${unreadCount})` : ""}
              </button>
            ))}
          </div>

          {activeTab === "cart" ? (
            <div className="grid gap-3">
              {cart?.items.length ? (
                cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-2 rounded-[1.1rem] border border-black/8 bg-stone-50/90 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-950">
                          {item.productName}
                        </p>
                        <p className="mt-1 text-xs text-stone-600">
                          {item.variantName} · {item.seller.displayName}
                        </p>
                      </div>
                      <p className="text-right text-sm font-semibold text-stone-950">
                        {item.lineSubtotalMinor !== null && item.currency
                          ? formatMoney(locale, item.currency, item.lineSubtotalMinor)
                          : "-"}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                      Quantity {item.quantity} · {item.availableQuantity} available
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.1rem] border border-dashed border-black/10 bg-stone-50/85 p-5 text-sm text-stone-600">
                  Add a product from the feed to start mobile web checkout.
                </div>
              )}

              <div className="flex items-center justify-between rounded-[1.1rem] bg-stone-950 px-4 py-3 text-white">
                <span className="text-sm font-semibold">Cart total</span>
                <span className="text-lg font-semibold">
                  {formatMoney(locale, cartCurrency, cart?.totalMinor ?? 0)}
                </span>
              </div>
            </div>
          ) : null}

          {activeTab === "checkout" ? (
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="min-h-11 rounded-2xl border border-black/10 bg-stone-50 px-4 text-sm"
                  onChange={(event) => updateAddress("fullName", event.target.value)}
                  placeholder="Full name"
                  value={address.fullName ?? ""}
                />
                <input
                  className="min-h-11 rounded-2xl border border-black/10 bg-stone-50 px-4 text-sm"
                  onChange={(event) => updateAddress("phone", event.target.value)}
                  placeholder="Phone"
                  value={address.phone ?? ""}
                />
                <input
                  className="min-h-11 rounded-2xl border border-black/10 bg-stone-50 px-4 text-sm sm:col-span-2"
                  onChange={(event) => updateAddress("line1", event.target.value)}
                  placeholder="Address"
                  value={address.line1 ?? ""}
                />
                <input
                  className="min-h-11 rounded-2xl border border-black/10 bg-stone-50 px-4 text-sm"
                  onChange={(event) => updateAddress("city", event.target.value)}
                  placeholder="City"
                  value={address.city ?? ""}
                />
                <select
                  className="min-h-11 rounded-2xl border border-black/10 bg-stone-50 px-4 text-sm"
                  onChange={(event) =>
                    setSelectedPaymentMethod(event.target.value as PaymentMethod)
                  }
                  value={selectedPaymentMethod}
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method === "PAYWAY" ? "ABA PayWay" : method}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  className="min-h-11 rounded-2xl border border-black/10 bg-stone-50 px-4 text-sm"
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Coupon"
                  value={couponCode}
                />
                <input
                  className="min-h-11 rounded-2xl border border-black/10 bg-stone-50 px-4 text-sm"
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Delivery notes"
                  value={notes}
                />
                <button
                  className="min-h-11 rounded-full bg-[#0f5346] px-5 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={isBusy || !canCheckout}
                  onClick={handleCheckout}
                  type="button"
                >
                  Place order
                </button>
              </div>

              <div className="grid gap-2 rounded-[1.1rem] border border-black/8 bg-stone-50/85 p-4 text-sm text-stone-700">
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>{checkoutPreview?.itemCount ?? cart?.itemCount ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{formatMoney(locale, cartCurrency, checkoutPreview?.shippingMinor ?? 0)}</span>
                </div>
                <div className="flex justify-between font-semibold text-stone-950">
                  <span>Total</span>
                  <span>
                    {formatMoney(
                      locale,
                      cartCurrency,
                      checkoutPreview?.totalMinor ?? cart?.totalMinor ?? 0
                    )}
                  </span>
                </div>
                {checkoutStatus ? <p>{checkoutStatus}</p> : null}
                {paymentUrl ? (
                  <a
                    className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-stone-950 px-5 text-sm font-semibold text-white"
                    href={paymentUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open PayWay
                  </a>
                ) : null}
                {checkoutResult?.payment.provider === "PAYWAY" ? (
                  <p className="text-xs leading-5 text-amber-800">
                    PayWay QR generation is not payment confirmation. The order stays pending
                    until ABA sends a callback or reconciliation confirms payment.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === "account" ? (
            <div className="grid gap-3 lg:grid-cols-3">
              <AccountList
                empty="No saved products yet."
                items={savedProducts.map((entry) => entry.product.name)}
                title="Saved"
              />
              <AccountList
                empty="No followed sellers yet."
                items={followedSellers.map((entry) => entry.seller.displayName)}
                title="Following"
              />
              <div className="grid gap-2 rounded-[1.1rem] border border-black/8 bg-stone-50/85 p-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Notifications
                </p>
                {notifications.length ? (
                  notifications.slice(0, 3).map((notification) => (
                    <button
                      key={notification.id}
                      className="rounded-xl bg-white px-3 py-2 text-left text-sm text-stone-700"
                      onClick={() => void handleMarkNotification(notification.id)}
                      type="button"
                    >
                      <span className="block font-semibold text-stone-950">
                        {notification.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5">{notification.body}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-stone-600">No notifications yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {statusMessage ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {statusMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function AccountList({
  empty,
  items,
  title
}: {
  empty: string;
  items: string[];
  title: string;
}) {
  return (
    <div className="grid gap-2 rounded-[1.1rem] border border-black/8 bg-stone-50/85 p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
        {title}
      </p>
      {items.length ? (
        items.slice(0, 4).map((item) => (
          <p key={item} className="rounded-xl bg-white px-3 py-2 text-sm text-stone-700">
            {item}
          </p>
        ))
      ) : (
        <p className="text-sm text-stone-600">{empty}</p>
      )}
    </div>
  );
}
