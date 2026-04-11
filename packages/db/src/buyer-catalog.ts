import {
  KycStatus,
  ProductModerationStatus,
  ProductStatus,
  ReviewStatus
} from "./prisma-client";
import type { Currency, Prisma } from "./prisma-client";
import { prisma } from "./prisma";

type BuyerCursor = {
  id: string;
  publishedAt: string;
};

const buyerProductInclude = {
  images: {
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { createdAt: "asc" }]
  },
  seller: {
    select: {
      displayName: true,
      reviewAggregate: {
        select: {
          averageRating: true,
          reviewCount: true
        }
      },
      slug: true,
      supportEmail: true,
      supportPhone: true
    }
  },
  variants: {
    include: {
      inventory: true
    },
    orderBy: [{ isDefault: "desc" }, { position: "asc" }, { createdAt: "asc" }],
    where: {
      currency: {
        not: null
      },
      isActive: true,
      priceMinor: {
        not: null
      }
    }
  }
} satisfies Prisma.ProductInclude;

type BuyerProductRecord = Prisma.ProductGetPayload<{
  include: typeof buyerProductInclude;
}>;

export class BuyerCatalogError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.name = "BuyerCatalogError";
    this.status = status;
  }
}

export type BuyerStockState = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export type BuyerCatalogImage = {
  altText: string;
  id: string;
  isPrimary: boolean;
  url: string;
};

export type BuyerCatalogVariant = {
  attributes: Record<string, string> | null;
  availableQuantity: number;
  compareAtPriceMinor: number | null;
  currency: Currency;
  id: string;
  isDefault: boolean;
  name: string;
  priceMinor: number;
  sku: string;
  weightGrams: number | null;
};

export type BuyerLeadVariant = Pick<
  BuyerCatalogVariant,
  | "attributes"
  | "availableQuantity"
  | "compareAtPriceMinor"
  | "currency"
  | "id"
  | "isDefault"
  | "name"
  | "priceMinor"
  | "sku"
  | "weightGrams"
>;

export type BuyerCatalogSeller = {
  contact: string;
  displayName: string;
  ratingSummary?: {
    averageRating: number;
    reviewCount: number;
  };
  slug: string;
};

export type BuyerFeedItem = {
  category: string;
  description: string;
  featuredImage: BuyerCatalogImage | null;
  id: string;
  leadVariant: BuyerLeadVariant;
  name: string;
  pricing: {
    compareAtPriceMinor: number | null;
    currency: Currency;
    priceMinor: number;
  };
  publishedAt: string;
  seller: BuyerCatalogSeller;
  slug: string;
  stock: {
    availableQuantity: number;
    state: BuyerStockState;
  };
};

export type BuyerFeedResult = {
  categories: string[];
  items: BuyerFeedItem[];
  nextCursor: string | null;
};

export type BuyerProductDetail = BuyerFeedItem & {
  disclosures: {
    returnPolicy: string;
    sellerAddress: string;
    sellerContact: string;
  };
  images: BuyerCatalogImage[];
  reviewSummary: {
    averageRating: number;
    reviewCount: number;
  };
  sellerRating: {
    averageRating: number;
    reviewCount: number;
  };
  variants: BuyerCatalogVariant[];
};

function createPublicProductWhere(category?: string): Prisma.ProductWhereInput {
  return {
    category: category?.trim()
      ? {
          equals: category.trim(),
          mode: "insensitive"
        }
      : undefined,
    moderationStatus: ProductModerationStatus.APPROVED,
    publishedAt: {
      not: null
    },
    seller: {
      is: {
        isActive: true,
        kycStatus: KycStatus.APPROVED
      }
    },
    status: ProductStatus.ACTIVE,
    variants: {
      some: {
        currency: {
          not: null
        },
        isActive: true,
        priceMinor: {
          not: null
        }
      }
    }
  };
}

function decodeCursor(cursor: string | null | undefined): BuyerCursor | null {
  if (!cursor?.trim()) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<BuyerCursor>;

    if (!decoded.id || !decoded.publishedAt) {
      return null;
    }

    return {
      id: decoded.id,
      publishedAt: decoded.publishedAt
    };
  } catch {
    return null;
  }
}

