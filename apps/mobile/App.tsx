import type {
  AuthSession,
  BuyerCart,
  BuyerCheckoutResult,
  BuyerOrderTrackingData,
  BuyerProductDetail,
  BuyerVideoFeedResult,
  CheckoutAddressInput,
  CreateSellerProductInput,
  CreateSellerVideoPostInput,
  PaymentMethod,
  RequestOtpResponse,
  SaveSellerOnboardingInput,
  SaveSellerShipmentInput,
  SellerCatalogData,
  SellerDashboardData,
  SellerShippingQueueData,
  SellerVideoPostsData,
} from "./src/api/client";
import {
  createSellerVideoPost,
  createSellerProduct,
  getApiBaseUrl,
  listVideoFeed,
  mutateCartItem,
  readBuyerSession,
  readCart,
  readCheckoutConfig,
  readOrderTracking,
  readProduct,
  readSellerCatalog,
  readSellerDashboard,
  readSellerShippingQueue,
  readSellerVideoPosts,
  requestSellerVideoPostUpload,
  requestOtp,
  resolveAbsoluteUrl,
  saveSellerOnboarding,
  saveSellerShipment,
  submitCheckout,
  verifyOtp,
} from "./src/api/client";
import { AuthPanel } from "./src/components/AuthPanel";
import { CartScreen } from "./src/components/CartScreen";
import { OrdersScreen } from "./src/components/OrdersScreen";
import { OrderTrackingScreen } from "./src/components/OrderTrackingScreen";
import { PaymentResultScreen } from "./src/components/PaymentResultScreen";
import { PostViewerScreen } from "./src/components/PostViewerScreen";
import { ProductDetailScreen } from "./src/components/ProductDetailScreen";
import { SellerCatalogScreen } from "./src/components/SellerCatalogScreen";
import { SellerCreatorScreen } from "./src/components/SellerCreatorScreen";
import { SellerOverviewScreen } from "./src/components/SellerOverviewScreen";
import {
  SellerPostsScreen,
  type SellerVideoDraftState,
} from "./src/components/SellerPostsScreen";
import { SellerShippingScreen } from "./src/components/SellerShippingScreen";
import { VideoFeedScreen } from "./src/components/VideoFeedScreen";
import {
  getBuyerDictionary,
  readDefaultBuyerLocale,
  type BuyerLocale,
} from "./src/lib/i18n";
import {
  applyCheckoutToRecentOrders,
  applyTrackingToRecentOrders,
  readRecentOrders,
  rememberCheckoutOrder,
  rememberTrackedOrder,
  type BuyerRecentOrder,
} from "./src/lib/orders";
import {
  clearStoredSessionToken,
  readStoredSessionToken,
  writeStoredSessionToken,
} from "./src/lib/session";
import { palette } from "./src/lib/theme";
import * as ImagePicker from "expo-image-picker";
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
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type FeedState = BuyerVideoFeedResult;
type ShellTab = "home" | "cart" | "orders" | "account";
type SellerShellTab = "create" | "overview" | "catalog" | "posts" | "shipping";

type SelectedUploadAsset = {
  aspectRatio: number | null;
  durationSec: number | null;
  fileName: string;
  mimeType: string;
  uri: string;
};

const emptyFeedState: FeedState = {
  items: [],
  nextCursor: null,
};

const emptyCartState: BuyerCart = {
  currency: null,
  id: null,
  itemCount: 0,
  items: [],
  seller: null,
  subtotalMinor: 0,
  totalMinor: 0,
  updatedAt: null,
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
  stateProvince: "",
};

const initialSellerProfileDraft: SaveSellerOnboardingInput = {
  businessDescription: "",
  defaultCurrency: "KHR",
  displayName: "",
  legalName: "",
  payoutAccountName: "",
  payoutAccountNumber: "",
  payoutBankName: "",
  payoutRoutingNumber: "",
  slug: "",
  supportEmail: "",
  supportPhone: "",
};

const initialSellerProductDraft: CreateSellerProductInput = {
  category: "",
  description: "",
  name: "",
  returnPolicy:
    "Returns accepted within seven days if unused and in original condition.",
  sellerAddress: "",
  sellerContact: "",
  slug: "",
  status: "ACTIVE",
  variants: [
    {
      currency: "KHR",
      inventoryQuantity: 0,
      isActive: true,
      isDefault: true,
      name: "Default",
      priceMinor: 0,
      reorderPoint: 0,
      sku: "",
    },
  ],
};

const initialSellerVideoDraft: SellerVideoDraftState & {
  posterAsset: SelectedUploadAsset | null;
  videoAsset: SelectedUploadAsset | null;
} = {
  caption: "",
  durationSec: null,
  posterAsset: null,
  posterLabel: null,
  posterPreviewUrl: null,
  productId: null,
  status: "DRAFT",
  videoAsset: null,
  videoLabel: null,
};

