import { Currency, Prisma, ReviewStatus } from "./prisma-client";
import { prisma } from "./prisma";

export class MarketplaceServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.name = "MarketplaceServiceError";
    this.status = status;
  }
}

export type ProductReviewEntry = {
  body: string;
  buyerName: string;
  createdAt: string;
  headline: string | null;
  id: string;
  rating: number;
};

export type ProductReviewSummary = {
  averageRating: number;
  entries: ProductReviewEntry[];
  reviewCount: number;
};

export type EligibleProductReviewOrder = {
  deliveredAt: string | null;
  orderId: string;
  orderNumber: string;
  sellerDisplayName: string;
};

export type SellerRatingSummary = {
  averageRating: number;
  reviewCount: number;
};

export type SavedProductEntry = {
  createdAt: string;
  id: string;
  product: {
    id: string;
    imageUrl: string | null;
    name: string;
    priceMinor: number | null;
    sellerSlug: string;
    slug: string;
  };
};

export type FollowedSellerEntry = {
  createdAt: string;
  id: string;
  seller: {
    displayName: string;
    followerCount: number;
    id: string;
    slug: string;
  };
};

export type NotificationEntry = {
  actionUrl: string | null;
  body: string;
  createdAt: string;
  id: string;
  isRead: boolean;
  kind: string;
  title: string;
};

export type BundlePreview = {
  id: string;
  itemCount: number;
  name: string;
  priceMinor: number;
  productIds: string[];
};

export type CouponPreview = {
  code: string;
  discountMinor: number;
  id: string;
  title: string;
};

export type ShippingEstimatePreview = {
  currency: Currency;
  estimatedMinor: number;
};

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function clampRating(value: number) {
  return Math.min(Math.max(Math.round(value), 1), 5);
}

async function recomputeSellerReviewAggregate(
  tx: Prisma.TransactionClient,
  sellerId: string,
) {
  const reviews = await tx.productReview.findMany({
    select: {
      rating: true,
    },
    where: {
      sellerId,
      status: ReviewStatus.PUBLISHED,
    },
  });

  const reviewCount = reviews.length;
  const totals = {
    fiveStarCount: 0,
    fourStarCount: 0,
    threeStarCount: 0,
    twoStarCount: 0,
    oneStarCount: 0,
  };
  let totalRating = 0;

  for (const review of reviews) {
    totalRating += review.rating;
    if (review.rating === 5) totals.fiveStarCount += 1;
    if (review.rating === 4) totals.fourStarCount += 1;
    if (review.rating === 3) totals.threeStarCount += 1;
    if (review.rating === 2) totals.twoStarCount += 1;
    if (review.rating === 1) totals.oneStarCount += 1;
  }

  await tx.sellerReviewAggregate.upsert({
    create: {
      averageRating: reviewCount > 0 ? totalRating / reviewCount : 0,
      reviewCount,
      sellerId,
      ...totals,
    },
    update: {
      averageRating: reviewCount > 0 ? totalRating / reviewCount : 0,
      reviewCount,
      ...totals,
    },
    where: {
      sellerId,
    },
  });
}

export async function listProductReviews(
  productId: string,
): Promise<ProductReviewSummary> {
  const entries = await prisma.productReview.findMany({
    include: {
      buyer: {
        select: {
          fullName: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    where: {
      productId,
      status: ReviewStatus.PUBLISHED,
    },
  });

  const reviewCount = entries.length;
  const averageRating =
    reviewCount > 0
      ? entries.reduce((sum, entry) => sum + entry.rating, 0) / reviewCount
      : 0;

  return {
    averageRating,
    entries: entries.map((entry) => ({
      body: entry.body ?? "",
      buyerName: entry.buyer.fullName,
      createdAt: entry.createdAt.toISOString(),
      headline: entry.headline ?? null,
      id: entry.id,
      rating: entry.rating,
    })),
    reviewCount,
  };
}

export async function getSellerRatingSummary(
  sellerId: string,
): Promise<SellerRatingSummary> {
  const aggregate = await prisma.sellerReviewAggregate.findUnique({
    where: {
      sellerId,
    },
  });

  return {
    averageRating: aggregate?.averageRating ?? 0,
    reviewCount: aggregate?.reviewCount ?? 0,
  };
}

export async function listEligibleProductReviewOrders(input: {
  buyerId: string;
  productId: string;
}): Promise<EligibleProductReviewOrder[]> {
  const orders = await prisma.order.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      completedAt: true,
      id: true,
      orderNumber: true,
      seller: {
        select: {
          displayName: true,
        },
      },
      shipment: {
        select: {
          deliveredAt: true,
        },
      },
    },
    where: {
      buyerId: input.buyerId,
      items: {
        some: {
          productId: input.productId,
        },
      },
      state: {
        in: ["DELIVERED", "COMPLETED"],
      },
    },
  });

  return orders.map((order) => ({
    deliveredAt: serializeDate(order.shipment?.deliveredAt ?? order.completedAt ?? null),
    orderId: order.id,
    orderNumber: order.orderNumber,
    sellerDisplayName: order.seller.displayName,
  }));
}