function encodeCursor(cursor: BuyerCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function clampLimit(value: number | null | undefined): number {
  if (!Number.isInteger(value)) {
    return 6;
  }

  return Math.min(Math.max(value ?? 6, 1), 18);
}

function mapAttributes(value: Prisma.JsonValue | null): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, rawValue]) =>
    typeof rawValue === "string" ? [[key, rawValue]] : []
  );

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function resolveSellerContact(product: BuyerProductRecord): string {
  return (
    product.sellerContact ??
    product.seller.supportEmail ??
    product.seller.supportPhone ??
    product.seller.displayName
  );
}

function resolveFeaturedImage(product: BuyerProductRecord): BuyerCatalogImage | null {
  const image = product.images[0];

  if (!image) {
    return null;
  }

  return {
    altText: image.altText ?? product.name,
    id: image.id,
    isPrimary: image.isPrimary,
    url: image.url
  };
}

function resolveLeadVariant(product: BuyerProductRecord) {
  const leadVariant =
    product.variants.find((variant) => (variant.inventory?.availableQuantity ?? 0) > 0) ??
    product.variants[0];

  if (!leadVariant || leadVariant.currency === null || leadVariant.priceMinor === null) {
    throw new BuyerCatalogError("NOT_FOUND", "Product is not available for buyers.", 404);
  }

  return leadVariant as typeof leadVariant & {
    currency: Currency;
    priceMinor: number;
  };
}

function compareFeedItemsForDisplay(left: BuyerFeedItem, right: BuyerFeedItem): number {
  const stockPriority = {
    IN_STOCK: 0,
    LOW_STOCK: 1,
    OUT_OF_STOCK: 2
  } satisfies Record<BuyerStockState, number>;

  const stockDelta = stockPriority[left.stock.state] - stockPriority[right.stock.state];

  if (stockDelta !== 0) {
    return stockDelta;
  }

  const quantityDelta = right.stock.availableQuantity - left.stock.availableQuantity;

  if (quantityDelta !== 0) {
    return quantityDelta;
  }

  return right.publishedAt.localeCompare(left.publishedAt);
}

function mapBuyerVariant(
  variant: BuyerProductRecord["variants"][number] & {
    currency: Currency;
    priceMinor: number;
  }
): BuyerLeadVariant {
  return {
    attributes: mapAttributes(variant.attributes),
    availableQuantity: variant.inventory?.availableQuantity ?? 0,
    compareAtPriceMinor: variant.compareAtPriceMinor ?? null,
    currency: variant.currency,
    id: variant.id,
    isDefault: variant.isDefault,
    name: variant.name,
    priceMinor: variant.priceMinor,
    sku: variant.sku,
    weightGrams: variant.weightGrams ?? null
  };
}

function sumAvailableInventory(product: BuyerProductRecord): number {
  return product.variants.reduce(
    (sum, variant) => sum + (variant.inventory?.availableQuantity ?? 0),
    0
  );
}

function resolveStockState(availableQuantity: number): BuyerStockState {
  if (availableQuantity <= 0) {
    return "OUT_OF_STOCK";
  }

  if (availableQuantity <= 5) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}

function mapBuyerFeedItem(product: BuyerProductRecord): BuyerFeedItem {
  const leadVariant = resolveLeadVariant(product);
  const availableQuantity = sumAvailableInventory(product);

  return {
    category: product.category ?? "",
    description: product.description ?? "",
    featuredImage: resolveFeaturedImage(product),
    id: product.id,
    leadVariant: mapBuyerVariant(leadVariant),
    name: product.name,
    pricing: {
      compareAtPriceMinor: leadVariant.compareAtPriceMinor ?? null,
      currency: leadVariant.currency,
      priceMinor: leadVariant.priceMinor
    },
    publishedAt: (product.publishedAt ?? product.updatedAt).toISOString(),
      seller: {
        contact: resolveSellerContact(product),
        displayName: product.seller.displayName,
        ratingSummary: product.seller.reviewAggregate
          ? {
              averageRating: product.seller.reviewAggregate.averageRating,
              reviewCount: product.seller.reviewAggregate.reviewCount
            }
          : {
              averageRating: 0,
              reviewCount: 0
            },
        slug: product.seller.slug
      },
    slug: product.slug,
    stock: {
      availableQuantity,
      state: resolveStockState(availableQuantity)
    }
  };
}

