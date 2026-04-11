export type ApiErrorResponse = {
  error: string
  message: string
}

export type Currency = "KHR" | "USD"
export type Role = "BUYER" | "SELLER" | "ADMIN"
export type OtpChannel = "EMAIL" | "PHONE"
export type PaymentMethod = "COD" | "KHQR" | "PAYWAY" | "TOANCHET" | "WING"
export type BuyerStockState = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"
export type OrderLifecycleState =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "SELLER_CONFIRMED"
  | "PACKED"
  | "HANDED_TO_CARRIER"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
export type ShipmentStatus =
  | "PENDING"
  | "LABEL_CREATED"
  | "HANDED_TO_CARRIER"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RETURNED"
  | "FAILED"

export type SessionUser = {
  email: string | null
  id: string
  phone: string | null
  primaryRole: Role | null
  roles: Role[]
}

export type AuthSession = {
  expiresAt: string
  issuedAt: string
  user: SessionUser
}

export type RequestOtpResponse = {
  channel: OtpChannel
  challengeId: string
  devCode?: string
  expiresAt: string
  identifier: string
  provider: string
}

export type VerifyOtpResponse = {
  session: AuthSession
  token: string
}

export type BuyerCatalogImage = {
  altText: string
  id: string
  isPrimary: boolean
  url: string
}

export type BuyerCatalogVariant = {
  attributes: Record<string, string> | null
  availableQuantity: number
  compareAtPriceMinor: number | null
  currency: Currency
  id: string
  isDefault: boolean
  name: string
  priceMinor: number
  sku: string
  weightGrams: number | null
}

export type BuyerFeedItem = {
  category: string
  description: string
  featuredImage: BuyerCatalogImage | null
  id: string
  leadVariant: BuyerCatalogVariant
  name: string
  pricing: {
    compareAtPriceMinor: number | null
    currency: Currency
    priceMinor: number
  }
  publishedAt: string
  seller: {
    contact: string
    displayName: string
    id: string
    slug: string
  }
  slug: string
  stock: {
    availableQuantity: number
    state: BuyerStockState
  }
}

export type BuyerFeedResult = {
  categories: string[]
  items: BuyerFeedItem[]
  nextCursor: string | null
}

export type BuyerVideoFeedItem = {
  caption: string
  campaignBadges: string[]
  id: string
  isPinned: boolean
  product: {
    category: string
    description: string
    featuredImageUrl: string | null
    id: string
    leadVariant: {
      availableQuantity: number
      compareAtPriceMinor: number | null
      currency: Currency
      id: string
      name: string
      priceMinor: number
      sku: string
    }
    name: string
    pricing: {
      compareAtPriceMinor: number | null
      currency: Currency
      priceMinor: number
    }
    variants: Array<{
      availableQuantity: number
      compareAtPriceMinor: number | null
      currency: Currency
      id: string
      name: string
      priceMinor: number
      sku: string
    }>
    seller: {
      contact: string
      displayName: string
      id: string
      slug: string
    }
    slug: string
    stock: {
      availableQuantity: number
      state: BuyerStockState
    }
  }
  publishedAt: string
  seller: {
    contact: string
    displayName: string
    id: string
    slug: string
  }
  shoppableProducts: Array<{
    id: string
    name: string
    slug: string
  }>
  video: {
    aspectRatio: number | null
    durationSec: number | null
    posterUrl: string | null
    url: string | null
  }
}

export type BuyerVideoFeedResult = {
  items: BuyerVideoFeedItem[]
  nextCursor: string | null
}

export type BuyerProductDetail = BuyerFeedItem & {
  disclosures: {
    returnPolicy: string
    sellerAddress: string
    sellerContact: string
  }
  images: BuyerCatalogImage[]
  sellerRating?: {
    averageRating: number
    reviewCount: number
  }
  reviewSummary?: {
    averageRating: number
    reviewCount: number
  }
  variants: BuyerCatalogVariant[]
}

