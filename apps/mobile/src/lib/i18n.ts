import type {
  OrderLifecycleState,
  PaymentMethod,
  ShipmentStatus
} from "../api/client";

export const BUYER_LOCALES = ["en", "km"] as const;

export type BuyerLocale = (typeof BUYER_LOCALES)[number];

type MobileDictionary = {
  addToCart: string;
  addingToCart: string;
  allCategories: string;
  apiBaseUrl: string;
  authBody: string;
  authTitle: string;
  availabilityInStock: string;
  availabilityLowStock: string;
  availabilityOutOfStock: string;
  backToCart: string;
  backToFeed: string;
  backToPayment: string;
  billingSameAsShipping: string;
  browseTitle: string;
  cartEmpty: string;
  cartLoading: string;
  cartTitle: string;
  cartUpdated: string;
  carrierLabel: string;
  categoryFilter: string;
  checkoutBody: string;
  checkoutNow: string;
  checkoutPlaced: string;
  checkoutSubmitting: string;
  city: string;
  continueShopping: string;
  contactSeller: string;
  country: string;
  deliveryNotes: string;
  detailFallback: string;
  detailLoading: string;
  devCode: string;
  disclosures: string;
  featuredNow: string;
  feedEmpty: string;
  feedError: string;
  feedLoading: string;
  fullName: string;
  heroBody: string;
  heroTitle: string;
  identifierPlaceholder: string;
  itemQuantity: string;
  itemsLabel: string;
  line1: string;
  line2: string;
  loadMore: string;
  loading: string;
  localeLabel: string;
  notesLabel: string;
  openCart: string;
  openPayment: string;
  orderNumber: string;
  orderStateLabel: string;
  orderSummary: string;
  otpCodePlaceholder: string;
  paymentInstructions: string;
  paymentMethodLabel: string;
  paymentQrPayload: string;
  paymentReference: string;
  paymentResultBody: string;
  paymentResultTitle: string;
  paymentStatusLabel: string;
  phone: string;
  placedAt: string;
  postalCode: string;
  priceFrom: string;
  quantityDecrease: string;
  quantityIncrease: string;
  refreshTracking: string;
  removeItem: string;
  requestOtp: string;
  returnPolicy: string;
  seller: string;
  sellerAddress: string;
  sellerSupport: string;
  sessionSignedIn: string;
  shipmentPending: string;
  shipmentTimeline: string;
  shippingAddress: string;
  signInRequired: string;
  signOut: string;
  stateProvince: string;
  stockUnits: string;
  storefrontNote: string;
  subtotal: string;
  shipmentStatusLabel: string;
  total: string;
  trackOrder: string;
  trackingLink: string;
  trackingNumber: string;
  trackingTitle: string;
  variantLabel: string;
  verifyOtp: string;
  viewStorefront: string;
};