function chooseDefaultSellerVideoProductId(catalog: SellerCatalogData) {
  return (
    catalog.products.find(
      (product) =>
        product.status === "ACTIVE" && product.moderationStatus === "APPROVED",
    )?.id ??
    catalog.products.find((product) => product.status === "ACTIVE")?.id ??
    catalog.products[0]?.id ??
    null
  );
}

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
  const [activeTab, setActiveTab] = useState<ShellTab>("home");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [recentOrders, setRecentOrders] = useState<BuyerRecentOrder[]>([]);
  const [isRestoringRecentOrders, setIsRestoringRecentOrders] = useState(true);

  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [otpRequestState, setOtpRequestState] =
    useState<RequestOtpResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isSellerMode, setIsSellerMode] = useState(false);
  const [sellerTab, setSellerTab] = useState<SellerShellTab>("create");
  const [sellerDashboard, setSellerDashboard] =
    useState<SellerDashboardData | null>(null);
  const [sellerCatalog, setSellerCatalog] = useState<SellerCatalogData | null>(
    null,
  );
  const [sellerShipping, setSellerShipping] =
    useState<SellerShippingQueueData | null>(null);
  const [sellerVideoPosts, setSellerVideoPosts] =
    useState<SellerVideoPostsData | null>(null);
  const [isSellerLoading, setIsSellerLoading] = useState(false);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [sellerMessage, setSellerMessage] = useState<string | null>(null);
  const [isSellerSaving, setIsSellerSaving] = useState(false);
  const [sellerProfileDraft, setSellerProfileDraft] =
    useState<SaveSellerOnboardingInput>(initialSellerProfileDraft);
  const [sellerProductDraft, setSellerProductDraft] =
    useState<CreateSellerProductInput>(initialSellerProductDraft);
  const [sellerVideoDraft, setSellerVideoDraft] = useState(
    initialSellerVideoDraft,
  );
  const [sellerShipmentDrafts, setSellerShipmentDrafts] = useState<
    Record<string, SaveSellerShipmentInput>
  >({});

  const [feedState, setFeedState] = useState<FeedState>(emptyFeedState);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(
    null,
  );
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] =
    useState<BuyerProductDetail | null>(null);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  const [cart, setCart] = useState<BuyerCart>(emptyCartState);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isCartMutating, setIsCartMutating] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [checkoutConfigError, setCheckoutConfigError] = useState<string | null>(
    null,
  );
  const [shippingAddress, setShippingAddress] = useState<CheckoutAddressInput>(
    initialShippingAddress,
  );
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] =
    useState<BuyerCheckoutResult | null>(null);

  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackingData, setTrackingData] =
    useState<BuyerOrderTrackingData | null>(null);
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
    if (
      !isSellerMode ||
      !sessionToken ||
      !session?.user.roles.includes("SELLER")
    ) {
      return;
    }

    let isActive = true;

    setIsSellerLoading(true);
    setSellerError(null);

    void (async () => {
      try {
        const [dashboard, catalog, shipping, posts] = await Promise.all([
          readSellerDashboard(sessionToken),
          readSellerCatalog(sessionToken),
          readSellerShippingQueue(sessionToken),
          readSellerVideoPosts(sessionToken),
        ]);

        if (!isActive) {
          return;
        }

        setSellerDashboard(dashboard);
        setSellerCatalog(catalog);
        setSellerShipping(shipping);
        setSellerVideoPosts(posts);
        setSellerProfileDraft({
          businessDescription: dashboard.seller.businessDescription,
          defaultCurrency: dashboard.seller.defaultCurrency,
          displayName: dashboard.seller.displayName,
          legalName: dashboard.seller.legalName,
          payoutAccountName: dashboard.seller.payoutAccountName,
          payoutAccountNumber: dashboard.seller.payoutAccountNumber,
          payoutBankName: dashboard.seller.payoutBankName,
          payoutRoutingNumber: dashboard.seller.payoutRoutingNumber,
          slug: dashboard.seller.slug,
          supportEmail: dashboard.seller.supportEmail,
          supportPhone: dashboard.seller.supportPhone,
        });
        setSellerShipmentDrafts(
          Object.fromEntries(
            shipping.orders.map((order) => [
              order.orderId,
              {
                carrier:
                  order.shipment?.carrier ?? shipping.carriers[0] ?? "OTHER",
                message: "",
                trackingNumber: order.shipment?.trackingNumber ?? "",
                trackingUrl: order.shipment?.trackingUrl ?? "",
              },
            ]),
          ),
        );
        setSellerVideoDraft((current) => ({
          ...current,
          productId:
            current.productId ?? chooseDefaultSellerVideoProductId(catalog),
        }));
      } catch (error) {
        if (isActive) {
          setSellerError(
            error instanceof Error
              ? error.message
              : "Unable to load seller workspace.",
          );
        }
      } finally {
        if (isActive) {
          setIsSellerLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isSellerMode, session?.user.roles, sessionToken]);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const storedOrders = await readRecentOrders();

      if (isActive) {
        setRecentOrders(storedOrders);
        setIsRestoringRecentOrders(false);
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
            error instanceof Error
              ? error.message
              : "Unable to load payment methods.",
          );
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (
      !selectedPaymentMethod ||
      paymentMethods.includes(selectedPaymentMethod)
    ) {
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
        const payload = await listVideoFeed();

        if (!isActive) {
          return;
        }

        setFeedState(payload);
      } catch (error) {
        if (isActive) {
          setFeedError(
            error instanceof Error ? error.message : dictionary.feedError,
          );
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
  }, [dictionary.feedError]);

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
          setProductError(
            error instanceof Error ? error.message : dictionary.detailFallback,
          );
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
          setCartError(
            error instanceof Error ? error.message : "Unable to load cart.",
          );
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
            phone: session.user.phone ?? "",
          },
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
      setCartError(
        error instanceof Error ? error.message : "Unable to load cart.",
      );
    } finally {
      setIsCartLoading(false);
    }
  }

  async function refreshSellerWorkspace(token = sessionToken) {
    if (!token || !session?.user.roles.includes("SELLER")) {
      return;
    }

    setIsSellerLoading(true);
    setSellerError(null);

    try {
      const [dashboard, catalog, shipping, posts] = await Promise.all([
        readSellerDashboard(token),
        readSellerCatalog(token),
        readSellerShippingQueue(token),
        readSellerVideoPosts(token),
      ]);

      setSellerDashboard(dashboard);
      setSellerCatalog(catalog);
      setSellerShipping(shipping);
      setSellerVideoPosts(posts);
      setSellerProfileDraft({
        businessDescription: dashboard.seller.businessDescription,
        defaultCurrency: dashboard.seller.defaultCurrency,
        displayName: dashboard.seller.displayName,
        legalName: dashboard.seller.legalName,
        payoutAccountName: dashboard.seller.payoutAccountName,
        payoutAccountNumber: dashboard.seller.payoutAccountNumber,
        payoutBankName: dashboard.seller.payoutBankName,
        payoutRoutingNumber: dashboard.seller.payoutRoutingNumber,
        slug: dashboard.seller.slug,
        supportEmail: dashboard.seller.supportEmail,
        supportPhone: dashboard.seller.supportPhone,
      });
      setSellerShipmentDrafts(
        Object.fromEntries(
          shipping.orders.map((order) => [
            order.orderId,
            {
              carrier:
                order.shipment?.carrier ?? shipping.carriers[0] ?? "OTHER",
              message: "",
              trackingNumber: order.shipment?.trackingNumber ?? "",
              trackingUrl: order.shipment?.trackingUrl ?? "",
            },
          ]),
        ),
      );
      setSellerVideoDraft((current) => ({
        ...current,
        productId:
          current.productId ?? chooseDefaultSellerVideoProductId(catalog),
      }));
    } catch (error) {
      setSellerError(
        error instanceof Error
          ? error.message
          : "Unable to refresh seller workspace.",
      );
    } finally {
      setIsSellerLoading(false);
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

      setRecentOrders((current) => {
        const nextOrders = applyTrackingToRecentOrders(current, payload);

        void rememberTrackedOrder(current, payload);

        return nextOrders;
      });
      setTrackingData(payload);
    } catch (error) {
      setTrackingError(
        error instanceof Error
          ? error.message
          : "Unable to load order tracking.",
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
      setAuthError(
        error instanceof Error ? error.message : "Unable to request OTP.",
      );
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
      setAuthError(
        error instanceof Error ? error.message : "Unable to verify OTP.",
      );
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
    setActiveTab("home");
    setCheckoutResult(null);
    setCheckoutError(null);
    setTrackingOrderId(null);
    setTrackingData(null);
    setTrackingError(null);
    setSelectedPostId(null);
    setIsSellerMode(false);
    setSellerTab("create");
    setSellerDashboard(null);
    setSellerCatalog(null);
    setSellerShipping(null);
    setSellerVideoPosts(null);
    setSellerError(null);
    setSellerMessage(null);
    setSellerVideoDraft(initialSellerVideoDraft);
  }

  function handleChangeSellerProfileField(
    field: keyof SaveSellerOnboardingInput,
    value: string,
  ) {
    setSellerProfileDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleChangeSellerProductDraft(
    field: keyof CreateSellerProductInput | "inventoryQuantity" | "priceMinor",
    value: string,
  ) {
    if (field === "inventoryQuantity" || field === "priceMinor") {
      setSellerProductDraft((current) => ({
        ...current,
        variants: [
          {
            ...(current.variants?.[0] ?? {}),
            inventoryQuantity:
              field === "inventoryQuantity"
                ? Number.parseInt(value || "0", 10) || 0
                : (current.variants?.[0]?.inventoryQuantity ?? 0),
            priceMinor:
              field === "priceMinor"
                ? Number.parseInt(value || "0", 10) || 0
                : (current.variants?.[0]?.priceMinor ?? 0),
          },
        ],
      }));
      return;
    }

    setSellerProductDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function createSelectedUploadAsset(
    asset: ImagePicker.ImagePickerAsset,
  ): SelectedUploadAsset {
    const fallbackName = asset.uri.split("/").at(-1) ?? `upload-${Date.now()}`;
    const width =
      typeof asset.width === "number" && asset.width > 0 ? asset.width : null;
    const height =
      typeof asset.height === "number" && asset.height > 0
        ? asset.height
        : null;

    return {
      aspectRatio: width && height ? width / height : null,
      durationSec:
        typeof asset.duration === "number" && Number.isFinite(asset.duration)
          ? Math.max(1, Math.round(asset.duration / 1000))
          : null,
      fileName: asset.fileName ?? fallbackName,
      mimeType: asset.mimeType ?? "application/octet-stream",
      uri: asset.uri,
    };
  }

  async function pickMediaAsset(mediaType: "images" | "videos") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      throw new Error("Media library access is required to upload files.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: mediaType,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return createSelectedUploadAsset(result.assets[0]);
  }

  async function uploadSelectedAsset(
    token: string,
    asset: SelectedUploadAsset,
    fileRole: "POSTER" | "VIDEO",
  ) {
    const uploadRequest = await requestSellerVideoPostUpload(token, {
      contentType: asset.mimeType,
      fileName: asset.fileName,
      fileRole,
    });
    const localResponse = await fetch(asset.uri);
    const blob = await localResponse.blob();
    const uploadResponse = await fetch(uploadRequest.uploadUrl, {
      body: blob,
      headers: {
        "Content-Type": asset.mimeType,
      },
      method: "PUT",
    });

    if (!uploadResponse.ok) {
      throw new Error(`Unable to upload ${fileRole.toLowerCase()} file.`);
    }

    return uploadRequest.key;
  }

  async function handlePickSellerVideo() {
    try {
      const asset = await pickMediaAsset("videos");

      if (!asset) {
        return;
      }

      setSellerVideoDraft((current) => ({
        ...current,
        durationSec: asset.durationSec,
        videoAsset: asset,
        videoLabel: asset.fileName,
      }));
      setSellerMessage("Video selected for the next post.");
      setSellerError(null);
    } catch (error) {
      setSellerError(
        error instanceof Error ? error.message : "Unable to pick a video.",
      );
    }
  }

  async function handlePickSellerPoster() {
    try {
      const asset = await pickMediaAsset("images");

      if (!asset) {
        return;
      }

      setSellerVideoDraft((current) => ({
        ...current,
        posterAsset: asset,
        posterLabel: asset.fileName,
        posterPreviewUrl: asset.uri,
      }));
      setSellerMessage("Poster selected for the next post.");
      setSellerError(null);
    } catch (error) {
      setSellerError(
        error instanceof Error ? error.message : "Unable to pick a poster.",
      );
    }
  }

  function handleChangeSellerVideoCaption(value: string) {
    setSellerVideoDraft((current) => ({
      ...current,
      caption: value,
    }));
  }

  function handleSelectSellerVideoProduct(productId: string) {
    setSellerVideoDraft((current) => ({
      ...current,
      productId,
    }));
  }

  function handleChangeSellerShipmentDraft(
    orderId: string,
    field: keyof SaveSellerShipmentInput,
    value: string,
  ) {
    setSellerShipmentDrafts((current) => ({
      ...current,
      [orderId]: {
        ...current[orderId],
        [field]: value,
      },
    }));
  }

  async function handleSaveSellerProfile(submitForReview = false) {
    if (!sessionToken) {
      return;
    }

    setIsSellerSaving(true);
    setSellerError(null);
    setSellerMessage(null);

    try {
      await saveSellerOnboarding(sessionToken, {
        ...sellerProfileDraft,
        submitForReview,
      });
      await refreshSellerWorkspace(sessionToken);
      setSellerMessage(
        submitForReview
          ? "Seller profile submitted for review."
          : "Seller profile saved.",
      );
    } catch (error) {
      setSellerError(
        error instanceof Error
          ? error.message
          : "Unable to save seller profile.",
      );
    } finally {
      setIsSellerSaving(false);
    }
  }

  async function handleCreateSellerListing() {
    if (!sessionToken) {
      return;
    }

    setIsSellerSaving(true);
    setSellerError(null);
    setSellerMessage(null);

    try {
      const createdProduct = await createSellerProduct(
        sessionToken,
        sellerProductDraft,
      );
      await refreshSellerWorkspace(sessionToken);
      setSellerVideoDraft((current) => ({
        ...current,
        productId: createdProduct.id,
      }));
      setSellerProductDraft(initialSellerProductDraft);
      setSellerMessage(
        "Seller listing created and attached to the next shoppable post.",
      );
    } catch (error) {
      setSellerError(
        error instanceof Error
          ? error.message
          : "Unable to create seller listing.",
      );
    } finally {
      setIsSellerSaving(false);
    }
  }

  async function handleCreateSellerVideoPost(
    status: CreateSellerVideoPostInput["status"],
  ) {
    if (!sessionToken) {
      return;
    }

    if (!sellerVideoDraft.videoAsset) {
      setSellerError("Select a video before saving a post.");
      return;
    }

    if (!sellerVideoDraft.productId) {
      setSellerError("Attach a product before saving a post.");
      return;
    }

    if (!sellerVideoDraft.caption.trim()) {
      setSellerError("Add a caption before saving a post.");
      return;
    }

    setIsSellerSaving(true);
    setSellerError(null);
    setSellerMessage(null);

    try {
      const [videoKey, posterKey] = await Promise.all([
        uploadSelectedAsset(sessionToken, sellerVideoDraft.videoAsset, "VIDEO"),
        sellerVideoDraft.posterAsset
          ? uploadSelectedAsset(
              sessionToken,
              sellerVideoDraft.posterAsset,
              "POSTER",
            )
          : Promise.resolve(null),
      ]);

      await createSellerVideoPost(sessionToken, {
        aspectRatio: sellerVideoDraft.videoAsset.aspectRatio,
        caption: sellerVideoDraft.caption.trim(),
        durationSec: sellerVideoDraft.videoAsset.durationSec,
        posterKey,
        productId: sellerVideoDraft.productId,
        status,
        videoKey,
      });
      await refreshSellerWorkspace(sessionToken);
      if (status === "PUBLISHED") {
        const nextFeed = await listVideoFeed();

        setFeedState(nextFeed);
        setFeedError(null);
        setIsFeedLoading(false);
        setSelectedProductSlug(null);
        setIsSellerMode(false);
        setActiveTab("home");
      }
      setSellerVideoDraft((current) => ({
        ...initialSellerVideoDraft,
        productId:
          current.productId ??
          (sellerCatalog
            ? chooseDefaultSellerVideoProductId(sellerCatalog)
            : null),
      }));
      setSellerMessage(
        status === "PUBLISHED"
          ? "Video post published."
          : "Video post saved as draft.",
      );
    } catch (error) {
      setSellerError(
        error instanceof Error
          ? error.message
          : "Unable to create seller video post.",
      );
    } finally {
      setIsSellerSaving(false);
    }
  }

  async function handleSaveSellerShipment(
    orderId: string,
    status?: "HANDED_TO_CARRIER" | "IN_TRANSIT" | "DELIVERED",
  ) {
    if (!sessionToken) {
      return;
    }

    setIsSellerSaving(true);
    setSellerError(null);
    setSellerMessage(null);

    try {
      await saveSellerShipment(sessionToken, orderId, {
        ...sellerShipmentDrafts[orderId],
        status,
      });
      await refreshSellerWorkspace(sessionToken);
      setSellerMessage("Shipment update saved.");
    } catch (error) {
      setSellerError(
        error instanceof Error
          ? error.message
          : "Unable to save shipment update.",
      );
    } finally {
      setIsSellerSaving(false);
    }
  }

  async function handleLoadMore() {
    if (!feedState.nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setFeedError(null);

    try {
      const payload = await listVideoFeed({
        cursor: feedState.nextCursor,
      });

      setFeedState((current) => ({
        items: [...current.items, ...payload.items],
        nextCursor: payload.nextCursor,
      }));
    } catch (error) {
      setFeedError(
        error instanceof Error ? error.message : dictionary.feedError,
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  function requireBuyerSession() {
    if (sessionToken) {
      return true;
    }

    Alert.alert("KhmerCart", dictionary.signInRequired);
    setActiveTab("account");
    return false;
  }

  async function handleOpenCart() {
    if (!requireBuyerSession()) {
      return;
    }

    setCheckoutError(null);
    setActiveTab("cart");

    if (!cart.id && sessionToken) {
      await refreshCart(sessionToken);
    }
  }

  async function handleOpenOrdersTab() {
    if (!requireBuyerSession()) {
      return;
    }

    setActiveTab("orders");
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
        variantId,
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
        variantId,
      });

      setCart(payload);
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "Unable to update cart.",
      );
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
        variantId,
      });

      setCart(payload);
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "Unable to update cart.",
      );
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
        variantId,
      });

      setCart(payload);
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "Unable to update cart.",
      );
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
          shippingAddress,
        },
        createIdempotencyKey(),
      );

      setCheckoutResult(payload);
      setRecentOrders((current) => {
        const nextOrders = applyCheckoutToRecentOrders(current, payload);

        void rememberCheckoutOrder(current, payload);

        return nextOrders;
      });
      setTrackingOrderId(null);
      setTrackingData(null);
      setTrackingError(null);
      await refreshCart(sessionToken);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Unable to place order.",
      );
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
        error instanceof Error ? error.message : "Unable to open payment link.",
      );
    }
  }

  async function handleTrackOrder() {
    if (!checkoutResult) {
      return;
    }

    setActiveTab("orders");
    await loadTracking(checkoutResult.orderId);
  }

  async function handleOpenRecentOrder(orderId: string) {
    if (!requireBuyerSession()) {
      return;
    }

    setActiveTab("orders");
    await loadTracking(orderId);
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
        error instanceof Error
          ? error.message
          : "Unable to open tracking link.",
      );
    }
  }

  function handleReturnToStorefront() {
    setCheckoutResult(null);
    setTrackingOrderId(null);
    setTrackingData(null);
    setTrackingError(null);
    setActiveTab("home");
    setSelectedProductSlug(null);
    setSelectedPostId(null);
  }

  function handleSelectTab(nextTab: ShellTab) {
    if (nextTab === "cart") {
      void handleOpenCart();
      return;
    }

    if (nextTab === "orders") {
      void handleOpenOrdersTab();
      return;
    }

    setActiveTab(nextTab);
  }

  function renderLocaleChip(nextLocale: BuyerLocale) {
    const isSelected = locale === nextLocale;

    return (
      <Pressable
        key={nextLocale}
        onPress={() => setLocale(nextLocale)}
        style={[
          styles.localeChip,
          isSelected ? styles.localeChipSelected : null,
        ]}
      >
        <Text
          style={[
            styles.localeChipText,
            isSelected ? styles.localeChipTextSelected : null,
          ]}
        >
          {nextLocale.toUpperCase()}
        </Text>
      </Pressable>
    );
  }

  function renderHomeTab() {
    return (
      <VideoFeedScreen
        errorMessage={feedError}
        isLoading={isFeedLoading}
        isLoadingMore={isLoadingMore}
        items={feedState.items}
        locale={locale}
        onEndReached={handleLoadMore}
        onOpenPost={setSelectedPostId}
        onOpenProduct={setSelectedProductSlug}
      />
    );
  }

  function renderAccountTab() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>{dictionary.accountTab}</Text>
              <Text style={styles.accountTitle}>{dictionary.authTitle}</Text>
              <Text style={styles.heroBody}>{dictionary.authBody}</Text>
            </View>

            <View style={styles.localePanel}>
              <Text style={styles.localeLabel}>{dictionary.localeLabel}</Text>
              <View style={styles.localeRow}>
                {(["en", "km"] as const).map(renderLocaleChip)}
              </View>
            </View>
          </View>

          {isRestoringSession ? (
            <View style={styles.restoreCard}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.restoreText}>{dictionary.loading}</Text>
            </View>
          ) : (
            <View style={styles.accountStack}>
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

              {session?.user.roles.includes("SELLER") ? (
                <View style={styles.workspaceCard}>
                  <Text style={styles.sectionEyebrow}>
                    {dictionary.sellerCenter}
                  </Text>
                  <Text style={styles.workspaceTitle}>
                    {dictionary.sellerSwitchWorkspace}
                  </Text>
                  <Text style={styles.workspaceBody}>
                    {dictionary.sellerOverviewBody}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setIsSellerMode(true);
                      setSellerTab("create");
                    }}
                    style={styles.summaryPrimaryButton}
                  >
                    <Text style={styles.summaryPrimaryButtonText}>
                      {dictionary.sellerCenter}
                    </Text>
                  </Pressable>
                </View>
              ) : session ? (
                <View style={styles.workspaceCard}>
                  <Text style={styles.sectionEyebrow}>
                    {dictionary.sellerCenter}
                  </Text>
                  <Text style={styles.workspaceBody}>
                    {dictionary.sellerWorkspaceLocked}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  function renderSellerTabButton(tab: SellerShellTab, label: string) {
    const isSelected = sellerTab === tab;

    return (
      <Pressable
        key={tab}
        onPress={() => setSellerTab(tab)}
        style={[styles.tabButton, isSelected ? styles.tabButtonSelected : null]}
      >
        <Text
          style={[
            styles.tabButtonText,
            isSelected ? styles.tabButtonTextSelected : null,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderSellerShellContent() {
    if (sellerTab === "create") {
      return (
        <SellerCreatorScreen
          catalog={sellerCatalog}
          dashboard={sellerDashboard}
          errorMessage={sellerError}
          isLoading={isSellerLoading}
          isSaving={isSellerSaving}
          locale={locale}
          message={sellerMessage}
          posts={sellerVideoPosts}
          productDraft={sellerProductDraft}
          videoDraft={sellerVideoDraft}
          onChangeCaption={handleChangeSellerVideoCaption}
          onChangeProductDraft={handleChangeSellerProductDraft}
          onCreateProduct={handleCreateSellerListing}
          onOpenCatalog={() => setSellerTab("catalog")}
          onOpenPosts={() => setSellerTab("posts")}
          onOpenStorefront={() => {
            setIsSellerMode(false);
            setActiveTab("home");
          }}
          onPickPoster={() => void handlePickSellerPoster()}
          onPickVideo={() => void handlePickSellerVideo()}
          onPublish={() => void handleCreateSellerVideoPost("PUBLISHED")}
          onSaveDraft={() => void handleCreateSellerVideoPost("DRAFT")}
          onSelectProduct={handleSelectSellerVideoProduct}
        />
      );
    }

    if (sellerTab === "catalog") {
      return (
        <SellerCatalogScreen
          catalog={sellerCatalog}
          draft={sellerProductDraft}
          errorMessage={sellerError}
          isCreating={isSellerSaving}
          isLoading={isSellerLoading}
          locale={locale}
          message={sellerMessage}
          onChangeDraft={handleChangeSellerProductDraft}
          onCreate={handleCreateSellerListing}
        />
      );
    }

    if (sellerTab === "shipping") {
      return (
        <SellerShippingScreen
          drafts={sellerShipmentDrafts}
          errorMessage={sellerError}
          isLoading={isSellerLoading}
          isSaving={isSellerSaving}
          locale={locale}
          queue={sellerShipping}
          statusMessage={sellerMessage}
          onChangeDraft={handleChangeSellerShipmentDraft}
          onSaveOrder={handleSaveSellerShipment}
        />
      );
    }

    if (sellerTab === "posts") {
      return (
        <SellerPostsScreen
          catalog={sellerCatalog}
          draft={sellerVideoDraft}
          errorMessage={sellerError}
          isCreating={isSellerSaving}
          isLoading={isSellerLoading}
          locale={locale}
          message={sellerMessage}
          posts={sellerVideoPosts}
          onChangeCaption={handleChangeSellerVideoCaption}
          onPickPoster={() => void handlePickSellerPoster()}
          onPickVideo={() => void handlePickSellerVideo()}
          onPublish={() => void handleCreateSellerVideoPost("PUBLISHED")}
          onSaveDraft={() => void handleCreateSellerVideoPost("DRAFT")}
          onSelectProduct={handleSelectSellerVideoProduct}
        />
      );
    }

    return (
      <SellerOverviewScreen
        data={sellerDashboard}
        errorMessage={sellerError}
        form={sellerProfileDraft}
        isLoading={isSellerLoading}
        isSaving={isSellerSaving}
        locale={locale}
        message={sellerMessage}
        onChangeField={handleChangeSellerProfileField}
        onSave={() => void handleSaveSellerProfile(false)}
        onSubmitForReview={() => void handleSaveSellerProfile(true)}
      />
    );
  }

  function renderTabButton(tab: ShellTab, label: string) {
    const isSelected = activeTab === tab;

    return (
      <Pressable
        key={tab}
        onPress={() => handleSelectTab(tab)}
        style={[styles.tabButton, isSelected ? styles.tabButtonSelected : null]}
      >
        <Text
          style={[
            styles.tabButtonText,
            isSelected ? styles.tabButtonTextSelected : null,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderShellContent() {
    if (activeTab === "cart") {
      return (
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
          onBack={() => setActiveTab("home")}
          onChangeAddressField={(field, value) =>
            setShippingAddress((current) => ({
              ...current,
              [field]: value,
            }))
          }
          onChangeNotes={setCheckoutNotes}
          onDecreaseItem={handleDecreaseItem}
          onIncreaseItem={handleIncreaseItem}
          onRemoveItem={handleRemoveItem}
          onSelectPaymentMethod={setSelectedPaymentMethod}
          onSubmitCheckout={handleSubmitCheckout}
        />
      );
    }

    if (activeTab === "orders") {
      return (
        <OrdersScreen
          isLoading={isRestoringRecentOrders}
          isSignedIn={Boolean(sessionToken)}
          locale={locale}
          orders={recentOrders}
          onOpenAccount={() => setActiveTab("account")}
          onOpenOrder={handleOpenRecentOrder}
        />
      );
    }

    if (activeTab === "account") {
      return renderAccountTab();
    }

    return renderHomeTab();
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
        ) : selectedPostId ? (
          <PostViewerScreen
            initialPostId={selectedPostId}
            items={feedState.items}
            locale={locale}
            onBack={() => setSelectedPostId(null)}
            onOpenProduct={setSelectedProductSlug}
          />
        ) : isSellerMode ? (
          <View style={styles.shell}>
            <View style={styles.shellBody}>{renderSellerShellContent()}</View>
            <View style={styles.tabBar}>
              {renderSellerTabButton("create", dictionary.sellerCreateTab)}
              {renderSellerTabButton("overview", dictionary.sellerOverviewTab)}
              {renderSellerTabButton("catalog", dictionary.sellerCatalogTab)}
              {renderSellerTabButton("posts", dictionary.sellerPostsTab)}
              {renderSellerTabButton("shipping", dictionary.sellerShippingTab)}
              <Pressable
                onPress={() => setIsSellerMode(false)}
                style={styles.tabButton}
              >
                <Text style={styles.tabButtonText}>{dictionary.homeTab}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.shell}>
            <View style={styles.shellBody}>{renderShellContent()}</View>
            <View style={styles.tabBar}>
              {renderTabButton("home", dictionary.homeTab)}
              {renderTabButton("cart", dictionary.tabBag)}
              {renderTabButton("orders", dictionary.ordersTab)}
              {renderTabButton("account", dictionary.accountTab)}
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  accountTitle: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
  },
  accountStack: {
    gap: 16,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  cartPill: {
    alignSelf: "flex-start",
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cartPillText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryChip: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  categoryChipSelected: {
    backgroundColor: palette.accent,
  },
  categoryChipText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  categoryChipTextSelected: {
    color: palette.card,
  },
  categoryRow: {
    gap: 10,
    paddingHorizontal: 20,
  },
  content: {
    gap: 18,
    paddingBottom: 48,
  },
  emptyState: {
    color: palette.muted,
    fontSize: 15,
    paddingHorizontal: 20,
  },
  errorBanner: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  heroPanel: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 32,
    borderWidth: 1,
    gap: 18,
    padding: 22,
  },
  hero: {
    backgroundColor: palette.background,
    gap: 18,
    paddingBottom: 4,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  heroBody: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  heroCopy: {
    flex: 1,
    gap: 10,
  },
  heroEyebrow: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroHeader: {
    gap: 18,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 40,
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
    paddingHorizontal: 20,
  },
  loadMoreText: {
    color: palette.card,
    fontSize: 15,
    fontWeight: "700",
  },
  loadingState: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingText: {
    color: palette.muted,
    fontSize: 14,
  },
  localeChip: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  localeChipSelected: {
    backgroundColor: palette.sun,
  },
  localeChipText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  localeChipTextSelected: {
    color: palette.card,
  },
  localeLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  localePanel: {
    alignSelf: "flex-start",
    backgroundColor: palette.sunMuted,
    borderRadius: 24,
    gap: 10,
    padding: 14,
  },
  localeRow: {
    flexDirection: "row",
    gap: 8,
  },
  productList: {
    gap: 16,
    paddingHorizontal: 20,
  },
  quickStatCard: {
    backgroundColor: palette.sunMuted,
    borderRadius: 22,
    flex: 1,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  quickStatLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  quickStatValue: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: "700",
  },
  quickStatsRow: {
    flexDirection: "row",
    gap: 12,
  },
  restoreCopy: {
    flex: 1,
    gap: 4,
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
    paddingVertical: 16,
  },
  restoreText: {
    color: palette.muted,
    fontSize: 14,
  },
  restoreTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  shell: {
    flex: 1,
  },
  shellBody: {
    flex: 1,
  },
  sectionActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  sectionEyebrow: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 4,
  },
  sessionSummaryActions: {
    flexDirection: "row",
    gap: 10,
  },
  sessionSummaryCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  sessionSummaryCopy: {
    gap: 6,
  },
  sessionSummaryValue: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  sessionPill: {
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sessionPillText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  storefrontNoteCard: {
    backgroundColor: palette.accent,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  storefrontNoteText: {
    color: palette.card,
    fontSize: 15,
    lineHeight: 23,
  },
  summaryGhostButton: {
    alignItems: "center",
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  summaryGhostButtonText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  summaryPrimaryButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  summaryPrimaryButtonText: {
    color: palette.card,
    fontSize: 13,
    fontWeight: "700",
  },
  tabBar: {
    backgroundColor: palette.card,
    borderTopColor: palette.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 8,
  },
  tabButtonSelected: {
    backgroundColor: palette.accent,
  },
  tabButtonText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  tabButtonTextSelected: {
    color: palette.card,
  },
  workspaceBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  workspaceCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  workspaceTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "700",
  },
});