export type ProductReviewSummary = {
  averageRating: number
  entries: Array<{
    body: string
    buyerName: string
    createdAt: string
    headline: string | null
    id: string
    rating: number
  }>
  reviewCount: number
}

export type EligibleProductReviewOrder = {
  deliveredAt: string | null
  orderId: string
  orderNumber: string
  sellerDisplayName: string
}

export type SavedProductEntry = {
  createdAt: string
  id: string
  product: {
    id: string
    imageUrl: string | null
    name: string
    priceMinor: number | null
    sellerSlug: string
    slug: string
  }
}

export type FollowedSellerEntry = {
  createdAt: string
  id: string
  seller: {
    displayName: string
    followerCount: number
    id: string
    slug: string
  }
}

export type NotificationEntry = {
  actionUrl: string | null
  body: string
  createdAt: string
  id: string
  isRead: boolean
  kind: string
  title: string
}

export type BuyerCartItem = {
  availableQuantity: number
  currency: Currency | null
  id: string
  imageUrl: string | null
  lineSubtotalMinor: number | null
  productId: string
  productName: string
  productSlug: string
  quantity: number
  seller: {
    displayName: string
    id: string
    slug: string
  }
  unitPriceMinor: number | null
  variantId: string
  variantName: string
}

export type BuyerCart = {
  currency: Currency | null
  id: string | null
  itemCount: number
  items: BuyerCartItem[]
  seller: {
    displayName: string
    id: string
    slug: string
  } | null
  subtotalMinor: number
  totalMinor: number
  updatedAt: string | null
}

export type CheckoutAddressInput = {
  city?: string | null
  country?: string | null
  deliveryNotes?: string | null
  fullName?: string | null
  line1?: string | null
  line2?: string | null
  phone?: string | null
  postalCode?: string | null
  stateProvince?: string | null
}

export type CheckoutAddress = {
  city: string
  country: string
  deliveryNotes: string
  fullName: string
  line1: string
  line2: string
  phone: string
  postalCode: string
  stateProvince: string
}

export type BuyerCheckoutPayment = {
  checkoutUrl: string | null
  details: Record<string, unknown>
  displayName: string
  instructions: string
  method: PaymentMethod
  provider: "COD" | "BAKONG" | "PAYWAY" | "TOANCHET" | "WING"
  qrPayload: string | null
  reference: string
  status:
    | "NOT_REQUIRED"
    | "PENDING"
    | "PROCESSING"
    | "AUTHORIZED"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
}

export type BuyerCheckoutResult = {
  billingAddress: CheckoutAddress
  coupon: {
    code: string
    discountMinor: number
    id: string
    title: string
  } | null
  currency: Currency
  discountMinor: number
  idempotencyKey: string
  itemCount: number
  orderId: string
  orderNumber: string
  payment: BuyerCheckoutPayment
  replayed: boolean
  seller: {
    displayName: string
    id: string
    slug: string
  }
  shippingMinor: number
  shippingAddress: CheckoutAddress
  state: OrderLifecycleState
  subtotalMinor: number
  totalMinor: number
}

export type BuyerCheckoutPreview = {
  coupon: {
    code: string
    discountMinor: number
    id: string
    title: string
  } | null
  currency: Currency
  discountMinor: number
  itemCount: number
  seller: {
    displayName: string
    id: string
    slug: string
  }
  shippingMinor: number
  subtotalMinor: number
  totalMinor: number
}

export type ShipmentTimelineEvent = {
  actorName: string | null
  id: string
  message: string
  occurredAt: string
  source: "MANUAL" | "PROVIDER" | "SYSTEM"
  status: ShipmentStatus
}

export type ShipmentSummary = {
  carrier: string | null
  id: string
  providerShipmentId: string | null
  shippedAt: string | null
  status: ShipmentStatus
  trackingNumber: string | null
  trackingUrl: string | null
  updates: ShipmentTimelineEvent[]
}

