import {
  Currency,
  DisputeReason,
  DisputeStatus,
  KycStatus,
  LedgerAccountType,
  OrderEventType,
  OrderState,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  ProductModerationStatus,
  ProductStatus,
  VideoPostModerationStatus,
  VideoPostStatus,
  ShipmentEventSource,
  ShipmentStatus,
  UserRole
} from "../packages/db/generated/prisma/enums";
import { prisma } from "../packages/db/src/prisma";

type BilingualText = {
  en: string;
  km: string;
};

type SeedVariantDefinition = {
  attributes: Record<string, string>;
  compareAtPriceMinor?: number;
  isDefault?: boolean;
  name: BilingualText;
  onHandQuantity: number;
  priceMinor: number;
  sku: string;
};

type SeedProductDefinition = {
  category: string;
  description: BilingualText;
  moderationNotes?: string;
  moderationStatus?: ProductModerationStatus;
  name: BilingualText;
  publishDaysAgo?: number | null;
  returnPolicy: BilingualText;
  slug: string;
  status?: ProductStatus;
  variants: SeedVariantDefinition[];
};

type SeedSellerDefinition = {
  address: BilingualText;
  currency: Currency;
  description: BilingualText;
  displayName: string;
  email: string;
  legalName: string;
  phone: string;
  products: SeedProductDefinition[];
  slug: string;
};

type SeedOrderDefinition = {
  buyerEmail: string;
  daysAgo: number;
  dispute?: {
    adminNote?: string;
    buyerMessage: string;
    reason: DisputeReason;
    requestedRefundMinor?: number;
    resolutionNote?: string;
    resolvedRefundMinor?: number;
    sellerResponse?: string;
    status: DisputeStatus;
  };
  note?: string;
  orderNumber: string;
  paymentMethod: PaymentMethod;
  sellerSlug: string;
  shippingAddressLabel: string;
  sku: string;
  state: OrderState;
  quantity: number;
};

const SEED_USER_AGENT = "seed-script";
const DEFAULT_ADMIN_EMAIL = "admin@khmercart.local";
const DEFAULT_ADMIN_PHONE = "+85510000001";
const DEFAULT_BUYER_EMAIL = "buyer@khmercart.local";
const DEFAULT_BUYER_PHONE = "+85510000002";
const DEFAULT_SUPPORTED_CURRENCIES = [Currency.KHR, Currency.USD];
const ORDER_PREFIX = "DEMO-ORDER-";

function bilingualInline(value: BilingualText): string {
  return `${value.en} / ${value.km}`;
}

function bilingualLong(value: BilingualText): string {
  return `EN: ${value.en} | KM: ${value.km}`;
}

function readSeedEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const rawValue = env.SEED_ENABLED?.trim().toLowerCase();

  if (rawValue === "false" || rawValue === "0" || rawValue === "no") {
    return false;
  }

  return true;
}

function getSupportedCurrencies(): Currency[] {
  const rawValue = process.env.SUPPORTED_CURRENCIES?.trim() || DEFAULT_SUPPORTED_CURRENCIES.join(",");
  const parsed = rawValue
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is Currency => value === Currency.KHR || value === Currency.USD);

  return parsed.length > 0 ? Array.from(new Set(parsed)) : DEFAULT_SUPPORTED_CURRENCIES;
}

function shiftDate(reference: Date, days: number, hours = 0): Date {
  return new Date(reference.getTime() - days * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000);
}

function createAddress(label: string) {
  return {
    city: "Phnom Penh",
    country: "Cambodia",
    line1: label,
    postalCode: "12000"
  };
}

function ensurePublishedAt(reference: Date, daysAgo: number | null | undefined) {
  if (daysAgo === null) {
    return null;
  }

  return shiftDate(reference, daysAgo ?? 0, 2);
}

function createImageUrls(slug: string) {
  return [
    `https://placehold.co/1200x1600/f3ecdf/10342d/png?text=${encodeURIComponent(slug.replaceAll("-", " "))}`,
    `https://placehold.co/1200x1600/e8dcc8/10342d/png?text=${encodeURIComponent(`${slug} detail`)}`
  ];
}

type SeedVideoPostDefinition = {
  caption: string;
  featuredScore?: number;
  isPinned?: boolean;
  manualBoost?: number;
  posterUrl: string;
  productSlug: string;
  sellerSlug: string;
  videoUrl: string;
};

function createSeedVideoPosts(): SeedVideoPostDefinition[] {
  return [
    {
      caption: "Mekong Crafts launch drop",
      featuredScore: 18,
      isPinned: true,
      manualBoost: 10,
      posterUrl:
        "https://placehold.co/720x1280/125b50/f4f0e8/png?text=Mekong+Crafts+drop",
      productSlug: "krama-scarf",
      sellerSlug: "mekong-crafts",
      videoUrl:
        "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    },
    {
      caption: "Small-batch pantry restock",
      featuredScore: 12,
      manualBoost: 6,
      posterUrl:
        "https://placehold.co/720x1280/5b3a12/f7efe2/png?text=Tonle+Gourmet+drop",
      productSlug: "prahok-spice-kit",
      sellerSlug: "tonle-gourmet",
      videoUrl:
        "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    },
  ];
}

async function reseedVideoPosts(now: Date) {
  const seedDefinitions = createSeedVideoPosts();
  const products = await prisma.product.findMany({
    select: {
      id: true,
      sellerId: true,
      slug: true,
      seller: {
        select: {
          slug: true,
        },
      },
    },
    where: {
      slug: {
        in: seedDefinitions.map((definition) => definition.productSlug),
      },
    },
  });

  const productBySellerAndSlug = new Map(
    products.map((product) => [`${product.seller.slug}:${product.slug}`, product]),
  );

  await prisma.videoPost.deleteMany({
    where: {
      OR: [
        {
          caption: {
            in: seedDefinitions.map((definition) => definition.caption),
          },
        },
        {
          videoKey: {
            in: seedDefinitions.map((definition) => definition.videoUrl),
          },
        },
      ],
    },
  });

  for (const [index, definition] of seedDefinitions.entries()) {
    const product = productBySellerAndSlug.get(
      `${definition.sellerSlug}:${definition.productSlug}`,
    );

    if (!product) {
      continue;
    }

    const publishedAt = shiftDate(now, seedDefinitions.length - index, 1);
    const post = await prisma.videoPost.create({
      data: {
        aspectRatio: 9 / 16,
        caption: definition.caption,
        featuredScore: definition.featuredScore ?? 0,
        isPinned: definition.isPinned ?? false,
        manualBoost: definition.manualBoost ?? 0,
        moderationStatus: VideoPostModerationStatus.APPROVED,
        posterKey: definition.posterUrl,
        processedAt: publishedAt,
        processingStartedAt: shiftDate(publishedAt, 0, 1),
        productId: product.id,
        publishedAt,
        sellerId: product.sellerId,
        status: VideoPostStatus.PUBLISHED,
        videoKey: definition.videoUrl,
      },
    });

    await prisma.videoPostAttachment.create({
      data: {
        isPrimary: true,
        position: 0,
        productId: product.id,
        videoPostId: post.id,
      },
    });
  }
}

function getOrderTimeline(state: OrderState): OrderState[] {
  switch (state) {
    case OrderState.PAYMENT_PENDING:
      return [OrderState.CREATED, OrderState.PAYMENT_PENDING];
    case OrderState.PAYMENT_CONFIRMED:
      return [OrderState.CREATED, OrderState.PAYMENT_PENDING, OrderState.PAYMENT_CONFIRMED];
    case OrderState.SELLER_CONFIRMED:
      return [OrderState.CREATED, OrderState.SELLER_CONFIRMED];
    case OrderState.PACKED:
      return [OrderState.CREATED, OrderState.SELLER_CONFIRMED, OrderState.PACKED];
    case OrderState.HANDED_TO_CARRIER:
      return [
        OrderState.CREATED,
        OrderState.SELLER_CONFIRMED,
        OrderState.PACKED,
        OrderState.HANDED_TO_CARRIER
      ];
    case OrderState.IN_TRANSIT:
      return [
        OrderState.CREATED,
        OrderState.SELLER_CONFIRMED,
        OrderState.PACKED,
        OrderState.HANDED_TO_CARRIER,
        OrderState.IN_TRANSIT
      ];
    case OrderState.DELIVERED:
      return [
        OrderState.CREATED,
        OrderState.SELLER_CONFIRMED,
        OrderState.PACKED,
        OrderState.HANDED_TO_CARRIER,
        OrderState.IN_TRANSIT,
        OrderState.DELIVERED
      ];
    case OrderState.COMPLETED:
      return [
        OrderState.CREATED,
        OrderState.SELLER_CONFIRMED,
        OrderState.PACKED,
        OrderState.HANDED_TO_CARRIER,
        OrderState.IN_TRANSIT,
        OrderState.DELIVERED,
        OrderState.COMPLETED
      ];
    case OrderState.CANCELLED:
      return [OrderState.CREATED, OrderState.PAYMENT_PENDING, OrderState.CANCELLED];
    case OrderState.REFUNDED:
      return [
        OrderState.CREATED,
        OrderState.PAYMENT_PENDING,
        OrderState.PAYMENT_CONFIRMED,
        OrderState.SELLER_CONFIRMED,
        OrderState.PACKED,
        OrderState.HANDED_TO_CARRIER,
        OrderState.IN_TRANSIT,
        OrderState.DELIVERED,
        OrderState.REFUNDED
      ];
    case OrderState.CREATED:
    default:
      return [OrderState.CREATED];
  }
}

function getOrderEventTypeForState(state: OrderState): OrderEventType {
  switch (state) {
    case OrderState.CREATED:
      return OrderEventType.CREATED;
    case OrderState.PAYMENT_CONFIRMED:
      return OrderEventType.PAYMENT_CAPTURED;
    case OrderState.SELLER_CONFIRMED:
      return OrderEventType.SELLER_CONFIRMED;
    case OrderState.PACKED:
      return OrderEventType.PACKED;
    case OrderState.HANDED_TO_CARRIER:
      return OrderEventType.HANDED_TO_CARRIER;
    case OrderState.IN_TRANSIT:
      return OrderEventType.SHIPPED;
    case OrderState.DELIVERED:
      return OrderEventType.DELIVERED;
    case OrderState.CANCELLED:
      return OrderEventType.CANCELLED;
    case OrderState.REFUNDED:
      return OrderEventType.REFUNDED;
    default:
      return OrderEventType.STATE_CHANGED;
  }
}

function createPlatformAccountCode(currency: Currency, suffix: string) {
  return `platform:${currency.toLowerCase()}:${suffix}`;
}

function createSellerAccountCode(sellerId: string, currency: Currency, suffix: string) {
  return `seller:${sellerId}:${currency.toLowerCase()}:${suffix}`;
}

async function ensureRole(userId: string, role: UserRole) {
  await prisma.userRoleAssignment.upsert({
    create: {
      role,
      userId
    },
    update: {},
    where: {
      userId_role: {
        role,
        userId
      }
    }
  });
}

async function ensureLedgerAccount(input: {
  code: string;
  currency: Currency;
  isSystem?: boolean;
  name: string;
  sellerId?: string;
  type: LedgerAccountType;
}) {
  return prisma.ledgerAccount.upsert({
    create: input,
    update: {
      currency: input.currency,
      isSystem: input.isSystem ?? false,
      name: input.name,
      sellerId: input.sellerId,
      type: input.type
    },
    where: {
      code: input.code
    }
  });
}

async function ensurePlatformLedgerAccounts(currencies: Currency[]) {
  for (const currency of currencies) {
    await ensureLedgerAccount({
      code: createPlatformAccountCode(currency, "cash"),
      currency,
      isSystem: true,
      name: `Platform cash ${currency}`,
      type: LedgerAccountType.ASSET
    });
    await ensureLedgerAccount({
      code: createPlatformAccountCode(currency, "fee_revenue"),
      currency,
      isSystem: true,
      name: `Platform fee revenue ${currency}`,
      type: LedgerAccountType.REVENUE
    });
    await ensureLedgerAccount({
      code: createPlatformAccountCode(currency, "cod_fee_receivable"),
      currency,
      isSystem: true,
      name: `Platform COD fee receivable ${currency}`,
      type: LedgerAccountType.ASSET
    });
  }
}

async function upsertAdmin() {
  const configuredEmail = process.env.ADMIN_SEED_EMAIL?.trim();
  const configuredPhone = process.env.SEED_ADMIN_PHONE?.trim();
  const email =
    configuredEmail && configuredEmail !== "UNSPECIFIED"
      ? configuredEmail.toLowerCase()
      : DEFAULT_ADMIN_EMAIL;
  const phone =
    configuredPhone && configuredPhone !== "UNSPECIFIED"
      ? configuredPhone
      : DEFAULT_ADMIN_PHONE;

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }]
    }
  });

  const admin = existingAdmin
    ? await prisma.user.update({
        data: {
          email,
          fullName: "KhmerCart Admin",
          isActive: true,
          phone
        },
        where: {
          id: existingAdmin.id
        }
      })
    : await prisma.user.create({
        data: {
          email,
          fullName: "KhmerCart Admin",
          phone
        }
      });

  await ensureRole(admin.id, UserRole.ADMIN);

  return admin;
}