const dictionaries: Record<BuyerLocale, MobileDictionary> = {
  en: {
    addToCart: "Add to cart",
    addingToCart: "Adding...",
    allCategories: "All categories",
    apiBaseUrl: "API base URL",
    authBody:
      "Request an OTP to unlock buyer session features. Browsing stays public, so you can still explore the storefront before signing in.",
    authTitle: "Buyer session",
    availabilityInStock: "In stock",
    availabilityLowStock: "Limited stock",
    availabilityOutOfStock: "Out of stock",
    backToCart: "Back to cart",
    backToFeed: "Back to discovery",
    backToPayment: "Back to payment",
    billingSameAsShipping: "Billing address uses the same details for now.",
    browseTitle: "Discovery feed",
    cartEmpty: "Your cart is empty. Add a product to start checkout.",
    cartLoading: "Refreshing your cart...",
    cartTitle: "Cart and checkout",
    cartUpdated: "Cart updated.",
    carrierLabel: "Carrier",
    categoryFilter: "Browse by category",
    checkoutBody:
      "Review quantities, add delivery details, then hand off payment to the configured provider.",
    checkoutNow: "Place order",
    checkoutPlaced: "Order placed",
    checkoutSubmitting: "Placing order...",
    city: "City / province",
    continueShopping: "Continue shopping",
    contactSeller: "Seller contact",
    country: "Country",
    deliveryNotes: "Delivery notes",
    detailFallback: "This product is unavailable right now.",
    detailLoading: "Loading product details...",
    devCode: "Dev OTP",
    disclosures: "Disclosures",
    featuredNow: "Featured now",
    feedEmpty: "No products match this filter yet.",
    feedError: "Unable to load the feed right now.",
    feedLoading: "Loading products...",
    fullName: "Recipient name",
    heroBody:
      "Browse active KhmerCart listings with visible disclosures, live variant stock, and seller context built in.",
    heroTitle: "Find goods that feel local, useful, and ready to ship.",
    identifierPlaceholder: "Email address or phone number",
    itemQuantity: "Qty",
    itemsLabel: "items",
    line1: "Street address",
    line2: "Apartment / landmark",
    loadMore: "Load more",
    loading: "Loading...",
    localeLabel: "Language",
    notesLabel: "Order notes",
    openCart: "Open cart",
    openPayment: "Open payment page",
    orderNumber: "Order number",
    orderStateLabel: "Order state",
    orderSummary: "Order summary",
    otpCodePlaceholder: "6-digit OTP",
    paymentInstructions: "Payment instructions",
    paymentMethodLabel: "Payment method",
    paymentQrPayload: "QR payload",
    paymentReference: "Payment reference",
    paymentResultBody:
      "The order is created. Use the payment instructions below, then keep tracking the shipment from inside the app.",
    paymentResultTitle: "Payment handoff",
    paymentStatusLabel: "Payment status",
    phone: "Phone number",
    placedAt: "Placed at",
    postalCode: "Postal code",
    priceFrom: "From",
    quantityDecrease: "Decrease quantity",
    quantityIncrease: "Increase quantity",
    refreshTracking: "Refresh tracking",
    removeItem: "Remove",
    requestOtp: "Request OTP",
    returnPolicy: "Return policy",
    seller: "Seller",
    sellerAddress: "Seller address",
    sellerSupport: "Seller support",
    sessionSignedIn: "Signed in as",
    shipmentPending: "Shipment updates will appear here once the seller hands the order to a carrier.",
    shipmentTimeline: "Shipment timeline",
    shippingAddress: "Shipping address",
    signInRequired: "Sign in with a buyer session before using the cart.",
    signOut: "Sign out",
    stateProvince: "State / province",
    stockUnits: "units",
    storefrontNote:
      "A native buyer shell for KhmerCart that talks to the shared API instead of embedding the web app.",
    subtotal: "Subtotal",
    shipmentStatusLabel: "Shipment status",
    total: "Total",
    trackOrder: "Track order",
    trackingLink: "Open tracking link",
    trackingNumber: "Tracking number",
    trackingTitle: "Order tracking",
    variantLabel: "Variants",
    verifyOtp: "Verify OTP",
    viewStorefront: "Back to storefront"
  },
  km: {
    addToCart: "បន្ថែមទៅកន្ត្រក",
    addingToCart: "កំពុងបន្ថែម...",
    allCategories: "ប្រភេទទាំងអស់",
    apiBaseUrl: "អាសយដ្ឋាន API",
    authBody:
      "ស្នើ OTP ដើម្បីបើកមុខងារ buyer session។ ការរកមើលទំនិញនៅតែសាធារណៈ ដូច្នេះអ្នកអាចមើលហាងបានមុនពេលចូលគណនី។",
    authTitle: "សម័យអ្នកទិញ",
    availabilityInStock: "មានស្តុក",
    availabilityLowStock: "ស្តុកតិច",
    availabilityOutOfStock: "អស់ស្តុក",
    backToCart: "ត្រឡប់ទៅកន្ត្រក",
    backToFeed: "ត្រឡប់ទៅការរកមើល",
    backToPayment: "ត្រឡប់ទៅការទូទាត់",
    billingSameAsShipping: "អាសយដ្ឋានវិក្កយបត្រប្រើព័ត៌មានដូចអាសយដ្ឋានដឹកជញ្ជូនសិន។",
    browseTitle: "បញ្ជីស្វែងរក",
    cartEmpty: "កន្ត្រកទំនិញទទេ។ បន្ថែមទំនិញមុនពេល checkout។",
    cartLoading: "កំពុងធ្វើបច្ចុប្បន្នកន្ត្រក...",
    cartTitle: "កន្ត្រក និង checkout",
    cartUpdated: "បានធ្វើបច្ចុប្បន្នកន្ត្រក។",
    carrierLabel: "ក្រុមហ៊ុនដឹកជញ្ជូន",
    categoryFilter: "រកមើលតាមប្រភេទ",
    checkoutBody:
      "ពិនិត្យបរិមាណ បញ្ចូលព័ត៌មានដឹកជញ្ជូន ហើយបន្តទៅអ្នកផ្តល់សេវាទូទាត់ដែលបានកំណត់។",
    checkoutNow: "បញ្ជាទិញ",
    checkoutPlaced: "បានបង្កើតការបញ្ជាទិញ",
    checkoutSubmitting: "កំពុងបញ្ជាទិញ...",
    city: "ក្រុង / ខេត្ត",
    continueShopping: "បន្តរកទំនិញ",
    contactSeller: "ទំនាក់ទំនងអ្នកលក់",
    country: "ប្រទេស",
    deliveryNotes: "កំណត់ចំណាំដឹកជញ្ជូន",
    detailFallback: "ទំនិញនេះមិនអាចបង្ហាញបានទេ។",
    detailLoading: "កំពុងទាញព័ត៌មានទំនិញ...",
    devCode: "OTP សម្រាប់ dev",
    disclosures: "ព័ត៌មានបង្ហាញជាសាធារណៈ",
    featuredNow: "កំពុងពេញនិយម",
    feedEmpty: "មិនទាន់មានទំនិញសម្រាប់តម្រងនេះទេ។",
    feedError: "មិនអាចទាញបញ្ជីទំនិញបានទេ។",
    feedLoading: "កំពុងទាញទំនិញ...",
    fullName: "ឈ្មោះអ្នកទទួល",
    heroBody:
      "ស្វែងរកទំនិញ KhmerCart ដែលកំពុងដាក់លក់ជាមួយព័ត៌មានបង្ហាញ ស្តុកវ៉ារ្យ៉ង់ និងព័ត៌មានអ្នកលក់ច្បាស់លាស់។",
    heroTitle: "ស្វែងរកទំនិញដែលមានប្រយោជន៍ ស្ទាយក្នុងស្រុក និងរួចរាល់សម្រាប់ដឹកជញ្ជូន។",
    identifierPlaceholder: "អ៊ីមែល ឬ លេខទូរស័ព្ទ",
    itemQuantity: "ចំនួន",
    itemsLabel: "មុខទំនិញ",
    line1: "អាសយដ្ឋានផ្លូវ",
    line2: "អគារ / ទីតាំងសម្គាល់",
    loadMore: "បង្ហាញបន្ថែម",
    loading: "កំពុងទាញ...",
    localeLabel: "ភាសា",
    notesLabel: "កំណត់ចំណាំការបញ្ជាទិញ",
    openCart: "បើកកន្ត្រក",
    openPayment: "បើកទំព័រទូទាត់",
    orderNumber: "លេខបញ្ជាទិញ",
    orderStateLabel: "ស្ថានភាពការបញ្ជាទិញ",
    orderSummary: "សរុបការបញ្ជាទិញ",
    otpCodePlaceholder: "OTP ៦ ខ្ទង់",
    paymentInstructions: "ការណែនាំទូទាត់",
    paymentMethodLabel: "វិធីសាស្ត្រទូទាត់",
    paymentQrPayload: "QR payload",
    paymentReference: "លេខយោងទូទាត់",
    paymentResultBody:
      "ការបញ្ជាទិញត្រូវបានបង្កើតហើយ។ ប្រើការណែនាំទូទាត់ខាងក្រោម ហើយតាមដានការដឹកជញ្ជូនក្នុង app បានបន្ត។",
    paymentResultTitle: "ជំហានបន្តទូទាត់",
    paymentStatusLabel: "ស្ថានភាពទូទាត់",
    phone: "លេខទូរស័ព្ទ",
    placedAt: "បានបញ្ជាទិញនៅ",
    postalCode: "កូដប្រៃសណីយ៍",
    priceFrom: "ចាប់ពី",
    quantityDecrease: "បន្ថយចំនួន",
    quantityIncrease: "បន្ថែមចំនួន",
    refreshTracking: "ធ្វើបច្ចុប្បន្នភាព tracking",
    removeItem: "លុបចេញ",
    requestOtp: "ស្នើ OTP",
    returnPolicy: "គោលការណ៍ត្រឡប់ទំនិញ",
    seller: "អ្នកលក់",
    sellerAddress: "អាសយដ្ឋានអ្នកលក់",
    sellerSupport: "ជំនួយអ្នកលក់",
    sessionSignedIn: "បានចូលជា",
    shipmentPending: "ព័ត៌មានដឹកជញ្ជូននឹងបង្ហាញនៅទីនេះ នៅពេលអ្នកលក់ផ្ទេរទំនិញឱ្យក្រុមហ៊ុនដឹកជញ្ជូន។",
    shipmentTimeline: "ប្រវត្តិដឹកជញ្ជូន",
    shippingAddress: "អាសយដ្ឋានដឹកជញ្ជូន",
    signInRequired: "សូមចូល buyer session មុនពេលប្រើកន្ត្រក។",
    signOut: "ចេញ",
    stateProvince: "រដ្ឋ / ខេត្ត",
    stockUnits: "ឯកតា",
    storefrontNote:
      "buyer app ជា native សម្រាប់ KhmerCart ដែលភ្ជាប់ទៅ API ដូចគ្នា ហើយរក្សាទម្រង់ discovery បច្ចុប្បន្ន។",
    subtotal: "សរុបរង",
    shipmentStatusLabel: "ស្ថានភាពដឹកជញ្ជូន",
    total: "សរុប",
    trackOrder: "តាមដានការបញ្ជាទិញ",
    trackingLink: "បើកតំណ tracking",
    trackingNumber: "លេខតាមដាន",
    trackingTitle: "តាមដានការបញ្ជាទិញ",
    variantLabel: "វ៉ារ្យ៉ង់",
    verifyOtp: "បញ្ជាក់ OTP",
    viewStorefront: "ត្រឡប់ទៅហាង"
  }
};