export type BuyerOrderTrackingData = {
  currency: Currency
  orderId: string
  orderNumber: string
  placedAt: string | null
  seller: {
    contact: string
    displayName: string
    slug: string
  }
  shipment: ShipmentSummary | null
  state: OrderLifecycleState
  totalMinor: number
}

export type SellerDashboardData = {
  canListProducts: boolean
  documents: Array<{
    contentType: string
    createdAt: string
    fileName: string
    id: string
    s3Key: string
    sizeBytes: number | null
    type: string
    uploadedAt: string | null
  }>
  kycDocumentTypes: string[]
  missingRequirements: string[]
  seller: {
    businessDescription: string
    defaultCurrency: Currency
    displayName: string
    id: string | null
    kycApprovedAt: string | null
    kycNotes: string
    kycRejectedAt: string | null
    kycStatus: string
    kycSubmittedAt: string | null
    legalName: string
    payoutAccountName: string
    payoutAccountNumber: string
    payoutBankName: string
    payoutRoutingNumber: string
    slug: string
    supportEmail: string
    supportPhone: string
  }
  submitDisabled: boolean
  user: {
    email: string | null
    fullName: string
    id: string
    phone: string | null
  }
}

export type SellerCatalogVariant = {
  attributes: Record<string, string> | null
  compareAtPriceMinor: number | null
  createdAt: string
  currency: Currency | null
  id: string
  inventory: {
    availableQuantity: number
    onHandQuantity: number
    reorderPoint: number | null
    reservedQuantity: number
    updatedAt: string
  } | null
  isActive: boolean
  isDefault: boolean
  name: string
  position: number
  priceMinor: number | null
  sku: string
  updatedAt: string
  weightGrams: number | null
}

export type SellerCatalogProduct = {
  category: string
  createdAt: string
  description: string
  id: string
  images: Array<{
    altText: string
    id: string
    isPrimary: boolean
    position: number
    url: string
  }>
  moderationNotes: string
  moderationStatus: string
  name: string
  publishedAt: string | null
  returnPolicy: string
  sellerAddress: string
  sellerContact: string
  slug: string
  status: string
  updatedAt: string
  validationIssues: Array<{
    field: string
    message: string
  }>
  variants: SellerCatalogVariant[]
}

export type SellerCatalogData = {
  products: SellerCatalogProduct[]
  sellerCanActivateProducts: boolean
  sellerId: string | null
}

export type SellerShippingQueueData = {
  carriers: string[]
  orders: Array<{
    buyer: {
      email: string | null
      fullName: string
      id: string
      phone: string | null
    }
    canMarkDelivered: boolean
    canMarkHandedToCarrier: boolean
    canMarkInTransit: boolean
    currency: Currency
    orderId: string
    orderNumber: string
    placedAt: string | null
    shipment: ShipmentSummary | null
    state: OrderLifecycleState
    totalMinor: number
  }>
}

export type SellerVideoPost = {
  analytics: {
    addToCarts: number
    conversions: number
    impressions: number
    opens: number
    productOpens: number
  }
  attachments: Array<{
    id: string
    isPrimary: boolean
    name: string
    productId: string
    slug: string
  }>
  caption: string
  createdAt: string
  id: string
  moderationNotes: string | null
  moderationStatus: string
  posterUrl: string | null
  processingError: string | null
  product: {
    currency: Currency | null
    id: string
    moderationStatus: string
    name: string
    priceMinor: number | null
    publishedAt: string | null
    slug: string
    status: string
  }
  publishedAt: string | null
  status: "DRAFT" | "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | "PUBLISHED" | "ARCHIVED"
  updatedAt: string
  video: {
    aspectRatio: number | null
    durationSec: number | null
    url: string | null
  }
}

export type SellerVideoPostsData = {
  posts: SellerVideoPost[]
  sellerCanPublishPosts: boolean
  sellerId: string | null
}