async function upsertBuyer(input: { email: string; fullName: string; phone: string }) {
  const buyer = await prisma.user.upsert({
    create: {
      email: input.email,
      fullName: input.fullName,
      phone: input.phone
    },
    update: {
      fullName: input.fullName,
      isActive: true,
      phone: input.phone
    },
    where: {
      email: input.email
    }
  });

  await ensureRole(buyer.id, UserRole.BUYER);

  return buyer;
}

async function upsertApprovedSeller(
  input: SeedSellerDefinition,
  now: Date
) {
  const user = await prisma.user.upsert({
    create: {
      email: input.email,
      fullName: input.displayName,
      phone: input.phone
    },
    update: {
      fullName: input.displayName,
      isActive: true,
      phone: input.phone
    },
    where: {
      email: input.email
    }
  });

  await ensureRole(user.id, UserRole.SELLER);

  const seller = await prisma.seller.upsert({
    create: {
      businessDescription: bilingualLong(input.description),
      defaultCurrency: input.currency,
      displayName: input.displayName,
      isActive: true,
      kycApprovedAt: shiftDate(now, 12),
      kycNotes: "Seeded approved seller for UI demos.",
      kycStatus: KycStatus.APPROVED,
      legalName: input.legalName,
      payoutAccountName: `${input.displayName} Treasury`,
      payoutAccountNumber: `ACC-${input.slug.toUpperCase().replaceAll("-", "")}`,
      payoutBankName: input.currency === Currency.USD ? "ABA Bank" : "ACLEDA Bank",
      payoutRoutingNumber: `ROUTE-${input.slug.toUpperCase().replaceAll("-", "")}`,
      slug: input.slug,
      supportEmail: input.email,
      supportPhone: input.phone,
      userId: user.id
    },
    update: {
      businessDescription: bilingualLong(input.description),
      defaultCurrency: input.currency,
      displayName: input.displayName,
      isActive: true,
      kycApprovedAt: shiftDate(now, 12),
      kycNotes: "Seeded approved seller for UI demos.",
      kycStatus: KycStatus.APPROVED,
      legalName: input.legalName,
      payoutAccountName: `${input.displayName} Treasury`,
      payoutAccountNumber: `ACC-${input.slug.toUpperCase().replaceAll("-", "")}`,
      payoutBankName: input.currency === Currency.USD ? "ABA Bank" : "ACLEDA Bank",
      payoutRoutingNumber: `ROUTE-${input.slug.toUpperCase().replaceAll("-", "")}`,
      supportEmail: input.email,
      supportPhone: input.phone,
      userId: user.id
    },
    where: {
      slug: input.slug
    }
  });

  await ensureLedgerAccount({
    code: createSellerAccountCode(seller.id, input.currency, "held"),
    currency: input.currency,
    name: `${input.displayName} held balance`,
    sellerId: seller.id,
    type: LedgerAccountType.LIABILITY
  });
  await ensureLedgerAccount({
    code: createSellerAccountCode(seller.id, input.currency, "payable"),
    currency: input.currency,
    name: `${input.displayName} payable balance`,
    sellerId: seller.id,
    type: LedgerAccountType.LIABILITY
  });
  await ensureLedgerAccount({
    code: createSellerAccountCode(seller.id, input.currency, "cod_fee_receivable"),
    currency: input.currency,
    name: `${input.displayName} COD fee receivable`,
    sellerId: seller.id,
    type: LedgerAccountType.ASSET
  });

  for (const [index, productInput] of input.products.entries()) {
    const product = await prisma.product.upsert({
      create: {
        category: productInput.category,
        defaultCurrency: input.currency,
        description: bilingualLong(productInput.description),
        moderationNotes: productInput.moderationNotes ?? null,
        moderationStatus: productInput.moderationStatus ?? ProductModerationStatus.APPROVED,
        name: bilingualInline(productInput.name),
        publishedAt:
          (productInput.moderationStatus ?? ProductModerationStatus.APPROVED) === ProductModerationStatus.APPROVED
            ? ensurePublishedAt(now, productInput.publishDaysAgo ?? index)
            : null,
        returnPolicy: bilingualLong(productInput.returnPolicy),
        sellerAddress: bilingualLong(input.address),
        sellerContact: `${input.email} / ${input.phone}`,
        sellerId: seller.id,
        slug: productInput.slug,
        status: productInput.status ?? ProductStatus.ACTIVE
      },
      update: {
        category: productInput.category,
        defaultCurrency: input.currency,
        description: bilingualLong(productInput.description),
        moderationNotes: productInput.moderationNotes ?? null,
        moderationStatus: productInput.moderationStatus ?? ProductModerationStatus.APPROVED,
        name: bilingualInline(productInput.name),
        publishedAt:
          (productInput.moderationStatus ?? ProductModerationStatus.APPROVED) === ProductModerationStatus.APPROVED
            ? ensurePublishedAt(now, productInput.publishDaysAgo ?? index)
            : null,
        returnPolicy: bilingualLong(productInput.returnPolicy),
        sellerAddress: bilingualLong(input.address),
        sellerContact: `${input.email} / ${input.phone}`,
        status: productInput.status ?? ProductStatus.ACTIVE
      },
      where: {
        sellerId_slug: {
          sellerId: seller.id,
          slug: productInput.slug
        }
      }
    });

    await prisma.productImage.deleteMany({
      where: {
        productId: product.id
      }
    });

    await prisma.productImage.createMany({
      data: createImageUrls(productInput.slug).map((url, imageIndex) => ({
        altText: bilingualInline(productInput.name),
        isPrimary: imageIndex === 0,
        position: imageIndex,
        productId: product.id,
        url
      }))
    });

    const desiredVariantSkus = productInput.variants.map((variant) => variant.sku);

    for (const [variantIndex, variantInput] of productInput.variants.entries()) {
      const variant = await prisma.productVariant.upsert({
        create: {
          attributes: variantInput.attributes,
          compareAtPriceMinor: variantInput.compareAtPriceMinor,
          currency: input.currency,
          isActive: true,
          isDefault: variantInput.isDefault ?? false,
          name: bilingualInline(variantInput.name),
          position: variantIndex,
          priceMinor: variantInput.priceMinor,
          productId: product.id,
          sku: variantInput.sku
        },
        update: {
          attributes: variantInput.attributes,
          compareAtPriceMinor: variantInput.compareAtPriceMinor,
          currency: input.currency,
          isActive: true,
          isDefault: variantInput.isDefault ?? false,
          name: bilingualInline(variantInput.name),
          position: variantIndex,
          priceMinor: variantInput.priceMinor,
          productId: product.id
        },
        where: {
          sku: variantInput.sku
        }
      });

      await prisma.inventory.upsert({
        create: {
          availableQuantity: variantInput.onHandQuantity,
          onHandQuantity: variantInput.onHandQuantity,
          reorderPoint: Math.min(variantInput.onHandQuantity, 5),
          reservedQuantity: 0,
          sellerId: seller.id,
          variantId: variant.id
        },
        update: {
          availableQuantity: variantInput.onHandQuantity,
          onHandQuantity: variantInput.onHandQuantity,
          reorderPoint: Math.min(variantInput.onHandQuantity, 5),
          reservedQuantity: 0,
          sellerId: seller.id
        },
        where: {
          variantId: variant.id
        }
      });
    }

    await prisma.productVariant.deleteMany({
      where: {
        productId: product.id,
        sku: {
          notIn: desiredVariantSkus
        }
      }
    });
  }

  return seller;
}

