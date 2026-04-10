import type {
  OrderLifecycleState,
  PaymentMethod,
  ShipmentStatus,
} from "../api/client";

export const BUYER_LOCALES = ["en", "km"] as const;

export type BuyerLocale = (typeof BUYER_LOCALES)[number];

type MobileDictionary = {
  accountTab: string;
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
  goToAccount: string;
  homeTab: string;
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
  ordersBody: string;
  ordersEmpty: string;
  ordersTab: string;
  otpCodePlaceholder: string;
  openTrackingCta: string;
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
  recentOrdersTitle: string;
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
  signInToShop: string;
  signOut: string;
  sellerCatalogTab: string;
  sellerCaption: string;
  sellerCenter: string;
  sellerCreateVideoPost: string;
  sellerCreateListing: string;
  sellerCreateTab: string;
  sellerCreatorBody: string;
  sellerCreatorMilestone: string;
  sellerCreatorNoApprovedProducts: string;
  sellerCreatorPostReady: string;
  sellerCreatorProductReady: string;
  sellerCreatorStepListing: string;
  sellerCreatorStepLive: string;
  sellerCreatorStepVideo: string;
  sellerDefaultCurrency: string;
  sellerDescription: string;
  sellerDisplayName: string;
  sellerDocuments: string;
  sellerGoLive: string;
  sellerInventory: string;
  sellerKycStatus: string;
  sellerLegalName: string;
  sellerListingsLocked: string;
  sellerListingsUnlocked: string;
  sellerMissingRequirements: string;
  sellerNoShipments: string;
  sellerOverviewBody: string;
  sellerOverviewTab: string;
  sellerPayoutBank: string;
  sellerPayoutName: string;
  sellerPayoutNumber: string;
  sellerPickPoster: string;
  sellerPickVideo: string;
  sellerPriceMinor: string;
  sellerProductName: string;
  sellerAttachedProduct: string;
  sellerPostsBody: string;
  sellerPostsTab: string;
  sellerNoPosterSelected: string;
  sellerNoPosts: string;
  sellerNoVideoSelected: string;
  sellerPublishVideoPost: string;
  sellerQuickListingBody: string;
  sellerSaveProfile: string;
  sellerSaveVideoDraft: string;
  sellerShippingTab: string;
  sellerSlug: string;
  sellerSupportEmail: string;
  sellerSupportPhone: string;
  sellerSwitchWorkspace: string;
  sellerTrackingNote: string;
  sellerTrackingUrl: string;
  sellerWorkspaceLocked: string;
  stateProvince: string;
  stockUnits: string;
  storefrontNote: string;
  subtotal: string;
  shipmentStatusLabel: string;
  tabBag: string;
  total: string;
  trackOrder: string;
  trackingLink: string;
  trackingNumber: string;
  trackingTitle: string;
  variantLabel: string;
  videoFeedBuyNow: string;
  videoFeedEmpty: string;
  videoFeedLoading: string;
  verifyOtp: string;
  viewStorefront: string;
};