export type SellerVideoPostUploadRequest = {
  expiresInSeconds: number
  fileRole: "POSTER" | "VIDEO"
  key: string
  uploadUrl: string
}

export type CheckoutConfigResponse = {
  paymentMethods: PaymentMethod[]
}

type JsonRequestOptions = {
  body?: unknown
  headers?: Record<string, string>
  method?: "GET" | "POST" | "PATCH"
  token?: string | null
}

type MutateCartItemInput = {
  action?: "ADD" | "REMOVE" | "SET"
  quantity?: number
  variantId: string
}

type SubmitCheckoutInput = {
  billingAddress?: CheckoutAddressInput | null
  couponCode?: string | null
  notes?: string | null
  paymentMethod?: PaymentMethod | null
  shippingAddress: CheckoutAddressInput
}

export type SaveSellerOnboardingInput = {
  businessDescription?: string | null
  defaultCurrency?: string | null
  displayName?: string | null
  legalName?: string | null
  payoutAccountName?: string | null
  payoutAccountNumber?: string | null
  payoutBankName?: string | null
  payoutRoutingNumber?: string | null
  slug?: string | null
  submitForReview?: boolean | null
  supportEmail?: string | null
  supportPhone?: string | null
}

export type CreateSellerProductInput = {
  category?: string | null
  description?: string | null
  name?: string | null
  returnPolicy?: string | null
  sellerAddress?: string | null
  sellerContact?: string | null
  slug?: string | null
  status?: string | null
  variants?: Array<{
    currency?: string | null
    inventoryQuantity?: number | null
    isActive?: boolean | null
    isDefault?: boolean | null
    name?: string | null
    priceMinor?: number | null
    reorderPoint?: number | null
    sku?: string | null
  }>
}

export type SaveSellerShipmentInput = {
  carrier?: string | null
  message?: string | null
  status?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
}

export type CreateSellerVideoPostInput = {
  attachmentProductIds?: string[] | null
  aspectRatio?: number | null
  caption?: string | null
  durationSec?: number | null
  posterKey?: string | null
  productId?: string | null
  status?: "DRAFT" | "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | "PUBLISHED" | "ARCHIVED" | null
  videoKey?: string | null
}

export type RequestSellerVideoPostUploadInput = {
  contentType?: string | null
  fileName?: string | null
  fileRole?: "POSTER" | "VIDEO" | null
}

const DEFAULT_API_BASE_URL = "http://127.0.0.1:3002"

function normalizeBaseUrl(value: string | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return DEFAULT_API_BASE_URL
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed
}

export function getApiBaseUrl() {
  return normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL)
}

export function getSellerBaseUrl() {
  return normalizeBaseUrl(process.env.EXPO_PUBLIC_SELLER_BASE_URL) || getApiBaseUrl()
}

export function resolveAbsoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value
  }

  const normalizedValue = value.startsWith("/") ? value : `/${value}`

  return `${getApiBaseUrl()}${normalizedValue}`
}

export function resolveAbsoluteSellerUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value
  }

  const normalizedValue = value.startsWith("/") ? value : `/${value}`

  return `${getSellerBaseUrl()}${normalizedValue}`
}