async function upsertPendingSellerApplication(now: Date) {
  const user = await prisma.user.upsert({
    create: {
      email: "pending-seller@khmercart.local",
      fullName: "River Market Pantry",
      phone: "+85510000013"
    },
    update: {
      fullName: "River Market Pantry",
      isActive: true,
      phone: "+85510000013"
    },
    where: {
      email: "pending-seller@khmercart.local"
    }
  });

  await ensureRole(user.id, UserRole.SELLER);

  const seller = await prisma.seller.upsert({
    create: {
      businessDescription:
        "EN: Small-batch pantry seller waiting on marketplace approval. | KM: អ្នកលក់គ្រឿងទេសខ្នាតតូចកំពុងរង់ចាំការអនុម័តពីផ្សារ។",
      defaultCurrency: Currency.KHR,
      displayName: "River Market Pantry",
      kycNotes: "Seeded submission awaiting admin review.",
      kycStatus: KycStatus.SUBMITTED,
      kycSubmittedAt: shiftDate(now, 1),
      legalName: "River Market Pantry Co., Ltd.",
      payoutAccountName: "River Market Pantry Treasury",
      payoutAccountNumber: "ACC-RIVERMARKET001",
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: "ABA-RIVER-001",
      slug: "river-market-pantry",
      supportEmail: "pending-seller@khmercart.local",
      supportPhone: "+85510000013",
      userId: user.id
    },
    update: {
      businessDescription:
        "EN: Small-batch pantry seller waiting on marketplace approval. | KM: អ្នកលក់គ្រឿងទេសខ្នាតតូចកំពុងរង់ចាំការអនុម័តពីផ្សារ។",
      defaultCurrency: Currency.KHR,
      displayName: "River Market Pantry",
      kycNotes: "Seeded submission awaiting admin review.",
      kycStatus: KycStatus.SUBMITTED,
      kycSubmittedAt: shiftDate(now, 1),
      legalName: "River Market Pantry Co., Ltd.",
      payoutAccountName: "River Market Pantry Treasury",
      payoutAccountNumber: "ACC-RIVERMARKET001",
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: "ABA-RIVER-001",
      supportEmail: "pending-seller@khmercart.local",
      supportPhone: "+85510000013",
      userId: user.id
    },
    where: {
      slug: "river-market-pantry"
    }
  });

  await prisma.sellerDocument.upsert({
    create: {
      contentType: "application/pdf",
      fileName: "river-market-business-license.pdf",
      s3Key: "seed/river-market/business-license.pdf",
      sellerId: seller.id,
      type: "BUSINESS_LICENSE",
      uploadedAt: shiftDate(now, 1)
    },
    update: {
      contentType: "application/pdf",
      fileName: "river-market-business-license.pdf",
      sellerId: seller.id,
      type: "BUSINESS_LICENSE",
      uploadedAt: shiftDate(now, 1)
    },
    where: {
      s3Key: "seed/river-market/business-license.pdf"
    }
  });

  await prisma.sellerDocument.upsert({
    create: {
      contentType: "image/jpeg",
      fileName: "river-market-owner-id.jpg",
      s3Key: "seed/river-market/owner-id.jpg",
      sellerId: seller.id,
      type: "GOVERNMENT_ID",
      uploadedAt: shiftDate(now, 1)
    },
    update: {
      contentType: "image/jpeg",
      fileName: "river-market-owner-id.jpg",
      sellerId: seller.id,
      type: "GOVERNMENT_ID",
      uploadedAt: shiftDate(now, 1)
    },
    where: {
      s3Key: "seed/river-market/owner-id.jpg"
    }
  });

  return seller;
}

async function deleteExistingSeedOrders() {
  await prisma.paymentEvent.deleteMany({
    where: {
      order: {
        is: {
          orderNumber: {
            startsWith: ORDER_PREFIX
          }
        }
      }
    }
  });

  await prisma.order.deleteMany({
    where: {
      orderNumber: {
        startsWith: ORDER_PREFIX
      }
    }
  });
}

