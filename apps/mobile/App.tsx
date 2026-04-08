import type {
  AuthSession,
  BuyerCart,
  BuyerCheckoutResult,
  BuyerFeedResult,
  BuyerOrderTrackingData,
  BuyerProductDetail,
  CheckoutAddressInput,
  PaymentMethod,
  RequestOtpResponse
} from "./src/api/client";
import {
  getApiBaseUrl,
  listProducts,
  mutateCartItem,
  readBuyerSession,
  readCart,
  readCheckoutConfig,
  readOrderTracking,
  readProduct,
  requestOtp,
  resolveAbsoluteUrl,
  submitCheckout,
  verifyOtp
} from "./src/api/client";
import { AuthPanel } from "./src/components/AuthPanel";
import { CartScreen } from "./src/components/CartScreen";
import { OrderTrackingScreen } from "./src/components/OrderTrackingScreen";
import { PaymentResultScreen } from "./src/components/PaymentResultScreen";
import { ProductCard } from "./src/components/ProductCard";
import { ProductDetailScreen } from "./src/components/ProductDetailScreen";
import {
  getBuyerDictionary,
  readDefaultBuyerLocale,
  type BuyerLocale
} from "./src/lib/i18n";
import {
  clearStoredSessionToken,
  readStoredSessionToken,
  writeStoredSessionToken
} from "./src/lib/session";
import { palette } from "./src/lib/theme";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView
} from "react-native-safe-area-context";

type FeedState = BuyerFeedResult;

const emptyFeedState: FeedState = {
  categories: [],
  items: [],
  nextCursor: null
};

const emptyCartState: BuyerCart = {
  currency: null,
  id: null,
  itemCount: 0,
  items: [],
  seller: null,
  subtotalMinor: 0,
  totalMinor: 0,
  updatedAt: null
};

const initialShippingAddress: CheckoutAddressInput = {
  city: "",
  country: "Cambodia",
  deliveryNotes: "",
  fullName: "",
  line1: "",
  line2: "",
  phone: "",
  postalCode: "",
  stateProvince: ""
};

function resolveSessionLabel(session: AuthSession) {
  return session.user.email ?? session.user.phone ?? session.user.id;
}

function createIdempotencyKey() {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `mobile-${randomPart}`;
}