async function requestJsonFromBase<T>(
  baseUrl: string,
  path: string,
  options: JsonRequestOptions = {}
) {
  const requestUrl = `${baseUrl}${path}`
  const response = await fetch(`${baseUrl}${path}`, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers
    },
    method: options.method ?? "GET"
  })
  const text = await response.text()
  const contentType = response.headers.get("content-type") ?? ""
  const looksJson =
    !text ||
    contentType.toLowerCase().includes("application/json") ||
    /^[\s\r\n]*[{[]/.test(text)
  let payload: unknown = null

  if (looksJson && text) {
    try {
      payload = JSON.parse(text) as unknown
    } catch {
      throw new Error(
        `Expected JSON from ${requestUrl} but received an unreadable response.`
      )
    }
  } else if (text) {
    const responseKind = contentType || "non-JSON content"
    throw new Error(
      `Expected JSON from ${requestUrl} but received ${responseKind} (${response.status}).`
    )
  }

  if (!response.ok) {
    const apiError = payload as ApiErrorResponse | null
    const message =
      apiError && typeof apiError.message === "string"
        ? apiError.message
        : `Request failed with ${response.status}.`

    throw new Error(message)
  }

  return payload as T
}

async function requestJson<T>(path: string, options: JsonRequestOptions = {}) {
  return requestJsonFromBase<T>(getApiBaseUrl(), path, options)
}

async function requestSellerJson<T>(path: string, options: JsonRequestOptions = {}) {
  return requestJsonFromBase<T>(getSellerBaseUrl(), path, options)
}

export async function requestOtp(identifier: string) {
  return requestJson<RequestOtpResponse>("/api/auth/request-otp", {
    body: {
      identifier
    },
    method: "POST"
  })
}

export async function verifyOtp(identifier: string, code: string) {
  return requestJson<VerifyOtpResponse>("/api/auth/verify-otp", {
    body: {
      code,
      identifier
    },
    method: "POST"
  })
}

export async function readBuyerSession(token: string) {
  return requestJson<AuthSession>("/api/buyer/session", {
    token
  })
}

export async function listProducts(input?: {
  category?: string | null
  cursor?: string | null
  limit?: number | null
}) {
  const searchParams = new URLSearchParams()

  if (input?.category) {
    searchParams.set("category", input.category)
  }

  if (input?.cursor) {
    searchParams.set("cursor", input.cursor)
  }

  if (typeof input?.limit === "number") {
    searchParams.set("limit", String(input.limit))
  }

  const suffix = searchParams.toString()

  return requestJson<BuyerFeedResult>(`/api/products${suffix ? `?${suffix}` : ""}`)
}

export async function readProduct(slug: string) {
  return requestJson<BuyerProductDetail>(`/api/products/${encodeURIComponent(slug)}`)
}

export async function listVideoFeed(input?: {
  cursor?: string | null
  limit?: number | null
}) {
  const searchParams = new URLSearchParams()

  if (input?.cursor) {
    searchParams.set("cursor", input.cursor)
  }

  if (typeof input?.limit === "number") {
    searchParams.set("limit", String(input.limit))
  }

  const suffix = searchParams.toString()

  return requestJson<BuyerVideoFeedResult>(`/api/video-feed${suffix ? `?${suffix}` : ""}`)
}

export async function readCart(token: string) {
  return requestJson<BuyerCart>("/api/cart", {
    token
  })
}

export async function mutateCartItem(token: string, input: MutateCartItemInput) {
  return requestJson<BuyerCart>("/api/cart/items", {
    body: input,
    method: "POST",
    token
  })
}

export async function readCheckoutConfig() {
  return requestJson<CheckoutConfigResponse>("/api/checkout")
}

export async function submitCheckout(
  token: string,
  input: SubmitCheckoutInput,
  idempotencyKey: string
) {
  return requestJson<BuyerCheckoutResult>("/api/checkout", {
    body: input,
    headers: {
      "Idempotency-Key": idempotencyKey
    },
    method: "POST",
    token
  })
}

export async function previewCheckout(
  token: string,
  input: {
    couponCode?: string | null
  }
) {
  return requestJson<BuyerCheckoutPreview>("/api/checkout", {
    body: input,
    method: "PATCH",
    token
  })
}

export async function readOrderTracking(token: string, orderId: string) {
  return requestJson<BuyerOrderTrackingData>(
    `/api/buyer/orders/${encodeURIComponent(orderId)}`,
    {
      token
    }
  )
}

export async function readSellerDashboard(token: string) {
  return requestSellerJson<SellerDashboardData>("/api/onboarding", {
    token
  })
}

export async function saveSellerOnboarding(token: string, input: SaveSellerOnboardingInput) {
  return requestSellerJson<SellerDashboardData>("/api/onboarding", {
    body: input,
    method: "POST",
    token
  })
}

export async function readSellerCatalog(token: string) {
  return requestSellerJson<SellerCatalogData>("/api/products", {
    token
  })
}

export async function createSellerProduct(token: string, input: CreateSellerProductInput) {
  return requestSellerJson<SellerCatalogProduct>("/api/products", {
    body: input,
    method: "POST",
    token
  })
}

export async function readSellerShippingQueue(token: string) {
  return requestSellerJson<SellerShippingQueueData>("/api/shipping", {
    token
  })
}

export async function readSellerVideoPosts(token: string) {
  return requestSellerJson<SellerVideoPostsData>("/api/video-posts", {
    token
  })
}

export async function requestSellerVideoPostUpload(
  token: string,
  input: RequestSellerVideoPostUploadInput
) {
  return requestSellerJson<SellerVideoPostUploadRequest>("/api/video-posts/upload-url", {
    body: input,
    method: "POST",
    token
  })
}

export async function createSellerVideoPost(token: string, input: CreateSellerVideoPostInput) {
  return requestSellerJson<SellerVideoPost>("/api/video-posts", {
    body: input,
    method: "POST",
    token
  })
}

export async function recordVideoFeedMetric(
  input: {
    eventType:
      | "IMPRESSION"
      | "VIEWER_OPEN"
      | "PRODUCT_OPEN"
      | "ADD_TO_CART"
      | "CHECKOUT_START"
      | "ORDER_CONVERSION"
    videoPostId: string
  }
) {
  return requestJson<{ success: boolean }>("/api/video-feed/metrics", {
    body: input,
    method: "POST"
  })
}

export async function readProductReviews(slug: string) {
  return requestJson<ProductReviewSummary>(`/api/products/${encodeURIComponent(slug)}/reviews`)
}

export async function readProductReviewEligibility(token: string, slug: string) {
  return requestJson<EligibleProductReviewOrder[]>(
    `/api/products/${encodeURIComponent(slug)}/review-eligibility`,
    {
      token
    }
  )
}

export async function createProductReview(
  token: string,
  slug: string,
  input: {
    body?: string | null
    headline?: string | null
    orderId: string
    rating: number
  }
) {
  return requestJson<{ createdAt: string; id: string }>(
    `/api/products/${encodeURIComponent(slug)}/reviews`,
    {
      body: input,
      method: "POST",
      token
    }
  )
}

export async function toggleSavedProductState(token: string, productId: string) {
  return requestJson<{ saved: boolean }>(`/api/products/${encodeURIComponent(productId)}/save`, {
    method: "POST",
    token
  })
}

export async function toggleFollowedSellerState(token: string, sellerId: string) {
  return requestJson<{ following: boolean }>(`/api/sellers/${encodeURIComponent(sellerId)}/follow`, {
    method: "POST",
    token
  })
}

export async function readSavedProducts(token: string) {
  return requestJson<SavedProductEntry[]>("/api/account/saved-products", {
    token
  })
}

export async function readFollowedSellers(token: string) {
  return requestJson<FollowedSellerEntry[]>("/api/account/followed-sellers", {
    token
  })
}

export async function readNotifications(token: string) {
  return requestJson<NotificationEntry[]>("/api/notifications", {
    token
  })
}

export async function markNotificationAsRead(token: string, notificationId: string) {
  return requestJson<{ success: boolean }>("/api/notifications", {
    body: {
      notificationId
    },
    method: "PATCH",
    token
  })
}

export async function saveSellerShipment(
  token: string,
  orderId: string,
  input: SaveSellerShipmentInput
) {
  return requestSellerJson<ShipmentSummary>(`/api/orders/${encodeURIComponent(orderId)}/shipment`, {
    body: input,
    method: "POST",
    token
  })
}