export async function createProductReview(input: {
  body?: string;
  buyerId: string;
  headline?: string;
  orderId: string;
  productId: string;
  rating: number;
}) {
  const order = await prisma.order.findFirst({
    include: {
      items: true,
    },
    where: {
      buyerId: input.buyerId,
      id: input.orderId,
      state: {
        in: ["DELIVERED", "COMPLETED"],
      },
    },
  });

  if (!order) {
    throw new MarketplaceServiceError(
      "FORBIDDEN",
      "Only delivered or completed orders can be reviewed.",
      403,
    );
  }

  const orderItem = order.items.find((item) => item.productId === input.productId);

  if (!orderItem) {
    throw new MarketplaceServiceError(
      "BAD_REQUEST",
      "That order does not contain the selected product.",
      400,
    );
  }

  const product = await prisma.product.findUnique({
    select: {
      sellerId: true,
    },
    where: {
      id: input.productId,
    },
  });

  if (!product) {
    throw new MarketplaceServiceError("NOT_FOUND", "Product not found.", 404);
  }

  const review = await prisma.$transaction(async (tx) => {
    const nextReview = await tx.productReview.upsert({
      create: {
        body: input.body?.trim() || null,
        buyerId: input.buyerId,
        headline: input.headline?.trim() || null,
        orderId: input.orderId,
        productId: input.productId,
        rating: clampRating(input.rating),
        sellerId: product.sellerId,
      },
      update: {
        body: input.body?.trim() || null,
        headline: input.headline?.trim() || null,
        rating: clampRating(input.rating),
        status: ReviewStatus.PUBLISHED,
      },
      where: {
        buyerId_orderId_productId: {
          buyerId: input.buyerId,
          orderId: input.orderId,
          productId: input.productId,
        },
      },
    });

    await recomputeSellerReviewAggregate(tx, product.sellerId);
    return nextReview;
  });

  return {
    createdAt: review.createdAt.toISOString(),
    id: review.id,
  };
}

export async function toggleSavedProduct(input: {
  buyerId: string;
  productId: string;
}) {
  const existing = await prisma.savedProduct.findFirst({
    where: {
      buyerId: input.buyerId,
      productId: input.productId,
    },
  });

  if (existing) {
    await prisma.savedProduct.delete({
      where: {
        id: existing.id,
      },
    });

    return { saved: false };
  }

  await prisma.savedProduct.create({
    data: {
      buyerId: input.buyerId,
      productId: input.productId,
    },
  });

  return { saved: true };
}