async function createSeedOrder(
  input: SeedOrderDefinition,
  context: {
    adminId: string;
    buyerIdByEmail: Map<string, string>;
    now: Date;
    sellersBySlug: Map<string, { id: string }>;
    variantBySku: Map<
      string,
      {
        currency: Currency | null;
        id: string;
        name: string;
        priceMinor: number | null;
        product: {
          id: string;
          name: string;
        };
      }
    >;
  }
) {
  const buyerId = context.buyerIdByEmail.get(input.buyerEmail);
  const seller = context.sellersBySlug.get(input.sellerSlug);
  const variant = context.variantBySku.get(input.sku);

  if (!buyerId || !seller || !variant || variant.currency === null || variant.priceMinor === null) {
    throw new Error(`Missing seed order dependency for ${input.orderNumber}.`);
  }

  const orderPlacedAt = shiftDate(context.now, input.daysAgo, 2);
  const subtotalMinor = variant.priceMinor * input.quantity;
  const totalMinor = subtotalMinor;
  const timeline = getOrderTimeline(input.state);
  const shippedAt =
    input.state === OrderState.HANDED_TO_CARRIER ||
    input.state === OrderState.IN_TRANSIT ||
    input.state === OrderState.DELIVERED ||
    input.state === OrderState.COMPLETED ||
    input.state === OrderState.REFUNDED
      ? shiftDate(context.now, input.daysAgo - 1, 6)
      : null;
  const deliveredAt =
    input.state === OrderState.DELIVERED ||
    input.state === OrderState.COMPLETED ||
    input.state === OrderState.REFUNDED
      ? shiftDate(context.now, Math.max(input.daysAgo - 2, 0), 4)
      : null;

  const order = await prisma.order.create({
    data: {
      billingAddress: createAddress(`${input.shippingAddressLabel} Billing`),
      buyerId,
      cancelledAt: input.state === OrderState.CANCELLED ? shiftDate(context.now, input.daysAgo, 1) : null,
      completedAt: input.state === OrderState.COMPLETED ? shiftDate(context.now, input.daysAgo - 1, 2) : null,
      currency: variant.currency,
      notes: input.note ?? null,
      orderNumber: input.orderNumber,
      paidAt:
        input.state === OrderState.PAYMENT_CONFIRMED ||
        input.state === OrderState.SELLER_CONFIRMED ||
        input.state === OrderState.PACKED ||
        input.state === OrderState.HANDED_TO_CARRIER ||
        input.state === OrderState.IN_TRANSIT ||
        input.state === OrderState.DELIVERED ||
        input.state === OrderState.COMPLETED ||
        input.state === OrderState.REFUNDED
          ? shiftDate(context.now, input.daysAgo, 1)
          : null,
      paymentMethod: input.paymentMethod,
      paymentReference:
        input.paymentMethod === PaymentMethod.COD
          ? null
          : `${input.paymentMethod}-${input.orderNumber}`,
      placedAt: orderPlacedAt,
      sellerId: seller.id,
      shippingAddress: createAddress(input.shippingAddressLabel),
      state: input.state,
      subtotalMinor,
      totalMinor,
      items: {
        create: {
          currency: variant.currency,
          productId: variant.product.id,
          productName: variant.product.name,
          quantity: input.quantity,
          sku: input.sku,
          subtotalMinor,
          unitPriceMinor: variant.priceMinor,
          variantId: variant.id,
          variantName: variant.name
        }
      }
    }
  });

  await prisma.orderEvent.createMany({
    data: timeline.map((state, index) => {
      const previousState = index > 0 ? timeline[index - 1] : null;

      return {
        actorUserId: index === 0 ? buyerId : context.adminId,
        createdAt: shiftDate(context.now, input.daysAgo, Math.max(0, 10 - index)),
        fromState: previousState,
        message:
          state === OrderState.CREATED
            ? "Seeded order created for demo flows."
            : `Seeded order advanced to ${state.replaceAll("_", " ").toLowerCase()}.`,
        orderId: order.id,
        payload: {
          actor: {
            label: index === 0 ? "Seeded buyer checkout" : "Seeded operations flow",
            role: index === 0 ? "BUYER" : "ADMIN",
            type: "USER",
            userId: index === 0 ? buyerId : context.adminId
          }
        },
        toState: state,
        type: getOrderEventTypeForState(state)
      };
    })
  });

  if (input.paymentMethod !== PaymentMethod.COD) {
    const paymentStatus =
      input.state === OrderState.PAYMENT_PENDING
        ? PaymentStatus.PENDING
        : input.state === OrderState.CANCELLED
          ? PaymentStatus.CANCELLED
          : input.state === OrderState.REFUNDED
            ? PaymentStatus.SUCCEEDED
            : PaymentStatus.SUCCEEDED;
    const provider =
      input.paymentMethod === PaymentMethod.KHQR
        ? PaymentProvider.BAKONG
        : input.paymentMethod === PaymentMethod.PAYWAY
          ? PaymentProvider.PAYWAY
          : PaymentProvider.TOANCHET;
    const payment = await prisma.payment.create({
      data: {
        amountMinor: totalMinor,
        capturedAt: paymentStatus === PaymentStatus.SUCCEEDED ? shiftDate(context.now, input.daysAgo, 1) : null,
        checkoutUrl: `https://payments.khmercart.local/${input.orderNumber.toLowerCase()}`,
        currency: variant.currency,
        instructions:
          input.paymentMethod === PaymentMethod.KHQR
            ? "Scan the QR code to pay."
            : "Follow the hosted payment instructions.",
        method: input.paymentMethod,
        orderId: order.id,
        provider,
        providerPaymentId: `${provider}-${input.orderNumber}`,
        providerReference: `${provider}-${input.orderNumber}`,
        qrPayload:
          input.paymentMethod === PaymentMethod.KHQR
            ? `000201010211${input.orderNumber}`
            : null,
        status: paymentStatus
      }
    });

    await prisma.paymentEvent.create({
      data: {
        eventType:
          paymentStatus === PaymentStatus.PENDING ? "payment.pending" : "payment.succeeded",
        headersHash: `${input.orderNumber}-headers`,
        idempotencyKey: `${input.orderNumber}-payment`,
        metadata: {
          paymentMethod: input.paymentMethod
        },
        orderId: order.id,
        payloadHash: `${input.orderNumber}-payload`,
        paymentId: payment.id,
        processedAt: shiftDate(context.now, input.daysAgo, 1),
        provider,
        providerEventId: `${provider}-${input.orderNumber}-event`,
        providerStatus: paymentStatus,
        signatureVerified: false
      }
    });
  }

  if (
    input.state === OrderState.HANDED_TO_CARRIER ||
    input.state === OrderState.IN_TRANSIT ||
    input.state === OrderState.DELIVERED ||
    input.state === OrderState.COMPLETED ||
    input.state === OrderState.REFUNDED
  ) {
    const shipmentStatus =
      input.state === OrderState.HANDED_TO_CARRIER
        ? ShipmentStatus.HANDED_TO_CARRIER
        : input.state === OrderState.IN_TRANSIT
          ? ShipmentStatus.IN_TRANSIT
          : ShipmentStatus.DELIVERED;
    const shipment = await prisma.shipment.create({
      data: {
        carrier: "JNT",
        deliveredAt,
        orderId: order.id,
        providerShipmentId: `JNT-${input.orderNumber}`,
        sellerId: seller.id,
        shippedAt,
        status: shipmentStatus,
        trackingNumber: `JNT-${input.orderNumber.slice(-4)}`,
        trackingUrl: `https://tracking.khmercart.local/${input.orderNumber.toLowerCase()}`
      }
    });

    const shipmentEvents = [
      {
        message: "Package handed to J&T Express.",
        occurredAt: shippedAt ?? shiftDate(context.now, input.daysAgo, 6),
        status: ShipmentStatus.HANDED_TO_CARRIER
      },
      ...(input.state === OrderState.IN_TRANSIT ||
      input.state === OrderState.DELIVERED ||
      input.state === OrderState.COMPLETED ||
      input.state === OrderState.REFUNDED
        ? [
            {
              message: "Shipment is in transit between hubs.",
              occurredAt: shiftDate(context.now, Math.max(input.daysAgo - 1, 0), 10),
              status: ShipmentStatus.IN_TRANSIT
            }
          ]
        : []),
      ...(input.state === OrderState.DELIVERED ||
      input.state === OrderState.COMPLETED ||
      input.state === OrderState.REFUNDED
        ? [
            {
              message: "Shipment delivered to the buyer.",
              occurredAt: deliveredAt ?? shiftDate(context.now, 0, 12),
              status: ShipmentStatus.DELIVERED
            }
          ]
        : [])
    ];

    await prisma.shipmentEvent.createMany({
      data: shipmentEvents.map((event) => ({
        actorUserId: context.adminId,
        message: event.message,
        occurredAt: event.occurredAt,
        shipmentId: shipment.id,
        source: ShipmentEventSource.SYSTEM,
        status: event.status
      }))
    });
  }

  if (input.dispute) {
    await prisma.dispute.create({
      data: {
        adminNote: input.dispute.adminNote ?? null,
        buyerMessage: input.dispute.buyerMessage,
        openedAt: shiftDate(context.now, Math.max(input.daysAgo - 1, 0), 5),
        orderId: order.id,
        reason: input.dispute.reason,
        requestedRefundMinor: input.dispute.requestedRefundMinor ?? null,
        resolutionNote: input.dispute.resolutionNote ?? null,
        resolvedAt:
          input.dispute.status === DisputeStatus.OPEN ? null : shiftDate(context.now, Math.max(input.daysAgo - 1, 0), 2),
        resolvedRefundMinor: input.dispute.resolvedRefundMinor ?? null,
        sellerResponse: input.dispute.sellerResponse ?? null,
        status: input.dispute.status
      }
    });
  }

  return order;
}

async function seedAuditLogs(input: {
  adminId: string;
  approvedProducts: Array<{ id: string; name: string; status: ProductModerationStatus }>;
  approvedSellers: Array<{ displayName: string; id: string; slug: string }>;
  disputes: Array<{ id: string; status: DisputeStatus }>;
  pendingSeller: { id: string; slug: string };
  rejectedProducts: Array<{ id: string; name: string; status: ProductModerationStatus }>;
}) {
  await prisma.auditLog.deleteMany({
    where: {
      userAgent: SEED_USER_AGENT
    }
  });

  const now = new Date();
  const payloads = [
    ...input.approvedSellers.map((seller, index) => ({
      action: "SELLER_APPROVED",
      afterData: {
        id: seller.id,
        kycStatus: KycStatus.APPROVED,
        slug: seller.slug
      },
      beforeData: {
        id: seller.id,
        kycStatus: KycStatus.SUBMITTED,
        slug: seller.slug
      },
      createdAt: shiftDate(now, 6 - index, 1),
      entityId: seller.id,
      entityType: "Seller"
    })),
    {
      action: "SELLER_ONBOARDING_SUBMITTED",
      afterData: {
        id: input.pendingSeller.id,
        kycStatus: KycStatus.SUBMITTED,
        slug: input.pendingSeller.slug
      },
      beforeData: {
        id: input.pendingSeller.id,
        kycStatus: KycStatus.PENDING,
        slug: input.pendingSeller.slug
      },
      createdAt: shiftDate(now, 1, 1),
      entityId: input.pendingSeller.id,
      entityType: "Seller"
    },
    ...input.approvedProducts.slice(0, 2).map((product, index) => ({
      action: "PRODUCT_APPROVED",
      afterData: {
        id: product.id,
        moderationStatus: product.status,
        name: product.name
      },
      beforeData: {
        id: product.id,
        moderationStatus: ProductModerationStatus.PENDING,
        name: product.name
      },
      createdAt: shiftDate(now, 3 - index, 2),
      entityId: product.id,
      entityType: "Product"
    })),
    ...input.rejectedProducts.slice(0, 1).map((product) => ({
      action: "PRODUCT_REJECTED",
      afterData: {
        id: product.id,
        moderationStatus: product.status,
        name: product.name
      },
      beforeData: {
        id: product.id,
        moderationStatus: ProductModerationStatus.PENDING,
        name: product.name
      },
      createdAt: shiftDate(now, 2, 1),
      entityId: product.id,
      entityType: "Product"
    })),
    ...input.disputes.map((dispute, index) => ({
      action:
        dispute.status === DisputeStatus.UNDER_REVIEW
          ? "DISPUTE_UNDER_REVIEW"
          : dispute.status === DisputeStatus.REFUND_APPROVED
            ? "DISPUTE_REFUND_APPROVED"
            : "DISPUTE_UPDATED",
      afterData: {
        id: dispute.id,
        status: dispute.status
      },
      beforeData: {
        id: dispute.id,
        status: DisputeStatus.OPEN
      },
      createdAt: shiftDate(now, 1, 4 - index),
      entityId: dispute.id,
      entityType: "Dispute"
    }))
  ];

  for (const payload of payloads) {
    await prisma.auditLog.create({
      data: {
        action: payload.action,
        actorUserId: input.adminId,
        afterData: payload.afterData,
        beforeData: payload.beforeData,
        createdAt: payload.createdAt,
        entityId: payload.entityId,
        entityType: payload.entityType,
        userAgent: SEED_USER_AGENT
      }
    });
  }
}