export default function App() {
  const [locale, setLocale] = useState<BuyerLocale>(readDefaultBuyerLocale());
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [otpRequestState, setOtpRequestState] = useState<RequestOtpResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [feedState, setFeedState] = useState<FeedState>(emptyFeedState);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<BuyerProductDetail | null>(null);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState<BuyerCart>(emptyCartState);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isCartMutating, setIsCartMutating] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [checkoutConfigError, setCheckoutConfigError] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState<CheckoutAddressInput>(
    initialShippingAddress
  );
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<BuyerCheckoutResult | null>(null);

  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<BuyerOrderTrackingData | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  const apiBaseUrl = getApiBaseUrl();
  const dictionary = getBuyerDictionary(locale);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const storedToken = await readStoredSessionToken();

      if (!storedToken) {
        if (isActive) {
          setIsRestoringSession(false);
        }

        return;
      }

      try {
        const restoredSession = await readBuyerSession(storedToken);

        if (!isActive) {
          return;
        }

        setSession(restoredSession);
        setSessionToken(storedToken);
        setAuthMessage(`Signed in as ${resolveSessionLabel(restoredSession)}.`);
      } catch {
        await clearStoredSessionToken();

        if (isActive) {
          setSession(null);
          setSessionToken(null);
        }
      } finally {
        if (isActive) {
          setIsRestoringSession(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const payload = await readCheckoutConfig();

        if (!isActive) {
          return;
        }

        setPaymentMethods(payload.paymentMethods);
        setSelectedPaymentMethod(payload.paymentMethods[0] ?? null);
      } catch (error) {
        if (isActive) {
          setCheckoutConfigError(
            error instanceof Error ? error.message : "Unable to load payment methods."
          );
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedPaymentMethod || paymentMethods.includes(selectedPaymentMethod)) {
      if (!selectedPaymentMethod && paymentMethods[0]) {
        setSelectedPaymentMethod(paymentMethods[0]);
      }

      return;
    }

    setSelectedPaymentMethod(paymentMethods[0] ?? null);
  }, [paymentMethods, selectedPaymentMethod]);

  useEffect(() => {
    let isActive = true;

    setFeedError(null);
    setIsFeedLoading(true);
    setFeedState(emptyFeedState);

    void (async () => {
      try {
        const payload = await listProducts({
          category: selectedCategory
        });

        if (!isActive) {
          return;
        }

        setFeedState(payload);
      } catch (error) {
        if (isActive) {
          setFeedError(error instanceof Error ? error.message : dictionary.feedError);
        }
      } finally {
        if (isActive) {
          setIsFeedLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [dictionary.feedError, selectedCategory]);

  useEffect(() => {
    if (!selectedProductSlug) {
      setSelectedProduct(null);
      setProductError(null);
      setIsProductLoading(false);
      return;
    }

    let isActive = true;

    setSelectedProduct(null);
    setProductError(null);
    setIsProductLoading(true);

    void (async () => {
      try {
        const payload = await readProduct(selectedProductSlug);

        if (!isActive) {
          return;
        }

        setSelectedProduct(payload);
      } catch (error) {
        if (isActive) {
          setProductError(error instanceof Error ? error.message : dictionary.detailFallback);
        }
      } finally {
        if (isActive) {
          setIsProductLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [dictionary.detailFallback, selectedProductSlug]);

  useEffect(() => {
    if (!sessionToken) {
      setCart(emptyCartState);
      setIsCartLoading(false);
      return;
    }

    let isActive = true;

    setIsCartLoading(true);
    setCartError(null);

    void (async () => {
      try {
        const payload = await readCart(sessionToken);

        if (isActive) {
          setCart(payload);
        }
      } catch (error) {
        if (isActive) {
          setCartError(error instanceof Error ? error.message : "Unable to load cart.");
        }
      } finally {
        if (isActive) {
          setIsCartLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [sessionToken]);

  useEffect(() => {
    if (!session?.user.phone?.trim()) {
      return;
    }

    setShippingAddress((current) =>
      current.phone?.trim()
        ? current
        : {
            ...current,
            phone: session.user.phone ?? ""
          }
    );
  }, [session?.user.phone]);

  async function refreshCart(token = sessionToken) {
    if (!token) {
      setCart(emptyCartState);
      return;
    }

    setIsCartLoading(true);
    setCartError(null);

    try {
      const payload = await readCart(token);

      setCart(payload);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Unable to load cart.");
    } finally {
      setIsCartLoading(false);
    }
  }

  async function loadTracking(orderId: string, token = sessionToken) {
    if (!token) {
      return;
    }

    setTrackingOrderId(orderId);
    setIsTrackingLoading(true);
    setTrackingError(null);

    try {
      const payload = await readOrderTracking(token, orderId);

      setTrackingData(payload);
    } catch (error) {
      setTrackingError(
        error instanceof Error ? error.message : "Unable to load order tracking."
      );
    } finally {
      setIsTrackingLoading(false);
    }
  }

  async function handleRequestOtp() {
    const nextIdentifier = identifier.trim();

    if (!nextIdentifier) {
      setAuthError("Enter an email address or phone number first.");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      const payload = await requestOtp(nextIdentifier);

      setOtpRequestState(payload);
      setIdentifier(payload.identifier);
      setCode("");
      setAuthMessage(`OTP sent to ${payload.identifier}.`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to request OTP.");
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleVerifyOtp() {
    const nextCode = code.trim();
    const targetIdentifier = otpRequestState?.identifier ?? identifier.trim();

    if (!targetIdentifier) {
      setAuthError("Request an OTP first.");
      return;
    }

    if (!nextCode) {
      setAuthError("Enter the OTP code before verifying.");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      const payload = await verifyOtp(targetIdentifier, nextCode);

      await writeStoredSessionToken(payload.token);

      setSession(payload.session);
      setSessionToken(payload.token);
      setOtpRequestState(null);
      setCode("");
      setAuthMessage(`Signed in as ${resolveSessionLabel(payload.session)}.`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to verify OTP.");
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleSignOut() {
    await clearStoredSessionToken();

    setSession(null);
    setSessionToken(null);
    setOtpRequestState(null);
    setIdentifier("");
    setCode("");
    setAuthError(null);
    setAuthMessage("Buyer session cleared on this device.");
    setCart(emptyCartState);
    setShowCart(false);
    setCheckoutResult(null);
    setCheckoutError(null);
    setTrackingOrderId(null);
    setTrackingData(null);
    setTrackingError(null);
  }

  async function handleLoadMore() {
    if (!feedState.nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setFeedError(null);

    try {
      const payload = await listProducts({
        category: selectedCategory,
        cursor: feedState.nextCursor
      });

      setFeedState((current) => ({
        categories: payload.categories,
        items: [...current.items, ...payload.items],
        nextCursor: payload.nextCursor
      }));
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : dictionary.feedError);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function requireBuyerSession() {
    if (sessionToken) {
      return true;
    }

    Alert.alert("KhmerCart", dictionary.signInRequired);
    return false;
  }

  async function handleOpenCart() {
    if (!requireBuyerSession()) {
      return;
    }

    setCheckoutError(null);
    setShowCart(true);

    if (!cart.id && sessionToken) {
      await refreshCart(sessionToken);
    }
  }

  async function handleAddToCart(variantId: string) {
    if (!requireBuyerSession() || !sessionToken) {
      return;
    }

    setAddingVariantId(variantId);
    setCartError(null);

    try {
      const payload = await mutateCartItem(sessionToken, {
        action: "ADD",
        quantity: 1,
        variantId
      });

      setCart(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to add item to cart.";

      setCartError(message);
      Alert.alert("KhmerCart", message);
    } finally {
      setAddingVariantId(null);
    }
  }

  async function handleDecreaseItem(variantId: string) {
    if (!sessionToken) {
      return;
    }

    setIsCartMutating(true);
    setCartError(null);

    try {
      const payload = await mutateCartItem(sessionToken, {
        action: "REMOVE",
        quantity: 1,
        variantId
      });

      setCart(payload);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Unable to update cart.");
    } finally {
      setIsCartMutating(false);
    }
  }

  async function handleIncreaseItem(variantId: string) {
    if (!sessionToken) {
      return;
    }

    setIsCartMutating(true);
    setCartError(null);

    try {
      const payload = await mutateCartItem(sessionToken, {
        action: "ADD",
        quantity: 1,
        variantId
      });

      setCart(payload);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Unable to update cart.");
    } finally {
      setIsCartMutating(false);
    }
  }

  async function handleRemoveItem(variantId: string) {
    if (!sessionToken) {
      return;
    }

    setIsCartMutating(true);
    setCartError(null);

    try {
      const payload = await mutateCartItem(sessionToken, {
        action: "REMOVE",
        variantId
      });

      setCart(payload);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Unable to update cart.");
    } finally {
      setIsCartMutating(false);
    }
  }

  async function handleSubmitCheckout() {
    if (!sessionToken) {
      Alert.alert("KhmerCart", dictionary.signInRequired);
      return;
    }

    if (cart.itemCount === 0) {
      setCheckoutError(dictionary.cartEmpty);
      return;
    }

    if (!selectedPaymentMethod) {
      setCheckoutError(checkoutConfigError ?? "Choose a payment method first.");
      return;
    }

    setIsSubmittingCheckout(true);
    setCheckoutError(null);

    try {
      const payload = await submitCheckout(
        sessionToken,
        {
          billingAddress: shippingAddress,
          notes: checkoutNotes.trim() || null,
          paymentMethod: selectedPaymentMethod,
          shippingAddress
        },
        createIdempotencyKey()
      );

      setCheckoutResult(payload);
      setShowCart(false);
      setTrackingOrderId(null);
      setTrackingData(null);
      setTrackingError(null);
      await refreshCart(sessionToken);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Unable to place order.");
    } finally {
      setIsSubmittingCheckout(false);
    }
  }

  async function handleOpenPayment() {
    const checkoutUrl = checkoutResult?.payment.checkoutUrl;

    if (!checkoutUrl) {
      return;
    }

    try {
      const targetUrl = resolveAbsoluteUrl(checkoutUrl);
      const canOpen = await Linking.canOpenURL(targetUrl);

      if (!canOpen) {
        throw new Error("This payment link cannot be opened on the device.");
      }

      await Linking.openURL(targetUrl);
    } catch (error) {
      Alert.alert(
        "KhmerCart",
        error instanceof Error ? error.message : "Unable to open payment link."
      );
    }
  }

  async function handleTrackOrder() {
    if (!checkoutResult) {
      return;
    }

    await loadTracking(checkoutResult.orderId);
  }

  async function handleRefreshTracking() {
    if (!trackingOrderId) {
      return;
    }

    await loadTracking(trackingOrderId);
  }

  async function handleOpenTrackingLink() {
    const trackingUrl = trackingData?.shipment?.trackingUrl;

    if (!trackingUrl) {
      return;
    }

    try {
      const targetUrl = resolveAbsoluteUrl(trackingUrl);
      const canOpen = await Linking.canOpenURL(targetUrl);

      if (!canOpen) {
        throw new Error("This tracking link cannot be opened on the device.");
      }

      await Linking.openURL(targetUrl);
    } catch (error) {
      Alert.alert(
        "KhmerCart",
        error instanceof Error ? error.message : "Unable to open tracking link."
      );
    }
  }

  function handleReturnToStorefront() {
    setCheckoutResult(null);
    setTrackingOrderId(null);
    setTrackingData(null);
    setTrackingError(null);
    setShowCart(false);
    setSelectedProductSlug(null);
  }

  function renderLocaleChip(nextLocale: BuyerLocale) {
    const isSelected = locale === nextLocale;

    return (
      <Pressable
        key={nextLocale}
        onPress={() => setLocale(nextLocale)}
        style={[
          styles.localeChip,
          isSelected ? styles.localeChipSelected : null
        ]}
      >
        <Text
          style={[
            styles.localeChipText,
            isSelected ? styles.localeChipTextSelected : null
          ]}
        >
          {nextLocale.toUpperCase()}
        </Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />

        {trackingOrderId ? (
          <OrderTrackingScreen
            errorMessage={trackingError}
            isLoading={isTrackingLoading}
            locale={locale}
            tracking={trackingData}
            onBack={() => setTrackingOrderId(null)}
            onOpenTrackingLink={handleOpenTrackingLink}
            onRefresh={handleRefreshTracking}
          />
        ) : checkoutResult ? (
          <PaymentResultScreen
            locale={locale}
            result={checkoutResult}
            onBackToStorefront={handleReturnToStorefront}
            onOpenPayment={handleOpenPayment}
            onTrackOrder={handleTrackOrder}
          />
        ) : showCart ? (
          <CartScreen
            cart={cart}
            errorMessage={cartError ?? checkoutError ?? checkoutConfigError}
            isLoading={isCartLoading}
            isMutatingCart={isCartMutating}
            isSubmittingCheckout={isSubmittingCheckout}
            locale={locale}
            notes={checkoutNotes}
            paymentMethods={paymentMethods}
            selectedPaymentMethod={selectedPaymentMethod}
            shippingAddress={shippingAddress}
            onBack={() => setShowCart(false)}
            onChangeAddressField={(field, value) =>
              setShippingAddress((current) => ({
                ...current,
                [field]: value
              }))
            }
            onChangeNotes={setCheckoutNotes}
            onDecreaseItem={handleDecreaseItem}
            onIncreaseItem={handleIncreaseItem}
            onRemoveItem={handleRemoveItem}
            onSelectPaymentMethod={setSelectedPaymentMethod}
            onSubmitCheckout={handleSubmitCheckout}
          />
        ) : selectedProductSlug ? (
          <ProductDetailScreen
            canAddToCart={Boolean(sessionToken)}
            cartCount={cart.itemCount}
            errorMessage={productError}
            isAddingToCart={Boolean(addingVariantId)}
            isLoading={isProductLoading}
            locale={locale}
            onAddToCart={handleAddToCart}
            onBack={() => setSelectedProductSlug(null)}
            onOpenCart={handleOpenCart}
            product={selectedProduct}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
              <View style={styles.heroHeader}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroEyebrow}>KhmerCart Mobile</Text>
                  <Text style={styles.heroTitle}>{dictionary.heroTitle}</Text>
                  <Text style={styles.heroBody}>{dictionary.heroBody}</Text>
                </View>

                <View style={styles.localePanel}>
                  <Text style={styles.localeLabel}>{dictionary.localeLabel}</Text>
                  <View style={styles.localeRow}>
                    {(["en", "km"] as const).map(renderLocaleChip)}
                  </View>
                </View>
              </View>

              <View style={styles.storefrontNoteCard}>
                <Text style={styles.storefrontNoteText}>{dictionary.storefrontNote}</Text>
              </View>

              {isRestoringSession ? (
                <View style={styles.restoreCard}>
                  <ActivityIndicator color={palette.accent} />
                  <Text style={styles.restoreText}>{dictionary.loading}</Text>
                </View>
              ) : (
                <AuthPanel
                  apiBaseUrl={apiBaseUrl}
                  authError={authError}
                  authMessage={authMessage}
                  code={code}
                  identifier={identifier}
                  isSubmitting={isSubmittingAuth}
                  locale={locale}
                  otpRequest={otpRequestState}
                  session={session}
                  onChangeCode={setCode}
                  onChangeIdentifier={setIdentifier}
                  onRequestOtp={handleRequestOtp}
                  onSignOut={handleSignOut}
                  onVerifyOtp={handleVerifyOtp}
                />
              )}
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>{dictionary.featuredNow}</Text>
                <Text style={styles.sectionTitle}>{dictionary.browseTitle}</Text>
              </View>

              <View style={styles.sectionActions}>
                {session ? (
                  <View style={styles.sessionPill}>
                    <Text style={styles.sessionPillText}>
                      {resolveSessionLabel(session)}
                    </Text>
                  </View>
                ) : null}

                <Pressable onPress={handleOpenCart} style={styles.cartPill}>
                  <Text style={styles.cartPillText}>
                    {dictionary.openCart} {cart.itemCount > 0 ? `(${cart.itemCount})` : ""}
                  </Text>
                </Pressable>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.categoryRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <Pressable
                onPress={() => setSelectedCategory(null)}
                style={[
                  styles.categoryChip,
                  selectedCategory === null ? styles.categoryChipSelected : null
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === null ? styles.categoryChipTextSelected : null
                  ]}
                >
                  {dictionary.allCategories}
                </Text>
              </Pressable>

              {feedState.categories.map((category) => {
                const isSelected = selectedCategory === category;

                return (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={[
                      styles.categoryChip,
                      isSelected ? styles.categoryChipSelected : null
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected ? styles.categoryChipTextSelected : null
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {feedError ? <Text style={styles.errorBanner}>{feedError}</Text> : null}

            {isFeedLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={palette.accent} size="large" />
                <Text style={styles.loadingText}>{dictionary.feedLoading}</Text>
              </View>
            ) : null}

            {!isFeedLoading && feedState.items.length === 0 ? (
              <Text style={styles.emptyState}>{dictionary.feedEmpty}</Text>
            ) : null}

            <View style={styles.productList}>
              {feedState.items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  locale={locale}
                  onPress={() => setSelectedProductSlug(item.slug)}
                />
              ))}
            </View>

            {feedState.nextCursor ? (
              <Pressable
                onPress={handleLoadMore}
                style={({ pressed }) => [
                  styles.loadMoreButton,
                  pressed ? styles.buttonPressed : null
                ]}
              >
                {isLoadingMore ? (
                  <ActivityIndicator color={palette.card} />
                ) : (
                  <Text style={styles.loadMoreText}>{dictionary.loadMore}</Text>
                )}
              </Pressable>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  buttonPressed: {
    opacity: 0.9
  },
  cartPill: {
    alignSelf: "flex-start",
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  cartPillText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "700"
  },
  categoryChip: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  categoryChipSelected: {
    backgroundColor: palette.accent
  },
  categoryChipText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "600"
  },
  categoryChipTextSelected: {
    color: palette.card
  },
  categoryRow: {
    gap: 10,
    paddingHorizontal: 20
  },
  content: {
    gap: 18,
    paddingBottom: 48
  },
  emptyState: {
    color: palette.muted,
    fontSize: 15,
    paddingHorizontal: 20
  },
  errorBanner: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20
  },
  hero: {
    backgroundColor: palette.background,
    gap: 18,
    paddingBottom: 4,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  heroBody: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 23
  },
  heroCopy: {
    flex: 1,
    gap: 10
  },
  heroEyebrow: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  heroHeader: {
    gap: 18
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 40
  },
  loadMoreButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: palette.accent,
    borderRadius: 999,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 54,
    minWidth: 170,
    paddingHorizontal: 20
  },
  loadMoreText: {
    color: palette.card,
    fontSize: 15,
    fontWeight: "700"
  },
  loadingState: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  loadingText: {
    color: palette.muted,
    fontSize: 14
  },
  localeChip: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  localeChipSelected: {
    backgroundColor: palette.sun
  },
  localeChipText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "700"
  },
  localeChipTextSelected: {
    color: palette.card
  },
  localeLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  localePanel: {
    alignSelf: "flex-start",
    backgroundColor: palette.sunMuted,
    borderRadius: 24,
    gap: 10,
    padding: 14
  },
  localeRow: {
    flexDirection: "row",
    gap: 8
  },
  productList: {
    gap: 16,
    paddingHorizontal: 20
  },
  restoreCard: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  restoreText: {
    color: palette.muted,
    fontSize: 14
  },
  safeArea: {
    backgroundColor: palette.background,
    flex: 1
  },
  sectionActions: {
    alignItems: "flex-end",
    gap: 8
  },
  sectionEyebrow: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 4
  },
  sessionPill: {
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  sessionPillText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "700"
  },
  storefrontNoteCard: {
    backgroundColor: palette.accent,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  storefrontNoteText: {
    color: palette.card,
    fontSize: 15,
    lineHeight: 23
  }
});