const dictionaries: Record<BuyerLocale, MobileDictionary> = {
  en: {
    accountTab: "Account",
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
    browseTitle: "Shoppable video feed",
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
    goToAccount: "Open account",
    homeTab: "Home",
    heroBody:
      "Swipe through seller videos, jump into the product instantly, and keep the checkout loop fast enough for impulse shopping.",
    heroTitle: "Cambodian commerce should feel like content, not a catalog.",
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
    ordersBody:
      "Recent orders from this device stay close so buyers can jump back into payment or tracking without searching email.",
    ordersEmpty:
      "Your recent orders will appear here after checkout on this device.",
    ordersTab: "Orders",
    otpCodePlaceholder: "6-digit OTP",
    openTrackingCta: "Open tracking",
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
    recentOrdersTitle: "Recent orders",
    removeItem: "Remove",
    requestOtp: "Request OTP",
    returnPolicy: "Return policy",
    seller: "Seller",
    sellerAddress: "Seller address",
    sellerSupport: "Seller support",
    sessionSignedIn: "Signed in as",
    shipmentPending:
      "Shipment updates will appear here once the seller hands the order to a carrier.",
    shipmentTimeline: "Shipment timeline",
    shippingAddress: "Shipping address",
    signInRequired: "Sign in with a buyer session before using the cart.",
    signInToShop:
      "Sign in to unlock bag, checkout, and order tracking on this device.",
    signOut: "Sign out",
    sellerCatalogTab: "Catalog",
    sellerCaption: "Caption and selling hook",
    sellerCenter: "Seller Center",
    sellerCreateVideoPost: "Create shoppable post",
    sellerCreateListing: "Create listing",
    sellerCreateTab: "Create",
    sellerCreatorBody:
      "Build the TikTok Shop loop from your phone: list one product, attach a vertical clip, publish, then check it in the buyer feed.",
    sellerCreatorMilestone:
      "Published posts appear in the buyer video feed once the attached product is active and approved.",
    sellerCreatorNoApprovedProducts:
      "The selected product is not public-ready yet. Use an active, approved product for a live feed post, or save the video as a draft.",
    sellerCreatorPostReady: "Live posts",
    sellerCreatorProductReady: "Ready products",
    sellerCreatorStepListing: "Create the product",
    sellerCreatorStepLive: "Check the storefront",
    sellerCreatorStepVideo: "Attach the video",
    sellerDefaultCurrency: "Default currency",
    sellerDescription: "Business description",
    sellerDisplayName: "Store display name",
    sellerDocuments: "Documents",
    sellerGoLive: "Submit for review",
    sellerInventory: "Inventory",
    sellerKycStatus: "KYC status",
    sellerLegalName: "Legal name",
    sellerListingsLocked: "Listings locked",
    sellerListingsUnlocked: "Listings unlocked",
    sellerMissingRequirements: "Missing before review",
    sellerNoShipments: "No active shipments right now.",
    sellerOverviewBody:
      "Run the core seller loop from mobile: keep your profile ready, add products, and update shipping without opening the web studio.",
    sellerOverviewTab: "Overview",
    sellerPayoutBank: "Payout bank",
    sellerPayoutName: "Payout account name",
    sellerPayoutNumber: "Payout account number",
    sellerPickPoster: "Pick poster",
    sellerPickVideo: "Pick video",
    sellerPriceMinor: "Price (minor units)",
    sellerProductName: "Product name",
    sellerAttachedProduct: "Attach product",
    sellerPostsBody:
      "Upload a vertical clip, attach one approved product, and publish it into the buyer video feed.",
    sellerPostsTab: "Posts",
    sellerNoPosterSelected: "No poster selected yet.",
    sellerNoPosts:
      "No shoppable posts yet. Publish one clip to start the feed.",
    sellerNoVideoSelected: "No video selected yet.",
    sellerPublishVideoPost: "Publish post",
    sellerQuickListingBody:
      "Start with one fast listing: title, category, price, stock, and support contact.",
    sellerSaveProfile: "Save profile",
    sellerSaveVideoDraft: "Save draft",
    sellerShippingTab: "Shipping",
    sellerSlug: "Store slug",
    sellerSupportEmail: "Support email",
    sellerSupportPhone: "Support phone",
    sellerSwitchWorkspace: "Switch to seller workspace",
    sellerTrackingNote: "Shipment note",
    sellerTrackingUrl: "Tracking URL",
    sellerWorkspaceLocked: "This account does not have seller access yet.",
    stateProvince: "State / province",
    stockUnits: "units",
    storefrontNote:
      "A native buyer shell for KhmerCart that should eventually feel closer to TikTok Shop than a conventional storefront.",
    subtotal: "Subtotal",
    shipmentStatusLabel: "Shipment status",
    tabBag: "Bag",
    total: "Total",
    trackOrder: "Track order",
    trackingLink: "Open tracking link",
    trackingNumber: "Tracking number",
    trackingTitle: "Order tracking",
    variantLabel: "Variants",
    videoFeedBuyNow: "Open product",
    videoFeedEmpty: "No video posts are live yet.",
    videoFeedLoading: "Loading video feed...",
    verifyOtp: "Verify OTP",
    viewStorefront: "Back to storefront",
  },
  km: {
    accountTab: "គណនី",
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
    billingSameAsShipping:
      "អាសយដ្ឋានវិក្កយបត្រប្រើព័ត៌មានដូចអាសយដ្ឋានដឹកជញ្ជូនសិន។",
    browseTitle: "បញ្ជីវីដេអូលក់ទំនិញ",
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
    goToAccount: "បើកផ្ទាំងគណនី",
    homeTab: "ដើម",
    heroBody:
      "អូសមើលវីដេអូពីអ្នកលក់ បើកទំនិញភ្លាមៗ ហើយរក្សា checkout ឱ្យលឿនសម្រាប់ការទិញបែប impulse shopping។",
    heroTitle:
      "ពាណិជ្ជកម្មកម្ពុជាគួរតែមានអារម្មណ៍ដូច content មិនមែនកាតាឡុកធម្មតា។",
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
    ordersBody:
      "ការបញ្ជាទិញថ្មីៗនៅលើឧបករណ៍នេះនឹងនៅជិតដៃ ដើម្បីត្រឡប់ទៅការទូទាត់ ឬ tracking វិញបានលឿន។",
    ordersEmpty:
      "ការបញ្ជាទិញថ្មីៗរបស់អ្នកនឹងបង្ហាញនៅទីនេះ បន្ទាប់ពី checkout នៅលើឧបករណ៍នេះ។",
    ordersTab: "ការបញ្ជាទិញ",
    otpCodePlaceholder: "OTP ៦ ខ្ទង់",
    openTrackingCta: "បើក tracking",
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
    recentOrdersTitle: "ការបញ្ជាទិញថ្មីៗ",
    removeItem: "លុបចេញ",
    requestOtp: "ស្នើ OTP",
    returnPolicy: "គោលការណ៍ត្រឡប់ទំនិញ",
    seller: "អ្នកលក់",
    sellerAddress: "អាសយដ្ឋានអ្នកលក់",
    sellerSupport: "ជំនួយអ្នកលក់",
    sessionSignedIn: "បានចូលជា",
    shipmentPending:
      "ព័ត៌មានដឹកជញ្ជូននឹងបង្ហាញនៅទីនេះ នៅពេលអ្នកលក់ផ្ទេរទំនិញឱ្យក្រុមហ៊ុនដឹកជញ្ជូន។",
    shipmentTimeline: "ប្រវត្តិដឹកជញ្ជូន",
    shippingAddress: "អាសយដ្ឋានដឹកជញ្ជូន",
    signInRequired: "សូមចូល buyer session មុនពេលប្រើកន្ត្រក។",
    signInToShop:
      "សូមចូលគណនី ដើម្បីប្រើកន្ត្រក checkout និងតាមដានការបញ្ជាទិញនៅលើឧបករណ៍នេះ។",
    signOut: "ចេញ",
    sellerCatalogTab: "កាតាឡុក",
    sellerCaption: "Caption និង hook លក់",
    sellerCenter: "ផ្ទាំងអ្នកលក់",
    sellerCreateVideoPost: "បង្កើត post ទំនិញ",
    sellerCreateListing: "បង្កើតទំនិញ",
    sellerCreateTab: "បង្កើត",
    sellerCreatorBody:
      "បង្កើត loop ដូច TikTok Shop ពីទូរស័ព្ទ៖ បង្កើតទំនិញ ភ្ជាប់វីដេអូបញ្ឈរ បង្ហោះ ហើយពិនិត្យក្នុង buyer feed។",
    sellerCreatorMilestone:
      "Post ដែលបានបង្ហោះនឹងបង្ហាញក្នុង buyer video feed បន្ទាប់ពីទំនិញភ្ជាប់មានស្ថានភាព active និង approved។",
    sellerCreatorNoApprovedProducts:
      "ទំនិញដែលបានជ្រើសមិនទាន់រួចរាល់សម្រាប់ public feed ទេ។ ប្រើទំនិញ active និង approved ឬរក្សាទុកវីដេអូជា draft។",
    sellerCreatorPostReady: "Post live",
    sellerCreatorProductReady: "ទំនិញរួចរាល់",
    sellerCreatorStepListing: "បង្កើតទំនិញ",
    sellerCreatorStepLive: "ពិនិត្យ storefront",
    sellerCreatorStepVideo: "ភ្ជាប់វីដេអូ",
    sellerDefaultCurrency: "រូបិយប័ណ្ណលំនាំដើម",
    sellerDescription: "ពិពណ៌នាអាជីវកម្ម",
    sellerDisplayName: "ឈ្មោះហាង",
    sellerDocuments: "ឯកសារ",
    sellerGoLive: "ដាក់ស្នើពិនិត្យ",
    sellerInventory: "ស្តុក",
    sellerKycStatus: "ស្ថានភាព KYC",
    sellerLegalName: "ឈ្មោះផ្លូវច្បាប់",
    sellerListingsLocked: "មិនទាន់អាចដាក់លក់",
    sellerListingsUnlocked: "អាចដាក់លក់បាន",
    sellerMissingRequirements: "អ្វីដែលខ្វះមុនពេលពិនិត្យ",
    sellerNoShipments: "មិនទាន់មានការដឹកជញ្ជូនសកម្មទេ។",
    sellerOverviewBody:
      "គ្រប់គ្រងជំហានសំខាន់របស់អ្នកលក់តាមទូរស័ព្ទ៖ profile ទំនិញ និងការដឹកជញ្ជូន ដោយមិនចាំបាច់បើក web studio។",
    sellerOverviewTab: "ទិដ្ឋភាពទូទៅ",
    sellerPayoutBank: "ធនាគារទទួលប្រាក់",
    sellerPayoutName: "ឈ្មោះគណនីទទួលប្រាក់",
    sellerPayoutNumber: "លេខគណនីទទួលប្រាក់",
    sellerPickPoster: "ជ្រើស poster",
    sellerPickVideo: "ជ្រើសវីដេអូ",
    sellerPriceMinor: "តម្លៃ (ឯកតាតូច)",
    sellerProductName: "ឈ្មោះទំនិញ",
    sellerAttachedProduct: "ភ្ជាប់ទំនិញ",
    sellerPostsBody:
      "ផ្ទុកឡើងវីដេអូបញ្ឈរ ភ្ជាប់ទំនិញមួយ ហើយបង្ហោះវាចូលទៅក្នុង buyer video feed។",
    sellerPostsTab: "Posts",
    sellerNoPosterSelected: "មិនទាន់បានជ្រើស poster ទេ។",
    sellerNoPosts: "មិនទាន់មាន shoppable post ទេ។",
    sellerNoVideoSelected: "មិនទាន់បានជ្រើសវីដេអូទេ។",
    sellerPublishVideoPost: "បង្ហោះ post",
    sellerQuickListingBody:
      "ចាប់ផ្តើមដោយបង្កើត listing មួយឱ្យលឿន៖ ចំណងជើង ប្រភេទ តម្លៃ ស្តុក និងទំនាក់ទំនងគាំទ្រ។",
    sellerSaveProfile: "រក្សាទុក profile",
    sellerSaveVideoDraft: "រក្សាទុក draft",
    sellerShippingTab: "ដឹកជញ្ជូន",
    sellerSlug: "slug ហាង",
    sellerSupportEmail: "អ៊ីមែលគាំទ្រ",
    sellerSupportPhone: "លេខទូរស័ព្ទគាំទ្រ",
    sellerSwitchWorkspace: "ប្តូរទៅផ្ទាំងអ្នកលក់",
    sellerTrackingNote: "កំណត់ចំណាំដឹកជញ្ជូន",
    sellerTrackingUrl: "តំណ tracking",
    sellerWorkspaceLocked: "គណនីនេះមិនទាន់មានសិទ្ធិអ្នកលក់ទេ។",
    stateProvince: "រដ្ឋ / ខេត្ត",
    stockUnits: "ឯកតា",
    storefrontNote:
      "buyer app ជា native shell សម្រាប់ KhmerCart ដែលគួរតែទៅជាបទពិសោធន៍ video-first ដូច TikTok Shop។",
    subtotal: "សរុបរង",
    shipmentStatusLabel: "ស្ថានភាពដឹកជញ្ជូន",
    tabBag: "កន្ត្រក",
    total: "សរុប",
    trackOrder: "តាមដានការបញ្ជាទិញ",
    trackingLink: "បើកតំណ tracking",
    trackingNumber: "លេខតាមដាន",
    trackingTitle: "តាមដានការបញ្ជាទិញ",
    variantLabel: "វ៉ារ្យ៉ង់",
    videoFeedBuyNow: "បើកទំនិញ",
    videoFeedEmpty: "មិនទាន់មាន video post ដាក់ផ្សាយទេ។",
    videoFeedLoading: "កំពុងទាញ video feed...",
    verifyOtp: "បញ្ជាក់ OTP",
    viewStorefront: "ត្រឡប់ទៅហាង",
  },
};