export async function listSavedProducts(
  buyerId: string,
): Promise<SavedProductEntry[]> {
  const entries = await prisma.savedProduct.findMany({
    include: {
      product: {
        include: {
          images: {
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 1,
          },
          seller: {
            select: {
              slug: true,
            },
          },
          variants: {
            orderBy: [{ isDefault: "desc" }, { position: "asc" }],
            take: 1,
            where: {
              currency: {
                not: null,
              },
              priceMinor: {
                not: null,
              },
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    where: {
      buyerId,
    },
  });

  return entries.map((entry) => ({
    createdAt: entry.createdAt.toISOString(),
    id: entry.id,
    product: {
      id: entry.product.id,
      imageUrl: entry.product.images[0]?.url ?? null,
      name: entry.product.name,
      priceMinor: entry.product.variants[0]?.priceMinor ?? null,
      sellerSlug: entry.product.seller.slug,
      slug: entry.product.slug,
    },
  }));
}

export async function toggleFollowedSeller(input: {
  buyerId: string;
  sellerId: string;
}) {
  const existing = await prisma.followedSeller.findFirst({
    where: {
      buyerId: input.buyerId,
      sellerId: input.sellerId,
    },
  });

  if (existing) {
    await prisma.followedSeller.delete({
      where: {
        id: existing.id,
      },
    });

    return { following: false };
  }

  await prisma.followedSeller.create({
    data: {
      buyerId: input.buyerId,
      sellerId: input.sellerId,
    },
  });

  return { following: true };
}

export async function listFollowedSellers(
  buyerId: string,
): Promise<FollowedSellerEntry[]> {
  const entries = await prisma.followedSeller.findMany({
    include: {
      seller: true,
    },
    orderBy: [{ createdAt: "desc" }],
    where: {
      buyerId,
    },
  });

  return Promise.all(
    entries.map(async (entry) => ({
      createdAt: entry.createdAt.toISOString(),
      id: entry.id,
      seller: {
        displayName: entry.seller.displayName,
        followerCount: await prisma.followedSeller.count({
          where: {
            sellerId: entry.sellerId,
          },
        }),
        id: entry.seller.id,
        slug: entry.seller.slug,
      },
    })),
  );
}

export async function listNotificationInbox(
  userId: string,
): Promise<NotificationEntry[]> {
  const entries = await prisma.userNotification.findMany({
    orderBy: [{ createdAt: "desc" }],
    where: {
      userId,
    },
  });

  return entries.map((entry) => ({
    actionUrl: entry.actionUrl ?? null,
    body: entry.body,
    createdAt: entry.createdAt.toISOString(),
    id: entry.id,
    isRead: entry.isRead,
    kind: entry.kind,
    title: entry.title,
  }));
}

export async function markNotificationRead(input: {
  notificationId: string;
  userId: string;
}) {
  await prisma.userNotification.updateMany({
    data: {
      isRead: true,
      readAt: new Date(),
    },
    where: {
      id: input.notificationId,
      userId: input.userId,
    },
  });

  return {
    success: true,
  };
}

export async function createUserNotification(input: {
  actionUrl?: string | null;
  body: string;
  kind:
    | "FOLLOW_SELLER"
    | "SAVED_PRODUCT_BACK_IN_STOCK"
    | "ORDER_UPDATE"
    | "CAMPAIGN_DROP"
    | "PRODUCT_APPROVED"
    | "VIDEO_POST_APPROVED";
  metadata?: Prisma.InputJsonValue | null;
  sellerId?: string | null;
  title: string;
  userId: string;
}) {
  const notification = await prisma.userNotification.create({
    data: {
      actionUrl: input.actionUrl ?? null,
      body: input.body,
      channel: "IN_APP",
      kind: input.kind,
      metadata: input.metadata ?? Prisma.JsonNull,
      sellerId: input.sellerId ?? null,
      title: input.title,
      userId: input.userId,
    },
  });

  return {
    id: notification.id,
  };
}

export async function listBundlePreviewsForSeller(
  sellerId: string,
): Promise<BundlePreview[]> {
  const bundles = await prisma.productBundle.findMany({
    include: {
      items: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    where: {
      isActive: true,
      sellerId,
    },
  });

  return bundles.map((bundle) => ({
    id: bundle.id,
    itemCount: bundle.items.reduce((sum, item) => sum + item.quantity, 0),
    name: bundle.name,
    priceMinor: 0,
    productIds: bundle.items.map((item) => item.productId),
  }));
}

export async function previewCouponForSeller(input: {
  code: string;
  sellerId: string;
  subtotalMinor: number;
}): Promise<CouponPreview | null> {
  const now = new Date();
  const coupon = await prisma.coupon.findFirst({
    where: {
      code: input.code.trim().toUpperCase(),
      isActive: true,
      sellerId: input.sellerId,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
  });

  if (!coupon) {
    return null;
  }

  if (
    typeof coupon.minimumSubtotalMinor === "number" &&
    input.subtotalMinor < coupon.minimumSubtotalMinor
  ) {
    return null;
  }

  const discountMinor =
    coupon.type === "AMOUNT"
      ? Math.max(0, coupon.amountOffMinor ?? 0)
      : Math.round(input.subtotalMinor * ((coupon.percentOff ?? 0) / 100));

  return {
    code: coupon.code,
    discountMinor,
    id: coupon.id,
    title: coupon.title,
  };
}

export function estimateShippingPreview(input: {
  currency: Currency;
  itemCount: number;
}): ShippingEstimatePreview {
  return {
    currency: input.currency,
    estimatedMinor: Math.max(0, input.itemCount) * (input.currency === "USD" ? 150 : 6000),
  };
}

export async function recordDeepLinkEvent(input: {
  metadata?: Prisma.InputJsonValue | null;
  orderId?: string | null;
  source?: string | null;
  targetId: string;
  targetType: "POST" | "PRODUCT" | "ORDER" | "SELLER";
  userId?: string | null;
}) {
  await prisma.deepLinkEvent.create({
    data: {
      metadata: input.metadata ?? Prisma.JsonNull,
      orderId: input.orderId ?? null,
      source: input.source ?? null,
      targetId: input.targetId,
      targetType: input.targetType,
      userId: input.userId ?? null,
    },
  });

  return { success: true };
}