function mapBuyerProductDetail(
  product: BuyerProductRecord,
  reviewCount: number
): BuyerProductDetail {
  const feedItem = mapBuyerFeedItem(product);

  return {
    ...feedItem,
    disclosures: {
      returnPolicy: product.returnPolicy ?? "",
      sellerAddress: product.sellerAddress ?? "",
      sellerContact: resolveSellerContact(product)
    },
    images: product.images.map((image) => ({
      altText: image.altText ?? product.name,
      id: image.id,
      isPrimary: image.isPrimary,
      url: image.url
    })),
    reviewSummary: {
      averageRating: product.seller.reviewAggregate?.averageRating ?? 0,
      reviewCount
    },
    sellerRating: {
      averageRating: product.seller.reviewAggregate?.averageRating ?? 0,
      reviewCount: product.seller.reviewAggregate?.reviewCount ?? 0
    },
    variants: product.variants.flatMap((variant) => {
      if (variant.currency === null || variant.priceMinor === null) {
        return [];
      }

      return [mapBuyerVariant(variant as typeof variant & { currency: Currency; priceMinor: number })];
    })
  };
}

export async function getBuyerProductFeed(input?: {
  category?: string;
  cursor?: string;
  limit?: number;
}): Promise<BuyerFeedResult> {
  const limit = clampLimit(input?.limit);
  const publicWhere = createPublicProductWhere(input?.category);
  const decodedCursor = decodeCursor(input?.cursor);
  const cursorPublishedAt = decodedCursor ? new Date(decodedCursor.publishedAt) : null;

  const [products, categoryRecords] = await Promise.all([
    prisma.product.findMany({
      include: buyerProductInclude,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      where: {
        ...publicWhere,
        ...(decodedCursor && cursorPublishedAt
          ? {
              OR: [
                {
                  publishedAt: {
                    lt: cursorPublishedAt
                  }
                },
                {
                  AND: [
                    {
                      publishedAt: cursorPublishedAt
                    },
                    {
                      id: {
                        lt: decodedCursor.id
                      }
                    }
                  ]
                }
              ]
            }
          : {})
      }
    }),
    prisma.product.findMany({
      distinct: ["category"],
      select: {
        category: true
      },
      where: createPublicProductWhere()
    })
  ]);

  if (products.length > limit) {
    products.pop();
  }

  const lastVisibleProduct = products.at(-1);
  const nextCursor =
    lastVisibleProduct && products.length >= limit && lastVisibleProduct.publishedAt
      ? encodeCursor({
          id: lastVisibleProduct.id,
          publishedAt: lastVisibleProduct.publishedAt.toISOString()
        })
      : null;

  return {
    categories: categoryRecords
      .map((record) => record.category?.trim() ?? "")
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right)),
    items: products.map(mapBuyerFeedItem).sort(compareFeedItemsForDisplay),
    nextCursor
  };
}

export async function getBuyerProductBySlug(slug: string): Promise<BuyerProductDetail> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    throw new BuyerCatalogError("BAD_REQUEST", "Product slug is required.", 400);
  }

  const [product, reviewCount] = await Promise.all([
    prisma.product.findFirst({
      include: buyerProductInclude,
      where: {
        ...createPublicProductWhere(),
        slug: normalizedSlug
      }
    }),
    prisma.productReview.count({
      where: {
        product: {
          is: {
            slug: normalizedSlug
          }
        },
        status: ReviewStatus.PUBLISHED
      }
    })
  ]);

  if (!product) {
    throw new BuyerCatalogError("NOT_FOUND", "Product not found.", 404);
  }

  return mapBuyerProductDetail(product, reviewCount);
}