export function getBuyerDictionary(locale: BuyerLocale): MobileDictionary {
  return dictionaries[locale];
}

export function readDefaultBuyerLocale(): BuyerLocale {
  const value = process.env.EXPO_PUBLIC_DEFAULT_LOCALE?.trim().toLowerCase();

  return value === "km" ? "km" : "en";
}

export function resolveBuyerLocale(
  value: string | null | undefined,
): BuyerLocale {
  return value === "km" ? "km" : "en";
}

export function resolveAvailabilityFromState(
  locale: BuyerLocale,
  state: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK",
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
  availableQuantity: number,
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
  method: PaymentMethod,
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
  state: OrderLifecycleState,
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
          SELLER_CONFIRMED: "អ្នកលក់បានបញ្ជាក់",
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
          SELLER_CONFIRMED: "Seller confirmed",
        };

  return labels[state];
}

export function resolveShipmentStatusLabel(
  locale: BuyerLocale,
  status: ShipmentStatus,
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
          RETURNED: "បានត្រឡប់",
        }
      : {
          DELIVERED: "Delivered",
          FAILED: "Failed",
          HANDED_TO_CARRIER: "Handed to carrier",
          IN_TRANSIT: "In transit",
          LABEL_CREATED: "Label created",
          PENDING: "Pending",
          RETURNED: "Returned",
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
    | "EXPIRED",
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
          SUCCEEDED: "ជោគជ័យ",
        }
      : {
          AUTHORIZED: "Authorized",
          CANCELLED: "Cancelled",
          EXPIRED: "Expired",
          FAILED: "Failed",
          NOT_REQUIRED: "Not required",
          PENDING: "Pending",
          PROCESSING: "Processing",
          SUCCEEDED: "Succeeded",
        };

  return labels[status];
}