function createCraftCatalog(): SeedProductDefinition[] {
  const sevenDayPolicy = {
    en: "Returns accepted within 7 days if unused and in original packaging.",
    km: "អាចសងវិញក្នុងរយៈពេល ៧ ថ្ងៃ ប្រសិនបើមិនទាន់ប្រើ និងនៅក្នុងសភាពដើម។"
  };

  return [
    {
      category: "Accessories",
      description: {
        en: "Handwoven cotton krama scarf for daily wear and gifting.",
        km: "ក្រមាកប្បាសតម្បាញដៃ សម្រាប់ពាក់រាល់ថ្ងៃ និងជាអំណោយ។"
      },
      name: {
        en: "Krama Scarf",
        km: "ក្រមា"
      },
      publishDaysAgo: 0,
      returnPolicy: sevenDayPolicy,
      slug: "krama-scarf",
      variants: [
        {
          attributes: { color: "Crimson", weave: "Classic" },
          compareAtPriceMinor: 28000,
          isDefault: true,
          name: { en: "Crimson Classic", km: "ក្រហម បុរាណ" },
          onHandQuantity: 26,
          priceMinor: 25000,
          sku: "MKC-KRAMA-CRIMSON"
        },
        {
          attributes: { color: "Indigo", weave: "Classic" },
          name: { en: "Indigo Classic", km: "ខៀវ បុរាណ" },
          onHandQuantity: 18,
          priceMinor: 25000,
          sku: "MKC-KRAMA-INDIGO"
        }
      ]
    },
    {
      category: "Home Decor",
      description: {
        en: "Palm leaf basket with reinforced handles for market runs.",
        km: "កន្ត្រកស្លឹកត្នោតមានដៃចាប់រឹងមាំ សម្រាប់ដើរផ្សារ។"
      },
      name: {
        en: "Palm Market Basket",
        km: "កន្ត្រកផ្សារស្លឹកត្នោត"
      },
      publishDaysAgo: 1,
      returnPolicy: sevenDayPolicy,
      slug: "palm-market-basket",
      variants: [
        {
          attributes: { size: "Medium", style: "Natural" },
          compareAtPriceMinor: 52000,
          isDefault: true,
          name: { en: "Medium Natural", km: "មធ្យម ពណ៌ធម្មជាតិ" },
          onHandQuantity: 12,
          priceMinor: 48000,
          sku: "MKC-BASKET-MEDIUM"
        },
        {
          attributes: { size: "Large", style: "Natural" },
          name: { en: "Large Natural", km: "ធំ ពណ៌ធម្មជាតិ" },
          onHandQuantity: 8,
          priceMinor: 56000,
          sku: "MKC-BASKET-LARGE"
        }
      ]
    },
    {
      category: "Textiles",
      description: {
        en: "Silk cushion cover with lotus motif and hidden zipper.",
        km: "ស្រោមខ្នើយសូត្រដែលមានរូបផ្កាឈូក និងខ្សែរ៉ូតលាក់។"
      },
      name: {
        en: "Lotus Silk Cushion Cover",
        km: "ស្រោមខ្នើយសូត្រផ្កាឈូក"
      },
      publishDaysAgo: 2,
      returnPolicy: sevenDayPolicy,
      slug: "lotus-silk-cushion-cover",
      variants: [
        {
          attributes: { color: "Gold", size: "45x45" },
          compareAtPriceMinor: 68000,
          isDefault: true,
          name: { en: "Gold 45x45", km: "មាស 45x45" },
          onHandQuantity: 10,
          priceMinor: 62000,
          sku: "MKC-CUSHION-GOLD"
        },
        {
          attributes: { color: "Forest Green", size: "45x45" },
          name: { en: "Forest Green 45x45", km: "បៃតង 45x45" },
          onHandQuantity: 7,
          priceMinor: 62000,
          sku: "MKC-CUSHION-GREEN"
        }
      ]
    },
    {
      category: "Jewelry",
      description: {
        en: "Sterling silver earrings inspired by temple lotus carvings.",
        km: "ក្រវិលប្រាក់ស្តែរឡីងដែលបានបំផុសគំនិតពីការឆ្លាក់ផ្កាឈូកក្នុងវត្ត។"
      },
      name: {
        en: "Lotus Silver Earrings",
        km: "ក្រវិលប្រាក់ផ្កាឈូក"
      },
      publishDaysAgo: 3,
      returnPolicy: sevenDayPolicy,
      slug: "lotus-silver-earrings",
      variants: [
        {
          attributes: { finish: "Polished", drop: "Short" },
          compareAtPriceMinor: 86000,
          isDefault: true,
          name: { en: "Polished Short Drop", km: "ភ្លឺ ខ្លី" },
          onHandQuantity: 9,
          priceMinor: 79000,
          sku: "MKC-EARRING-POLISHED"
        },
        {
          attributes: { finish: "Oxidized", drop: "Long" },
          name: { en: "Oxidized Long Drop", km: "ចាស់វែង" },
          onHandQuantity: 5,
          priceMinor: 84000,
          sku: "MKC-EARRING-OXIDIZED"
        }
      ]
    },
    {
      category: "Dining",
      description: {
        en: "Lacquer rice bowl set for shared family meals.",
        km: "ឈុតចានបាយឡាក់ឃ័រ សម្រាប់អាហារជុំគ្រួសារ។"
      },
      name: {
        en: "Lacquer Rice Bowl Set",
        km: "ឈុតចានបាយឡាក់ឃ័រ"
      },
      publishDaysAgo: 4,
      returnPolicy: sevenDayPolicy,
      slug: "lacquer-rice-bowl-set",
      variants: [
        {
          attributes: { count: "4 Pieces", tone: "Mahogany" },
          compareAtPriceMinor: 74000,
          isDefault: true,
          name: { en: "4 Piece Mahogany", km: "៤ ចាន ពណ៌ស្នោ" },
          onHandQuantity: 14,
          priceMinor: 69000,
          sku: "MKC-BOWL-4P"
        },
        {
          attributes: { count: "6 Pieces", tone: "Ebony" },
          name: { en: "6 Piece Ebony", km: "៦ ចាន ពណ៌ខ្មៅ" },
          onHandQuantity: 6,
          priceMinor: 92000,
          sku: "MKC-BOWL-6P"
        }
      ]
    },
    {
      category: "Lighting",
      description: {
        en: "Bamboo lantern woven for soft ambient evening light.",
        km: "គោមឫស្សីតម្បាញសម្រាប់ពន្លឺទន់ពេលល្ងាច។"
      },
      name: {
        en: "Bamboo Lantern",
        km: "គោមឫស្សី"
      },
      publishDaysAgo: 5,
      returnPolicy: sevenDayPolicy,
      slug: "bamboo-lantern",
      variants: [
        {
          attributes: { size: "Small", finish: "Natural" },
          compareAtPriceMinor: 39000,
          isDefault: true,
          name: { en: "Small Natural", km: "តូច ពណ៌ធម្មជាតិ" },
          onHandQuantity: 20,
          priceMinor: 35000,
          sku: "MKC-LANTERN-SMALL"
        },
        {
          attributes: { size: "Tall", finish: "Smoked" },
          name: { en: "Tall Smoked", km: "ខ្ពស់ ពណ៌ឆ្អិន" },
          onHandQuantity: 11,
          priceMinor: 42000,
          sku: "MKC-LANTERN-TALL"
        }
      ]
    },
    {
      category: "Textiles",
      description: {
        en: "Handloom table runner for festive hosting and home styling.",
        km: "កម្រាលតុតម្បាញដៃ សម្រាប់ទទួលភ្ញៀវ និងតុបតែងផ្ទះ។"
      },
      name: {
        en: "Handloom Table Runner",
        km: "កម្រាលតុតម្បាញដៃ"
      },
      publishDaysAgo: 6,
      returnPolicy: sevenDayPolicy,
      slug: "handloom-table-runner",
      variants: [
        {
          attributes: { palette: "Sunset", length: "180 cm" },
          compareAtPriceMinor: 44000,
          isDefault: true,
          name: { en: "Sunset 180 cm", km: "ព្រះអាទិត្យលិច 180 សម" },
          onHandQuantity: 17,
          priceMinor: 39000,
          sku: "MKC-RUNNER-SUNSET"
        },
        {
          attributes: { palette: "River Blue", length: "220 cm" },
          name: { en: "River Blue 220 cm", km: "ខៀវទន្លេ 220 សម" },
          onHandQuantity: 9,
          priceMinor: 45000,
          sku: "MKC-RUNNER-BLUE"
        }
      ]
    },
    {
      category: "Decor",
      description: {
        en: "Resin elephant figurine with hand-painted temple details.",
        km: "រូបសំណាកដំរីជ័រ ដែលគូរដៃលម្អិតបែបប្រាសាទ។"
      },
      name: {
        en: "Temple Elephant Figurine",
        km: "រូបសំណាកដំរីប្រាសាទ"
      },
      publishDaysAgo: 7,
      returnPolicy: sevenDayPolicy,
      slug: "temple-elephant-figurine",
      variants: [
        {
          attributes: { finish: "Bronze", size: "Desk" },
          compareAtPriceMinor: 33000,
          isDefault: true,
          name: { en: "Bronze Desk Size", km: "ពណ៌សំរិទ្ធ ទំហំតុ" },
          onHandQuantity: 15,
          priceMinor: 29000,
          sku: "MKC-ELEPHANT-BRONZE"
        },
        {
          attributes: { finish: "Ivory", size: "Shelf" },
          name: { en: "Ivory Shelf Size", km: "ពណ៌ភ្លុក ទំហំទូ" },
          onHandQuantity: 10,
          priceMinor: 34000,
          sku: "MKC-ELEPHANT-IVORY"
        }
      ]
    },
    {
      category: "Dining",
      description: {
        en: "Ceramic tea cups glazed for afternoon tea service.",
        km: "ពែងតែសេរ៉ាមិច មានក្រឡាច្នៃសម្រាប់ពេលទទួលភ្ញៀវ។"
      },
      name: {
        en: "Ceramic Tea Cup Set",
        km: "ឈុតពែងតែសេរ៉ាមិច"
      },
      publishDaysAgo: 8,
      returnPolicy: sevenDayPolicy,
      slug: "ceramic-tea-cup-set",
      variants: [
        {
          attributes: { glaze: "Sand", count: "4 Cups" },
          compareAtPriceMinor: 41000,
          isDefault: true,
          name: { en: "Sand 4 Cup Set", km: "ពណ៌ខ្សាច់ ៤ ពែង" },
          onHandQuantity: 13,
          priceMinor: 36000,
          sku: "MKC-TEACUP-SAND"
        },
        {
          attributes: { glaze: "Clay", count: "6 Cups" },
          name: { en: "Clay 6 Cup Set", km: "ពណ៌ដី ៦ ពែង" },
          onHandQuantity: 7,
          priceMinor: 42000,
          sku: "MKC-TEACUP-CLAY"
        }
      ]
    },
    {
      category: "Accessories",
      description: {
        en: "Seagrass tote designed for weekend markets and gifting.",
        km: "កាបូបស្មៅសមុទ្រ សម្រាប់ដើរផ្សារ និងជាអំណោយ។"
      },
      moderationNotes: "Needs one clearer hero image before approval.",
      moderationStatus: ProductModerationStatus.PENDING,
      name: {
        en: "Seagrass Market Tote",
        km: "កាបូបផ្សារស្មៅសមុទ្រ"
      },
      publishDaysAgo: null,
      returnPolicy: sevenDayPolicy,
      slug: "seagrass-market-tote",
      variants: [
        {
          attributes: { strap: "Short", weave: "Tight" },
          compareAtPriceMinor: 47000,
          isDefault: true,
          name: { en: "Short Strap", km: "ខ្សែខ្លី" },
          onHandQuantity: 8,
          priceMinor: 43000,
          sku: "MKC-TOTE-SHORT"
        },
        {
          attributes: { strap: "Long", weave: "Tight" },
          name: { en: "Long Strap", km: "ខ្សែវែង" },
          onHandQuantity: 6,
          priceMinor: 46000,
          sku: "MKC-TOTE-LONG"
        }
      ]
    }
  ];
}

