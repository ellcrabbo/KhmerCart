export const BUYER_LOCALES = ["en", "km"] as const;

export type BuyerLocale = (typeof BUYER_LOCALES)[number];

type BuyerDictionary = {
  allCategories: string;
  availability: string;
  availabilityInStock: string;
  availabilityLowStock: string;
  availabilityOutOfStock: string;
  backToFeed: string;
  browseTitle: string;
  categoryFilter: string;
  contactSeller: string;
  detailFallback: string;
  detailLoading: string;
  disclosures: string;
  featuredNow: string;
  feedEmpty: string;
  feedError: string;
  feedLoading: string;
  heroBody: string;
  heroEyebrow: string;
  heroTitle: string;
  loadMore: string;
  loading: string;
  localeLabel: string;
  notFound: string;
  orderNumber: string;
  orderState: string;
  orderTotal: string;
  placedAt: string;
  priceFrom: string;
  refreshTracking: string;
  returnPolicy: string;
  seller: string;
  sellerAddress: string;
  sellerSupport: string;
  shipmentPending: string;
  shipmentStatusLabel: string;
  stockUnits: string;
  storefrontNote: string;
  timelineEmpty: string;
  trackingAccessDenied: string;
  trackingCarrier: string;
  trackingCurrentStatus: string;
  trackingLink: string;
  trackingNextStep: string;
  trackingNumber: string;
  trackingPendingPaymentBody: string;
  trackingSellerConfirmedBody: string;
  trackingInTransitBody: string;
  trackingDeliveredBody: string;
  trackingFallbackBody: string;
  trackingPending: string;
  trackingSubtitle: string;
  trackingTimeline: string;
  trackingTitle: string;
  trackingUpdatedBy: string;
  variantLabel: string;
  viewTracking: string;
};