export function getBuyerDictionary(locale: BuyerLocale): MobileDictionary {
  return dictionaries[locale];
}

export function readDefaultBuyerLocale(): BuyerLocale {
  const value = process.env.EXPO_PUBLIC_DEFAULT_LOCALE?.trim().toLowerCase();

  return value === "km" ? "km" : "en";
}

export function resolveBuyerLocale(value: string | null | undefined): BuyerLocale {
  return value === "km" ? "km" : "en";
}

export function resolveAvailabilityFromState(
  locale: BuyerLocale,
  state: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"
) {
  const dictionary = getBuyerDictionary(locale);

  if (state === "OUT_OF_STOCK") {
    return dictionary.availabilityOutOfStock;
  }

  if (state === "LOW_STOCK") {
    return dictionary.availabilityLowStock;
  }

  return dictionary.availabilityInStock;
}

export function resolveAvailabilityFromQuantity(
  locale: BuyerLocale,
  availableQuantity: number
) {
  const dictionary = getBuyerDictionary(locale);

  if (availableQuantity <= 0) {
    return dictionary.availabilityOutOfStock;
  }

  if (availableQuantity <= 5) {
    return dictionary.availabilityLowStock;
  }

  return dictionary.availabilityInStock;
}

export function resolvePaymentMethodLabel(
  locale: BuyerLocale,
  method: PaymentMethod
) {
  if (locale === "km") {
    if (method === "COD") {
      return "បង់ប្រាក់ពេលដឹកដល់";
    }

    if (method === "KHQR") {
      return "KHQR";
    }

    if (method === "PAYWAY") {
      return "PayWay";
    }

    if (method === "TOANCHET") {
      return "Toanchet";
    }

    return "Wing";
  }

  if (method === "COD") {
    return "Cash on delivery";
  }

  if (method === "KHQR") {
    return "KHQR";
  }

  if (method === "PAYWAY") {
    return "PayWay";
  }

  if (method === "TOANCHET") {
    return "Toanchet";
  }

  return "Wing";
}