function createGourmetCatalog(currency: Currency): SeedProductDefinition[] {
  const fourteenDayPolicy = {
    en: "Unopened pantry items may be returned within 14 days.",
    km: "ទំនិញគ្រឿងទេសដែលមិនទាន់បើក អាចសងវិញក្នុងរយៈពេល ១៤ ថ្ងៃ។"
  };
  const usd = currency === Currency.USD;

  const price = (dollars: number, riels: number) => (usd ? dollars : riels);

  return [
    {
      category: "Pantry",
      description: {
        en: "Single-origin Kampot pepper packed in a gift-ready tin set.",
        km: "ម្រេចកំពតប្រភពតែមួយ ដាក់ក្នុងឈុតប្រអប់អំណោយ។"
      },
      name: {
        en: "Kampot Pepper Gift Set",
        km: "ឈុតម្រេចកំពតអំណោយ"
      },
      publishDaysAgo: 0,
      returnPolicy: fourteenDayPolicy,
      slug: "kampot-pepper-gift-set",
      variants: [
        {
          attributes: { selection: "Black", pack: "3 Tins" },
          compareAtPriceMinor: price(1899, 78000),
          isDefault: true,
          name: { en: "Black Pepper 3 Tins", km: "ម្រេចខ្មៅ ៣ កំប៉ុង" },
          onHandQuantity: 12,
          priceMinor: price(1599, 69000),
          sku: "TLG-PEPPER-BLACK"
        },
        {
          attributes: { selection: "Mixed", pack: "6 Tins" },
          name: { en: "Mixed Selection 6 Tins", km: "ចម្រុះ ៦ កំប៉ុង" },
          onHandQuantity: 8,
          priceMinor: price(2899, 119000),
          sku: "TLG-PEPPER-MIX"
        }
      ]
    },
    {
      category: "Pantry",
      description: {
        en: "Dark palm sugar syrup for coffee, desserts, and cocktails.",
        km: "ទឹកស្ករត្នោតខ្មៅ សម្រាប់កាហ្វេ បង្អែម និងភេសជ្ជៈ។"
      },
      name: {
        en: "Palm Sugar Syrup",
        km: "ទឹកស្ករត្នោត"
      },
      publishDaysAgo: 1,
      returnPolicy: fourteenDayPolicy,
      slug: "palm-sugar-syrup",
      variants: [
        {
          attributes: { bottle: "250 ml", sweetness: "Classic" },
          compareAtPriceMinor: price(899, 36000),
          isDefault: true,
          name: { en: "250 ml Classic", km: "250 មល បែបដើម" },
          onHandQuantity: 20,
          priceMinor: price(749, 31000),
          sku: "TLG-SYRUP-250"
        },
        {
          attributes: { bottle: "500 ml", sweetness: "Classic" },
          name: { en: "500 ml Classic", km: "500 មល បែបដើម" },
          onHandQuantity: 14,
          priceMinor: price(1199, 49000),
          sku: "TLG-SYRUP-500"
        }
      ]
    },
    {
      category: "Tea",
      description: {
        en: "Lemongrass tea blend with pandan and ginger.",
        km: "តែគល់ស្លឹកគ្រៃលាយស្លឹកតើយ និងខ្ញី។"
      },
      name: {
        en: "Lemongrass Tea Blend",
        km: "តែស្លឹកគ្រៃ"
      },
      publishDaysAgo: 2,
      returnPolicy: fourteenDayPolicy,
      slug: "lemongrass-tea-blend",
      variants: [
        {
          attributes: { sachets: "12", profile: "Original" },
          compareAtPriceMinor: price(799, 33000),
          isDefault: true,
          name: { en: "12 Sachet Original", km: "១២ ថង់ បែបដើម" },
          onHandQuantity: 22,
          priceMinor: price(699, 29000),
          sku: "TLG-TEA-12"
        },
        {
          attributes: { sachets: "24", profile: "Original" },
          name: { en: "24 Sachet Original", km: "២៤ ថង់ បែបដើម" },
          onHandQuantity: 15,
          priceMinor: price(1199, 49000),
          sku: "TLG-TEA-24"
        }
      ]
    },
    {
      category: "Snacks",
      description: {
        en: "Naturally sweet dried mango slices with no added sugar.",
        km: "ស្វាយស្ងោរបន្ទះផ្អែមធម្មជាតិ ដោយគ្មានស្ករបន្ថែម។"
      },
      name: {
        en: "Dried Mango Slices",
        km: "ស្វាយស្ងោរបន្ទះ"
      },
      publishDaysAgo: 3,
      returnPolicy: fourteenDayPolicy,
      slug: "dried-mango-slices",
      variants: [
        {
          attributes: { pouch: "100 g", texture: "Soft" },
          compareAtPriceMinor: price(699, 28000),
          isDefault: true,
          name: { en: "100 g Soft Cut", km: "100 ក្រាម ទន់" },
          onHandQuantity: 25,
          priceMinor: price(599, 24000),
          sku: "TLG-MANGO-100"
        },
        {
          attributes: { pouch: "200 g", texture: "Chewy" },
          name: { en: "200 g Chewy Cut", km: "200 ក្រាម សរសៃ" },
          onHandQuantity: 17,
          priceMinor: price(999, 41000),
          sku: "TLG-MANGO-200"
        }
      ]
    },
    {
      category: "Staples",
      description: {
        en: "Fragrant jasmine rice milled for soft, fluffy cooking.",
        km: "អង្ករម្លិះក្រអូប សម្រាប់ចម្អិនឱ្យទន់ស្រួយ។"
      },
      name: {
        en: "Premium Jasmine Rice",
        km: "អង្ករម្លិះពិសេស"
      },
      publishDaysAgo: 4,
      returnPolicy: fourteenDayPolicy,
      slug: "premium-jasmine-rice",
      variants: [
        {
          attributes: { bag: "2 kg", grain: "Long" },
          compareAtPriceMinor: price(1099, 45000),
          isDefault: true,
          name: { en: "2 kg Long Grain", km: "2 គក គ្រាប់វែង" },
          onHandQuantity: 18,
          priceMinor: price(949, 39000),
          sku: "TLG-RICE-2KG"
        },
        {
          attributes: { bag: "5 kg", grain: "Long" },
          name: { en: "5 kg Long Grain", km: "5 គក គ្រាប់វែង" },
          onHandQuantity: 11,
          priceMinor: price(1999, 82000),
          sku: "TLG-RICE-5KG"
        }
      ]
    },
    {
      category: "Snacks",
      description: {
        en: "Garlic roasted cashews with a light Kampot pepper finish.",
        km: "គ្រាប់ស្វាយចន្ទីអាំងខ្ទឹម មានក្លិនម្រេចកំពតបន្តិច។"
      },
      name: {
        en: "Garlic Roasted Cashews",
        km: "ស្វាយចន្ទីអាំងខ្ទឹម"
      },
      publishDaysAgo: 5,
      returnPolicy: fourteenDayPolicy,
      slug: "garlic-roasted-cashews",
      variants: [
        {
          attributes: { pouch: "120 g", seasoning: "Garlic" },
          compareAtPriceMinor: price(899, 36000),
          isDefault: true,
          name: { en: "120 g Garlic Roast", km: "120 ក្រាម ខ្ទឹម" },
          onHandQuantity: 19,
          priceMinor: price(749, 30000),
          sku: "TLG-CASHEW-120"
        },
        {
          attributes: { pouch: "240 g", seasoning: "Garlic Pepper" },
          name: { en: "240 g Garlic Pepper", km: "240 ក្រាម ខ្ទឹមម្រេច" },
          onHandQuantity: 12,
          priceMinor: price(1299, 52000),
          sku: "TLG-CASHEW-240"
        }
      ]
    },
    {
      category: "Spreads",
      description: {
        en: "Coconut jam slow-cooked for toast and breakfast bowls.",
        km: "ខ្ទិះដូងផ្អែមចម្អិនយឺត សម្រាប់នំប៉័ង និងអាហារពេលព្រឹក។"
      },
      name: {
        en: "Coconut Jam Jar",
        km: "ខ្ទិះដូងផ្អែម"
      },
      publishDaysAgo: 6,
      returnPolicy: fourteenDayPolicy,
      slug: "coconut-jam-jar",
      variants: [
        {
          attributes: { jar: "220 g", profile: "Classic" },
          compareAtPriceMinor: price(699, 28000),
          isDefault: true,
          name: { en: "220 g Classic", km: "220 ក្រាម បែបដើម" },
          onHandQuantity: 16,
          priceMinor: price(599, 24000),
          sku: "TLG-JAM-220"
        },
        {
          attributes: { jar: "320 g", profile: "Pandan" },
          name: { en: "320 g Pandan", km: "320 ក្រាម ស្លឹកតើយ" },
          onHandQuantity: 9,
          priceMinor: price(849, 34000),
          sku: "TLG-JAM-320"
        }
      ]
    },
    {
      category: "Cooking Kits",
      description: {
        en: "Prahok spice kit with herbs for classic Khmer cooking.",
        km: "ឈុតគ្រឿងប្រហុកជាមួយស្មៅគ្រឿង សម្រាប់ម្ហូបខ្មែរ។"
      },
      name: {
        en: "Prahok Spice Kit",
        km: "ឈុតគ្រឿងប្រហុក"
      },
      publishDaysAgo: 7,
      returnPolicy: fourteenDayPolicy,
      slug: "prahok-spice-kit",
      variants: [
        {
          attributes: { pack: "Home Cook", heat: "Medium" },
          compareAtPriceMinor: price(1099, 45000),
          isDefault: true,
          name: { en: "Home Cook Medium", km: "គ្រួសារ មធ្យម" },
          onHandQuantity: 14,
          priceMinor: price(949, 39000),
          sku: "TLG-PRAHOK-HOME"
        },
        {
          attributes: { pack: "Chef Pack", heat: "Hot" },
          name: { en: "Chef Pack Hot", km: "មេចុងភៅ ហឹរ" },
          onHandQuantity: 7,
          priceMinor: price(1499, 61000),
          sku: "TLG-PRAHOK-CHEF"
        }
      ]
    },
    {
      category: "Wellness",
      description: {
        en: "Turmeric honey tonic for warm drinks and recovery rituals.",
        km: "ទឹកឃ្មុំរមៀត សម្រាប់ភេសជ្ជៈក្តៅ និងការថែទាំសុខភាព។"
      },
      name: {
        en: "Turmeric Honey Tonic",
        km: "ទឹកឃ្មុំរមៀត"
      },
      publishDaysAgo: 8,
      returnPolicy: fourteenDayPolicy,
      slug: "turmeric-honey-tonic",
      variants: [
        {
          attributes: { bottle: "250 ml", blend: "Original" },
          compareAtPriceMinor: price(999, 40000),
          isDefault: true,
          name: { en: "250 ml Original", km: "250 មល បែបដើម" },
          onHandQuantity: 13,
          priceMinor: price(849, 34000),
          sku: "TLG-TONIC-250"
        },
        {
          attributes: { bottle: "500 ml", blend: "Ginger" },
          name: { en: "500 ml Ginger", km: "500 មល ខ្ញី" },
          onHandQuantity: 8,
          priceMinor: price(1399, 57000),
          sku: "TLG-TONIC-500"
        }
      ]
    },
    {
      category: "Seasoning",
      description: {
        en: "Smoked chili sea salt blend for grilled dishes and fries.",
        km: "អំបិលសមុទ្រលាយម្ទេសឆ្អិន សម្រាប់ម្ហូបអាំង និងដំឡូងបំពង។"
      },
      moderationNotes: "Label artwork must show ingredient disclosures more clearly.",
      moderationStatus: ProductModerationStatus.REJECTED,
      name: {
        en: "Smoked Chili Sea Salt",
        km: "អំបិលម្ទេសឆ្អិន"
      },
      publishDaysAgo: null,
      returnPolicy: fourteenDayPolicy,
      slug: "smoked-chili-sea-salt",
      variants: [
        {
          attributes: { jar: "120 g", heat: "Medium" },
          compareAtPriceMinor: price(799, 32000),
          isDefault: true,
          name: { en: "120 g Medium Heat", km: "120 ក្រាម ហឹរមធ្យម" },
          onHandQuantity: 10,
          priceMinor: price(699, 28000),
          sku: "TLG-SALT-120"
        },
        {
          attributes: { jar: "220 g", heat: "Hot" },
          name: { en: "220 g Hot", km: "220 ក្រាម ហឹរ" },
          onHandQuantity: 6,
          priceMinor: price(999, 40000),
          sku: "TLG-SALT-220"
        }
      ]
    }
  ];
}