const dictionaries: Record<BuyerLocale, BuyerDictionary> = {
  en: {
    allCategories: "All categories",
    availability: "Availability",
    availabilityInStock: "In stock",
    availabilityLowStock: "Limited stock",
    availabilityOutOfStock: "Out of stock",
    backToFeed: "Back to discovery",
    browseTitle: "Discovery feed",
    categoryFilter: "Browse by category",
    contactSeller: "Seller contact",
    detailFallback: "This product is unavailable right now.",
    detailLoading: "Loading product details...",
    disclosures: "Disclosures",
    featuredNow: "Featured now",
    feedEmpty: "No products match this filter yet.",
    feedError: "Unable to load the feed right now.",
    feedLoading: "Loading products...",
    heroBody:
      "Browse active KhmerCart listings with visible disclosures, live variant stock, and seller context built in.",
    heroEyebrow: "KhmerCart marketplace",
    heroTitle: "Find goods that feel local, useful, and ready to ship.",
    loadMore: "Load more",
    loading: "Loading...",
    localeLabel: "Language",
    notFound: "Product not found.",
    orderNumber: "Order number",
    orderState: "Order state",
    orderTotal: "Order total",
    placedAt: "Placed at",
    priceFrom: "From",
    refreshTracking: "Refresh tracking",
    returnPolicy: "Return policy",
    seller: "Seller",
    sellerAddress: "Seller address",
    sellerSupport: "Seller support",
    shipmentPending: "Shipment updates will appear here once the seller hands the order to a carrier.",
    shipmentStatusLabel: "Shipment status",
    stockUnits: "units",
    storefrontNote: "Buyer-facing discovery with mobile-ready browsing and disclosure-first product pages.",
    timelineEmpty: "Tracking updates will appear once the seller or courier records movement.",
    trackingAccessDenied: "This order is unavailable for the current buyer session.",
    trackingCarrier: "Carrier",
    trackingCurrentStatus: "Current status",
    trackingLink: "Tracking link",
    trackingNextStep: "What happens next",
    trackingNumber: "Tracking number",
    trackingPendingPaymentBody:
      "The order has been created, but KhmerCart is still waiting for payment confirmation before the seller can continue fulfillment.",
    trackingSellerConfirmedBody:
      "The seller has acknowledged the order and is preparing the parcel for handoff.",
    trackingInTransitBody:
      "The parcel is with the carrier. Keep checking the shipment timeline for the latest movement.",
    trackingDeliveredBody:
      "The order shows as delivered. If something is wrong, contact seller support with the order number.",
    trackingFallbackBody:
      "KhmerCart will keep showing the latest payment and shipment updates for this order here.",
    trackingPending: "Pending",
    trackingSubtitle: "Follow carrier handoff, movement, and delivery updates for your order.",
    trackingTimeline: "Tracking timeline",
    trackingTitle: "Order tracking",
    trackingUpdatedBy: "Updated by",
    variantLabel: "Variants",
    viewTracking: "View tracking"
  },
  km: {
    allCategories: "ប្រភេទទាំងអស់",
    availability: "ស្ថានភាពស្តុក",
    availabilityInStock: "មានស្តុក",
    availabilityLowStock: "ស្តុកតិច",
    availabilityOutOfStock: "អស់ស្តុក",
    backToFeed: "ត្រឡប់ទៅការរកមើល",
    browseTitle: "បញ្ជីស្វែងរក",
    categoryFilter: "រកមើលតាមប្រភេទ",
    contactSeller: "ទំនាក់ទំនងអ្នកលក់",
    detailFallback: "ទំនិញនេះមិនអាចបង្ហាញបានទេ។",
    detailLoading: "កំពុងទាញព័ត៌មានទំនិញ...",
    disclosures: "ព័ត៌មានបង្ហាញជាសាធារណៈ",
    featuredNow: "កំពុងពេញនិយម",
    feedEmpty: "មិនទាន់មានទំនិញសម្រាប់តម្រងនេះទេ។",
    feedError: "មិនអាចទាញបញ្ជីទំនិញបានទេ។",
    feedLoading: "កំពុងទាញទំនិញ...",
    heroBody:
      "ស្វែងរកទំនិញ KhmerCart ដែលកំពុងដាក់លក់ជាមួយព័ត៌មានបង្ហាញ ស្តុកវ៉ារ្យ៉ង់ និងព័ត៌មានអ្នកលក់ច្បាស់លាស់។",
    heroEyebrow: "ទីផ្សារ KhmerCart",
    heroTitle: "ស្វែងរកទំនិញដែលមានប្រយោជន៍ ស្ទាយក្នុងស្រុក និងរួចរាល់សម្រាប់ដឹកជញ្ជូន។",
    loadMore: "បង្ហាញបន្ថែម",
    loading: "កំពុងទាញ...",
    localeLabel: "ភាសា",
    notFound: "រកមិនឃើញទំនិញទេ។",
    orderNumber: "លេខបញ្ជាទិញ",
    orderState: "ស្ថានភាពបញ្ជាទិញ",
    orderTotal: "សរុបបញ្ជាទិញ",
    placedAt: "បានបញ្ជាទិញនៅ",
    priceFrom: "ចាប់ពី",
    refreshTracking: "ធ្វើបច្ចុប្បន្នភាពការតាមដាន",
    returnPolicy: "គោលការណ៍ត្រឡប់ទំនិញ",
    seller: "អ្នកលក់",
    sellerAddress: "អាសយដ្ឋានអ្នកលក់",
    sellerSupport: "ទំនាក់ទំនងអ្នកលក់",
    shipmentPending: "ព័ត៌មានដឹកជញ្ជូននឹងបង្ហាញនៅទីនេះ នៅពេលអ្នកលក់ផ្ទេរទំនិញឱ្យក្រុមហ៊ុនដឹកជញ្ជូន។",
    shipmentStatusLabel: "ស្ថានភាពដឹកជញ្ជូន",
    stockUnits: "ឯកតា",
    storefrontNote: "ផ្ទាំង buyer ដែលផ្តោតលើការរកមើលតាមទូរស័ព្ទ និងការបង្ហាញព័ត៌មានសំខាន់ៗជាមុន។",
    timelineEmpty: "ព័ត៌មានតាមដាននឹងបង្ហាញនៅពេលអ្នកលក់ ឬក្រុមហ៊ុនដឹកជញ្ជូនកត់ត្រាការផ្លាស់ទី។",
    trackingAccessDenied: "មិនអាចបង្ហាញបញ្ជាទិញនេះសម្រាប់ session អ្នកទិញបច្ចុប្បន្នបានទេ។",
    trackingCarrier: "ក្រុមហ៊ុនដឹកជញ្ជូន",
    trackingCurrentStatus: "ស្ថានភាពបច្ចុប្បន្ន",
    trackingLink: "តំណភ្ជាប់តាមដាន",
    trackingNextStep: "អ្វីកើតឡើងបន្ទាប់",
    trackingNumber: "លេខតាមដាន",
    trackingPendingPaymentBody:
      "ការបញ្ជាទិញត្រូវបានបង្កើតរួចហើយ ប៉ុន្តែ KhmerCart កំពុងរង់ចាំការបញ្ជាក់ទូទាត់ មុនពេលអ្នកលក់អាចបន្តការរៀបចំទំនិញ។",
    trackingSellerConfirmedBody:
      "អ្នកលក់បានទទួលស្គាល់ការបញ្ជាទិញ ហើយកំពុងរៀបចំកញ្ចប់សម្រាប់ផ្ទេរទៅក្រុមហ៊ុនដឹកជញ្ជូន។",
    trackingInTransitBody:
      "កញ្ចប់កំពុងស្ថិតនៅជាមួយក្រុមហ៊ុនដឹកជញ្ជូន។ សូមពិនិត្យបញ្ជីព្រឹត្តិការណ៍ដឹកជញ្ជូនជាបន្តបន្ទាប់។",
    trackingDeliveredBody:
      "ការបញ្ជាទិញបង្ហាញថាបានដឹកដល់។ ប្រសិនបើមានបញ្ហា សូមទាក់ទងអ្នកលក់ជាមួយលេខបញ្ជាទិញ។",
    trackingFallbackBody:
      "KhmerCart នឹងបន្តបង្ហាញព័ត៌មានទូទាត់ និងដឹកជញ្ជូនថ្មីបំផុតសម្រាប់ការបញ្ជាទិញនេះ។",
    trackingPending: "កំពុងរង់ចាំ",
    trackingSubtitle: "តាមដានការប្រគល់ឱ្យក្រុមហ៊ុនដឹកជញ្ជូន ការផ្លាស់ទី និងការដឹកដល់សម្រាប់បញ្ជាទិញរបស់អ្នក។",
    trackingTimeline: "បញ្ជីព្រឹត្តិការណ៍តាមដាន",
    trackingTitle: "តាមដានបញ្ជាទិញ",
    trackingUpdatedBy: "បានកែប្រែដោយ",
    variantLabel: "វ៉ារ្យ៉ង់",
    viewTracking: "មើលការតាមដាន"
  }
};