export function resolveOrderStateLabel(
  locale: BuyerLocale,
  state: OrderLifecycleState
) {
  const labels =
    locale === "km"
      ? {
          CANCELLED: "បានបោះបង់",
          COMPLETED: "បានបញ្ចប់",
          CREATED: "បានបង្កើត",
          DELIVERED: "បានដឹកដល់",
          HANDED_TO_CARRIER: "បានផ្ទេរឱ្យក្រុមហ៊ុនដឹកជញ្ជូន",
          IN_TRANSIT: "កំពុងដឹកជញ្ជូន",
          PACKED: "បានវេចខ្ចប់",
          PAYMENT_CONFIRMED: "បានបញ្ជាក់ទូទាត់",
          PAYMENT_PENDING: "កំពុងរង់ចាំទូទាត់",
          REFUNDED: "បានសងប្រាក់វិញ",
          SELLER_CONFIRMED: "អ្នកលក់បានបញ្ជាក់"
        }
      : {
          CANCELLED: "Cancelled",
          COMPLETED: "Completed",
          CREATED: "Created",
          DELIVERED: "Delivered",
          HANDED_TO_CARRIER: "Handed to carrier",
          IN_TRANSIT: "In transit",
          PACKED: "Packed",
          PAYMENT_CONFIRMED: "Payment confirmed",
          PAYMENT_PENDING: "Payment pending",
          REFUNDED: "Refunded",
          SELLER_CONFIRMED: "Seller confirmed"
        };

  return labels[state];
}