function createSeedOrders(): SeedOrderDefinition[] {
  return [
    {
      buyerEmail: DEFAULT_BUYER_EMAIL,
      daysAgo: 9,
      note: "Awaiting KHQR settlement.",
      orderNumber: `${ORDER_PREFIX}1001`,
      paymentMethod: PaymentMethod.KHQR,
      sellerSlug: "tonle-gourmet",
      shippingAddressLabel: "Olympic Market Apartment",
      sku: "TLG-PEPPER-BLACK",
      state: OrderState.PAYMENT_PENDING,
      quantity: 1
    },
    {
      buyerEmail: DEFAULT_BUYER_EMAIL,
      daysAgo: 8,
      note: "Seller confirmed quickly after COD checkout.",
      orderNumber: `${ORDER_PREFIX}1002`,
      paymentMethod: PaymentMethod.COD,
      sellerSlug: "mekong-crafts",
      shippingAddressLabel: "Toul Tom Poung Flat",
      sku: "MKC-KRAMA-CRIMSON",
      state: OrderState.SELLER_CONFIRMED,
      quantity: 1
    },
    {
      buyerEmail: DEFAULT_BUYER_EMAIL,
      daysAgo: 7,
      note: "Packed and waiting for carrier pickup.",
      orderNumber: `${ORDER_PREFIX}1003`,
      paymentMethod: PaymentMethod.COD,
      sellerSlug: "mekong-crafts",
      shippingAddressLabel: "Boeung Keng Kang Residence",
      sku: "MKC-LANTERN-SMALL",
      state: OrderState.PACKED,
      quantity: 2
    },
    {
      buyerEmail: DEFAULT_BUYER_EMAIL,
      daysAgo: 6,
      note: "Tracking shared with buyer.",
      orderNumber: `${ORDER_PREFIX}1004`,
      paymentMethod: PaymentMethod.COD,
      sellerSlug: "tonle-gourmet",
      shippingAddressLabel: "Chbar Ampov Townhouse",
      sku: "TLG-MANGO-200",
      state: OrderState.HANDED_TO_CARRIER,
      quantity: 1
    },
    {
      buyerEmail: DEFAULT_BUYER_EMAIL,
      daysAgo: 5,
      note: "Prepaid order currently in transit.",
      orderNumber: `${ORDER_PREFIX}1005`,
      paymentMethod: PaymentMethod.PAYWAY,
      sellerSlug: "tonle-gourmet",
      shippingAddressLabel: "Sen Sok Condo",
      sku: "TLG-RICE-2KG",
      state: OrderState.IN_TRANSIT,
      quantity: 1
    },
    {
      buyerEmail: DEFAULT_BUYER_EMAIL,
      daysAgo: 4,
      dispute: {
        buyerMessage: "The finish looked darker than the listing photos.",
        reason: DisputeReason.NOT_AS_DESCRIBED,
        requestedRefundMinor: 62000,
        sellerResponse: "We offered an exchange and shared new photos of the next batch.",
        status: DisputeStatus.OPEN
      },
      note: "Delivered yesterday; buyer opened a dispute.",
      orderNumber: `${ORDER_PREFIX}1006`,
      paymentMethod: PaymentMethod.COD,
      sellerSlug: "mekong-crafts",
      shippingAddressLabel: "Russey Keo Villa",
      sku: "MKC-CUSHION-GOLD",
      state: OrderState.DELIVERED,
      quantity: 1
    },
    {
      buyerEmail: DEFAULT_BUYER_EMAIL,
      daysAgo: 3,
      dispute: {
        adminNote: "Seller and buyer both responded inside SLA.",
        buyerMessage: "One tea cup arrived chipped on the rim.",
        reason: DisputeReason.DAMAGED,
        requestedRefundMinor: 18000,
        resolutionNote: "Case moved into review while replacement stock is confirmed.",
        sellerResponse: "Replacement stock is available and can ship tomorrow.",
        status: DisputeStatus.UNDER_REVIEW
      },
      note: "Completed order kept for loyalty and dispute demos.",
      orderNumber: `${ORDER_PREFIX}1007`,
      paymentMethod: PaymentMethod.KHQR,
      sellerSlug: "mekong-crafts",
      shippingAddressLabel: "Daun Penh Shophouse",
      sku: "MKC-TEACUP-SAND",
      state: OrderState.COMPLETED,
      quantity: 1
    },
    {
      buyerEmail: DEFAULT_BUYER_EMAIL,
      daysAgo: 2,
      note: "Buyer cancelled before payment confirmation.",
      orderNumber: `${ORDER_PREFIX}1008`,
      paymentMethod: PaymentMethod.KHQR,
      sellerSlug: "tonle-gourmet",
      shippingAddressLabel: "Aeon Mall Pickup Point",
      sku: "TLG-TEA-12",
      state: OrderState.CANCELLED,
      quantity: 1
    },
    {
      buyerEmail: DEFAULT_BUYER_EMAIL,
      daysAgo: 1,
      dispute: {
        adminNote: "Refund approved after delivery evidence review.",
        buyerMessage: "The tonic bottle leaked during delivery.",
        reason: DisputeReason.DAMAGED,
        requestedRefundMinor: 849,
        resolutionNote: "Full refund approved for damaged bottle.",
        resolvedRefundMinor: 849,
        sellerResponse: "Courier damage confirmed with photos from dispatch.",
        status: DisputeStatus.REFUND_APPROVED
      },
      note: "Refunded prepaid order for dispute and settlement demos.",
      orderNumber: `${ORDER_PREFIX}1009`,
      paymentMethod: PaymentMethod.PAYWAY,
      sellerSlug: "tonle-gourmet",
      shippingAddressLabel: "Toul Kork Apartment",
      sku: "TLG-TONIC-250",
      state: OrderState.REFUNDED,
      quantity: 1
    }
  ];
}