export function readSupportedBuyerLocales(
  env: NodeJS.ProcessEnv = process.env
): BuyerLocale[] {
  const raw = env.SUPPORTED_LOCALES?.trim();

  if (!raw) {
    return ["en", "km"];
  }

  const parsed = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is BuyerLocale => value === "km" || value === "en");

  return parsed.length > 0 ? Array.from(new Set(parsed)) : ["en", "km"];
}

export function readDefaultBuyerLocale(
  env: NodeJS.ProcessEnv = process.env
): BuyerLocale {
  const configured = env.DEFAULT_LOCALE?.trim().toLowerCase();
  const supported = readSupportedBuyerLocales(env);

  if ((configured === "km" || configured === "en") && supported.includes(configured)) {
    return configured;
  }

  return supported[0] ?? "en";
}

export function resolveBuyerLocale(
  value: string | null | undefined,
  supportedLocales = readSupportedBuyerLocales(process.env),
  fallbackLocale = readDefaultBuyerLocale(process.env)
): BuyerLocale {
  if (value && (value === "km" || value === "en") && supportedLocales.includes(value)) {
    return value;
  }

  return fallbackLocale;
}

export function getBuyerDictionary(locale: BuyerLocale): BuyerDictionary {
  return dictionaries[locale];
}

export function resolveBuyerOrderStateLabel(
  locale: BuyerLocale,
  state:
    | "CANCELLED"
    | "COMPLETED"
    | "CREATED"
    | "DELIVERED"
    | "HANDED_TO_CARRIER"
    | "IN_TRANSIT"
    | "PACKED"
    | "PAYMENT_CONFIRMED"
    | "PAYMENT_PENDING"
    | "REFUNDED"
    | "SELLER_CONFIRMED"
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

export function resolveBuyerShipmentStatusLabel(
  locale: BuyerLocale,
  status:
    | "DELIVERED"
    | "FAILED"
    | "HANDED_TO_CARRIER"
    | "IN_TRANSIT"
    | "LABEL_CREATED"
    | "PENDING"
    | "RETURNED"
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