export function resolveShipmentStatusLabel(
  locale: BuyerLocale,
  status: ShipmentStatus
) {
  const labels =
    locale === "km"
      ? {
          DELIVERED: "បានដឹកដល់",
          FAILED: "បរាជ័យ",
          HANDED_TO_CARRIER: "បានផ្ទេរឱ្យក្រុមហ៊ុនដឹកជញ្ជូន",
          IN_TRANSIT: "កំពុងដឹកជញ្ជូន",
          LABEL_CREATED: "បានបង្កើតស្លាក",
          PENDING: "កំពុងរង់ចាំ",
          RETURNED: "បានត្រឡប់"
        }
      : {
          DELIVERED: "Delivered",
          FAILED: "Failed",
          HANDED_TO_CARRIER: "Handed to carrier",
          IN_TRANSIT: "In transit",
          LABEL_CREATED: "Label created",
          PENDING: "Pending",
          RETURNED: "Returned"
        };

  return labels[status];
}

export function resolvePaymentStatusLabel(
  locale: BuyerLocale,
  status:
    | "NOT_REQUIRED"
    | "PENDING"
    | "PROCESSING"
    | "AUTHORIZED"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
) {
  const labels =
    locale === "km"
      ? {
          AUTHORIZED: "បានអនុញ្ញាត",
          CANCELLED: "បានបោះបង់",
          EXPIRED: "ផុតកំណត់",
          FAILED: "បរាជ័យ",
          NOT_REQUIRED: "មិនចាំបាច់",
          PENDING: "កំពុងរង់ចាំ",
          PROCESSING: "កំពុងដំណើរការ",
          SUCCEEDED: "ជោគជ័យ"
        }
      : {
          AUTHORIZED: "Authorized",
          CANCELLED: "Cancelled",
          EXPIRED: "Expired",
          FAILED: "Failed",
          NOT_REQUIRED: "Not required",
          PENDING: "Pending",
          PROCESSING: "Processing",
          SUCCEEDED: "Succeeded"
        };

  return labels[status];
}