async function main() {
  if (!readSeedEnabled()) {
    console.log("Seed skipped because SEED_ENABLED=false.");
    return;
  }

  const now = new Date();
  const currencies = getSupportedCurrencies();
  const primaryCurrency = currencies[0] ?? Currency.KHR;
  const secondaryCurrency = currencies[1] ?? primaryCurrency;

  await ensurePlatformLedgerAccounts(Array.from(new Set([primaryCurrency, secondaryCurrency])));

  const admin = await upsertAdmin();
  const buyer = await upsertBuyer({
    email: DEFAULT_BUYER_EMAIL,
    fullName: "Sample Buyer",
    phone: DEFAULT_BUYER_PHONE
  });

  const approvedSellerDefinitions: SeedSellerDefinition[] = [
    {
      address: {
        en: "Sisowath Quay, Phnom Penh",
        km: "មាត់ទន្លេស៊ីសុវត្ថិ ភ្នំពេញ"
      },
      currency: primaryCurrency,
      description: {
        en: "Craft merchant with woven textiles, home goods, and gifting pieces.",
        km: "អ្នកលក់សិប្បកម្មដែលមានវាយនភណ្ឌ ផលិតផលផ្ទះ និងអំណោយ។"
      },
      displayName: "Mekong Crafts",
      email: "mekong-crafts@khmercart.local",
      legalName: "Mekong Crafts Co., Ltd.",
      phone: "+85510000011",
      products: createCraftCatalog(),
      slug: "mekong-crafts"
    },
    {
      address: {
        en: "Russian Market, Phnom Penh",
        km: "ផ្សារទួលទំពូង ភ្នំពេញ"
      },
      currency: secondaryCurrency,
      description: {
        en: "Premium pantry merchant with Cambodian staples, teas, and giftable food.",
        km: "អ្នកលក់គ្រឿងទេសពិសេស មានអាហារសំខាន់ តែ និងអំណោយអាហារ។"
      },
      displayName: "Tonle Gourmet",
      email: "tonle-gourmet@khmercart.local",
      legalName: "Tonle Gourmet Trading",
      phone: "+85510000012",
      products: createGourmetCatalog(secondaryCurrency),
      slug: "tonle-gourmet"
    }
  ];

  const approvedSellers = [];

  for (const sellerDefinition of approvedSellerDefinitions) {
    approvedSellers.push(await upsertApprovedSeller(sellerDefinition, now));
  }

  const pendingSeller = await upsertPendingSellerApplication(now);

  await deleteExistingSeedOrders();

  const seededProducts = await prisma.product.findMany({
    include: {
      variants: true
    },
    where: {
      seller: {
        is: {
          slug: {
            in: approvedSellerDefinitions.map((seller) => seller.slug)
          }
        }
      }
    }
  });

  const sellersBySlug = new Map(approvedSellers.map((seller) => [seller.slug, { id: seller.id }]));
  const variantBySku = new Map(
    seededProducts.flatMap((product) =>
      product.variants.map((variant) => [
        variant.sku,
        {
          currency: variant.currency,
          id: variant.id,
          name: variant.name,
          priceMinor: variant.priceMinor,
          product: {
            id: product.id,
            name: product.name
          }
        }
      ])
    )
  );

  for (const orderDefinition of createSeedOrders()) {
    await createSeedOrder(orderDefinition, {
      adminId: admin.id,
      buyerIdByEmail: new Map([[buyer.email ?? DEFAULT_BUYER_EMAIL, buyer.id]]),
      now,
      sellersBySlug,
      variantBySku
    });
  }

  const seededDisputes = await prisma.dispute.findMany({
    where: {
      order: {
        is: {
          orderNumber: {
            startsWith: ORDER_PREFIX
          }
        }
      }
    }
  });

  const approvedProducts = seededProducts.filter(
    (product) => product.moderationStatus === ProductModerationStatus.APPROVED
  );
  const rejectedProducts = seededProducts.filter(
    (product) => product.moderationStatus === ProductModerationStatus.REJECTED
  );

  await seedAuditLogs({
    adminId: admin.id,
    approvedProducts: approvedProducts.map((product) => ({
      id: product.id,
      name: product.name,
      status: product.moderationStatus
    })),
    approvedSellers: approvedSellers.map((seller) => ({
      displayName: seller.displayName,
      id: seller.id,
      slug: seller.slug
    })),
    disputes: seededDisputes.map((dispute) => ({
      id: dispute.id,
      status: dispute.status
    })),
    pendingSeller: {
      id: pendingSeller.id,
      slug: pendingSeller.slug
    },
    rejectedProducts: rejectedProducts.map((product) => ({
      id: product.id,
      name: product.name,
      status: product.moderationStatus
    }))
  });

  await reseedVideoPosts(now);

  const productCount = await prisma.product.count({
    where: {
      seller: {
        is: {
          slug: {
            in: approvedSellerDefinitions.map((seller) => seller.slug)
          }
        }
      }
    }
  });
  const orderCount = await prisma.order.count({
    where: {
      orderNumber: {
        startsWith: ORDER_PREFIX
      }
    }
  });

  console.log(
    [
      `Seed complete.`,
      `Admin: ${admin.email ?? admin.phone}.`,
      `Buyer: ${buyer.email ?? buyer.phone}.`,
      `Approved sellers: ${approvedSellers.length}.`,
      `Pending sellers: 1.`,
      `Products: ${productCount}.`,
      `Orders: ${orderCount}.`
    ].join(" ")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
