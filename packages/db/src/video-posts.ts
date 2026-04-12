import { canSellerListProducts } from "@khmercart/core";
import {
  Currency,
  KycStatus,
  Prisma,
  ProductModerationStatus,
  ProductStatus,
  VideoPostModerationStatus,
  VideoPostStatus
} from "./prisma-client";
import { prisma } from "./prisma";
import { SellerServiceError } from "./seller";
import {
  createSignedDownloadUrl,
  createSignedUploadUrl,
  getSignedUrlTtlSeconds,
  readObjectMetadata
} from "./storage";

type BuyerVideoCursor = {
  id: string;
  publishedAt: string;
};

const publicVideoPostInclude = {
  attachments: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }]
  },
  campaignSlots: {
    select: {
      boostScore: true,
      slotType: true
    }
  },
  metrics: true,
  product: {
    include: {
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { createdAt: "asc" }]
      },
      seller: {
        select: {
          displayName: true,
          id: true,
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
    }
  },
  seller: {
    select: {
      displayName: true,
      id: true,
      slug: true,
      supportEmail: true,
      supportPhone: true
    }
  }
} satisfies Prisma.VideoPostInclude;

const sellerVideoPostInclude = {
  attachments: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }]
  },
  metrics: true,
  product: {
    select: {
      id: true,
      moderationStatus: true,
      name: true,
      publishedAt: true,
      slug: true,
      status: true,
      variants: {
        include: {
          inventory: true
        },
        orderBy: [{ isDefault: "desc" }, { position: "asc" }, { createdAt: "asc" }],
        take: 1,
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
    }
  }
} satisfies Prisma.VideoPostInclude;

type PublicVideoPostRecord = Prisma.VideoPostGetPayload<{
  include: typeof publicVideoPostInclude;
}>;

type SellerVideoPostRecord = Prisma.VideoPostGetPayload<{
  include: typeof sellerVideoPostInclude;
}>;

export class VideoPostServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.name = "VideoPostServiceError";
    this.status = status;
  }
}

export type BuyerVideoFeedItem = {
  caption: string;
  campaignBadges: string[];
  id: string;
  isPinned: boolean;
  product: {
    category: string;
    description: string;
    featuredImageUrl: string | null;
    id: string;
    leadVariant: {
      availableQuantity: number;
      compareAtPriceMinor: number | null;
      currency: Currency;
      id: string;
      name: string;
      priceMinor: number;
      sku: string;
    };
    name: string;
    pricing: {
      compareAtPriceMinor: number | null;
      currency: Currency;
      priceMinor: number;
    };
    variants: Array<{
      availableQuantity: number;
      compareAtPriceMinor: number | null;
      currency: Currency;
      id: string;
      name: string;
      priceMinor: number;
      sku: string;
    }>;
    seller: {
      contact: string;
      displayName: string;
      id: string;
      slug: string;
    };
    slug: string;
    stock: {
      availableQuantity: number;
      state: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
    };
  };
  publishedAt: string;
  seller: {
    contact: string;
    displayName: string;
    id: string;
    slug: string;
  };
  shoppableProducts: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  video: {
    aspectRatio: number | null;
    durationSec: number | null;
    posterUrl: string | null;
    url: string | null;
  };
};

export type BuyerVideoFeedResult = {
  items: BuyerVideoFeedItem[];
  nextCursor: string | null;
};

export type SellerVideoPostUploadRequest = {
  expiresInSeconds: number;
  fileRole: "POSTER" | "VIDEO";
  key: string;
  uploadUrl: string;
};

export type SellerVideoPost = {
  analytics: {
    addToCarts: number;
    conversions: number;
    impressions: number;
    opens: number;
    productOpens: number;
  };
  attachments: Array<{
    id: string;
    isPrimary: boolean;
    name: string;
    productId: string;
    slug: string;
  }>;
  caption: string;
  createdAt: string;
  id: string;
  moderationNotes: string | null;
  moderationStatus: VideoPostModerationStatus;
  posterUrl: string | null;
  processingError: string | null;
  product: {
    currency: Currency | null;
    id: string;
    moderationStatus: ProductModerationStatus;
    name: string;
    priceMinor: number | null;
    publishedAt: string | null;
    slug: string;
    status: ProductStatus;
  };
  publishedAt: string | null;
  status: VideoPostStatus;
  updatedAt: string;
  video: {
    aspectRatio: number | null;
    durationSec: number | null;
    url: string | null;
  };
};

export type SellerVideoPostsData = {
  posts: SellerVideoPost[];
  sellerCanPublishPosts: boolean;
  sellerId: string | null;
};

type CreateSellerVideoPostInput = {
  attachmentProductIds?: string[];
  actorUserId?: string;
  aspectRatio?: number | null;
  caption?: string;
  durationSec?: number | null;
  ipAddress?: string | null;
  posterKey?: string | null;
  productId?: string;
  status?: string;
  userAgent?: string | null;
  userId: string;
  videoKey?: string;
};

type RequestSellerVideoPostUploadInput = {
  contentType?: string;
  fileName?: string;
  fileRole?: string;
  userId: string;
};

type ProcessSellerVideoPostInput = {
  actorUserId?: string;
  ipAddress?: string | null;
  postId: string;
  targetStatus?: string;
  userAgent?: string | null;
  userId: string;
};

const MAX_VIDEO_UPLOAD_BYTES = 250 * 1024 * 1024;
const MAX_POSTER_UPLOAD_BYTES = 20 * 1024 * 1024;
const MIN_VIDEO_DURATION_SEC = 3;
const MAX_VIDEO_DURATION_SEC = 180;
const MIN_VERTICAL_ASPECT_RATIO = 0.45;
const MAX_VERTICAL_ASPECT_RATIO = 0.8;

type RecordVideoPostMetricInput = {
  eventType:
    | "IMPRESSION"
    | "VIEWER_OPEN"
    | "PRODUCT_OPEN"
    | "ADD_TO_CART"
    | "CHECKOUT_START"
    | "ORDER_CONVERSION";
  videoPostId: string;
};

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function clampLimit(value: number | null | undefined): number {
  if (!Number.isInteger(value)) {
    return 6;
  }

  return Math.min(Math.max(value ?? 6, 1), 12);
}

function decodeCursor(cursor: string | null | undefined): BuyerVideoCursor | null {
  if (!cursor?.trim()) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as Partial<BuyerVideoCursor>;

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

function encodeCursor(cursor: BuyerVideoCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function resolveSellerContact(input: {
  displayName: string;
  supportEmail: string | null;
  supportPhone: string | null;
}): string {
  return input.supportEmail ?? input.supportPhone ?? input.displayName;
}

function resolveStockState(availableQuantity: number): "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" {
  if (availableQuantity <= 0) {
    return "OUT_OF_STOCK";
  }

  if (availableQuantity <= 5) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}

function normalizeKeySegment(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function looksLikeVideoAsset(key: string): boolean {
  return /\.(mp4|m4v|mov|webm)$/i.test(key);
}

function createFallbackPosterUrl(seed: string): string {
  return `https://placehold.co/720x1280/125b50/f4f0e8/png?text=${encodeURIComponent(seed)}`;
}

function resolveFallbackProductImageUrl(record: PublicVideoPostRecord): string {
  const featuredImageUrl = record.product.images[0]?.url;

  if (featuredImageUrl && !featuredImageUrl.includes(".local")) {
    return featuredImageUrl;
  }

  return createFallbackPosterUrl(`${record.seller.displayName} video`);
}

async function resolveSignedDownloadUrl(key: string | null | undefined): Promise<string | null> {
  if (!key) {
    return null;
  }

  try {
    return await createSignedDownloadUrl(key);
  } catch (error) {
    console.warn("Unable to sign media download URL", {
      error: error instanceof Error ? error.message : String(error),
      key
    });

    return null;
  }
}

function parseFileRole(value: string | undefined): "POSTER" | "VIDEO" {
  if (value?.trim().toUpperCase() === "POSTER") {
    return "POSTER";
  }

  return "VIDEO";
}

function validateContentType(fileRole: "POSTER" | "VIDEO", contentType: string) {
  if (fileRole === "VIDEO" && !contentType.startsWith("video/")) {
    throw new VideoPostServiceError(
      "BAD_REQUEST",
      "Video uploads must use a video content type.",
      400
    );
  }

  if (fileRole === "POSTER" && !contentType.startsWith("image/")) {
    throw new VideoPostServiceError(
      "BAD_REQUEST",
      "Poster uploads must use an image content type.",
      400
    );
  }
}

function parseStatus(value: string | undefined): VideoPostStatus {
  const normalized = value?.trim().toUpperCase();

  if (normalized === VideoPostStatus.UPLOADING) {
    return VideoPostStatus.UPLOADING;
  }

  if (normalized === VideoPostStatus.PROCESSING) {
    return VideoPostStatus.PROCESSING;
  }

  if (normalized === VideoPostStatus.READY) {
    return VideoPostStatus.READY;
  }

  if (normalized === VideoPostStatus.FAILED) {
    return VideoPostStatus.FAILED;
  }

  if (normalized === VideoPostStatus.PUBLISHED) {
    return VideoPostStatus.PUBLISHED;
  }

  if (normalized === VideoPostStatus.ARCHIVED) {
    return VideoPostStatus.ARCHIVED;
  }

  return VideoPostStatus.DRAFT;
}

function parseProcessTargetStatus(value: string | undefined): VideoPostStatus {
  const normalized = parseStatus(value);

  if (normalized === VideoPostStatus.PUBLISHED) {
    return VideoPostStatus.PUBLISHED;
  }

  return VideoPostStatus.READY;
}

function resolveProcessingFailureMessage(error: unknown) {
  if (error instanceof VideoPostServiceError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to validate uploaded media.";
}

function validateProcessedVideoPostShape(input: {
  aspectRatio: number | null;
  durationSec: number | null;
  posterContentLength: number | null;
  videoContentLength: number | null;
}) {
  if (input.durationSec === null) {
    throw new VideoPostServiceError(
      "BAD_REQUEST",
      "Video duration could not be determined. Re-select the clip before publishing.",
      400
    );
  }

  if (
    input.durationSec < MIN_VIDEO_DURATION_SEC ||
    input.durationSec > MAX_VIDEO_DURATION_SEC
  ) {
    throw new VideoPostServiceError(
      "BAD_REQUEST",
      `Video duration must be between ${MIN_VIDEO_DURATION_SEC} and ${MAX_VIDEO_DURATION_SEC} seconds.`,
      400
    );
  }

  if (input.aspectRatio === null) {
    throw new VideoPostServiceError(
      "BAD_REQUEST",
      "Video aspect ratio could not be determined. Re-select the clip before publishing.",
      400
    );
  }

  if (
    input.aspectRatio < MIN_VERTICAL_ASPECT_RATIO ||
    input.aspectRatio > MAX_VERTICAL_ASPECT_RATIO
  ) {
    throw new VideoPostServiceError(
      "BAD_REQUEST",
      "Video must be shot in a vertical mobile-friendly format before publishing.",
      400
    );
  }

  if (
    input.videoContentLength !== null &&
    input.videoContentLength > MAX_VIDEO_UPLOAD_BYTES
  ) {
    throw new VideoPostServiceError(
      "BAD_REQUEST",
      "Video file is too large to process for seller publishing.",
      400
    );
  }

  if (
    input.posterContentLength !== null &&
    input.posterContentLength > MAX_POSTER_UPLOAD_BYTES
  ) {
    throw new VideoPostServiceError(
      "BAD_REQUEST",
      "Poster image is too large to process for seller publishing.",
      400
    );
  }
}

function mapLeadVariant(variant: PublicVideoPostRecord["product"]["variants"][number] & {
  currency: Currency;
  priceMinor: number;
}) {
  return {
    availableQuantity: variant.inventory?.availableQuantity ?? 0,
    compareAtPriceMinor: variant.compareAtPriceMinor ?? null,
    currency: variant.currency,
    id: variant.id,
    name: variant.name,
    priceMinor: variant.priceMinor,
    sku: variant.sku
  };
}

function sumAvailableInventory(product: PublicVideoPostRecord["product"]) {
  return product.variants.reduce(
    (sum, variant) => sum + (variant.inventory?.availableQuantity ?? 0),
    0
  );
}

function resolvePublicLeadVariant(product: PublicVideoPostRecord["product"]) {
  const leadVariant =
    product.variants.find((variant) => (variant.inventory?.availableQuantity ?? 0) > 0) ??
    product.variants[0];

  if (!leadVariant || leadVariant.currency === null || leadVariant.priceMinor === null) {
    throw new VideoPostServiceError("NOT_FOUND", "Attached product is not buyer-ready.", 404);
  }

  return leadVariant as typeof leadVariant & {
    currency: Currency;
    priceMinor: number;
  };
}

async function recordAuditLog(
  tx: Prisma.TransactionClient,
  input: {
    action: string;
    actorUserId?: string | null;
    afterData?: Prisma.InputJsonValue | null;
    entityId: string;
    entityType: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      afterData: input.afterData ?? Prisma.JsonNull,
      beforeData: Prisma.JsonNull,
      entityId: input.entityId,
      entityType: input.entityType,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null
    }
  });
}

async function getSellerProfileForUser(userId: string) {
  const seller = await prisma.seller.findFirst({
    include: {
      user: true
    },
    where: {
      userId
    }
  });

  if (!seller) {
    throw new SellerServiceError("NOT_FOUND", "Seller profile not found.", 404);
  }

  return seller;
}

function createPublicVideoPostWhere(): Prisma.VideoPostWhereInput {
  return {
    moderationStatus: VideoPostModerationStatus.APPROVED,
    product: {
      is: {
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
      }
    },
    publishedAt: {
      not: null
    },
    seller: {
      is: {
        isActive: true,
        kycStatus: KycStatus.APPROVED
      }
    },
    status: VideoPostStatus.PUBLISHED
  };
}

function aggregateMetrics(
  metrics: Array<{
    addToCarts: number;
    conversions: number;
    impressions: number;
    opens: number;
    productOpens: number;
  }>
) {
  return metrics.reduce(
    (totals, metric) => ({
      addToCarts: totals.addToCarts + metric.addToCarts,
      conversions: totals.conversions + metric.conversions,
      impressions: totals.impressions + metric.impressions,
      opens: totals.opens + metric.opens,
      productOpens: totals.productOpens + metric.productOpens
    }),
    {
      addToCarts: 0,
      conversions: 0,
      impressions: 0,
      opens: 0,
      productOpens: 0
    }
  );
}

function rankVideoPost(record: PublicVideoPostRecord) {
  const metrics = aggregateMetrics(record.metrics);
  const campaignBoost = record.campaignSlots.reduce(
    (sum, slot) => sum + slot.boostScore,
    0
  );
  const conversionBoost =
    metrics.impressions > 0 ? (metrics.conversions / metrics.impressions) * 100 : 0;
  const inventoryBoost = sumAvailableInventory(record.product) > 0 ? 3 : -5;

  return (
    (record.isPinned ? 1000 : 0) +
    record.manualBoost +
    record.featuredScore +
    campaignBoost +
    conversionBoost +
    inventoryBoost
  );
}

async function mapBuyerVideoFeedItem(record: PublicVideoPostRecord): Promise<BuyerVideoFeedItem> {
  const leadVariant = resolvePublicLeadVariant(record.product);
  const availableQuantity = sumAvailableInventory(record.product);
  const [videoUrl, posterUrl] = await Promise.all([
    looksLikeVideoAsset(record.videoKey) ? resolveSignedDownloadUrl(record.videoKey) : null,
    resolveSignedDownloadUrl(record.posterKey)
  ]);
  const resolvedPosterUrl = posterUrl ?? resolveFallbackProductImageUrl(record);

  return {
    caption: record.caption,
    campaignBadges: record.campaignSlots.map((slot) => slot.slotType),
    id: record.id,
    isPinned: record.isPinned,
    product: {
      category: record.product.category ?? "",
      description: record.product.description ?? "",
      featuredImageUrl: record.product.images[0]?.url ?? null,
      id: record.product.id,
      leadVariant: mapLeadVariant(leadVariant),
      name: record.product.name,
      pricing: {
        compareAtPriceMinor: leadVariant.compareAtPriceMinor ?? null,
        currency: leadVariant.currency,
        priceMinor: leadVariant.priceMinor
      },
      variants: record.product.variants.flatMap((variant) => {
        if (variant.currency === null || variant.priceMinor === null) {
          return [];
        }

        return [mapLeadVariant(variant as typeof variant & { currency: Currency; priceMinor: number })];
      }),
      seller: {
        contact: resolveSellerContact(record.product.seller),
        displayName: record.product.seller.displayName,
        id: record.product.seller.id,
        slug: record.product.seller.slug
      },
      slug: record.product.slug,
      stock: {
        availableQuantity,
        state: resolveStockState(availableQuantity)
      }
    },
    publishedAt: (record.publishedAt ?? record.updatedAt).toISOString(),
    seller: {
      contact: resolveSellerContact(record.seller),
      displayName: record.seller.displayName,
      id: record.seller.id,
      slug: record.seller.slug
    },
    shoppableProducts: record.attachments.map((attachment) => ({
      id: attachment.product.id,
      name: attachment.product.name,
      slug: attachment.product.slug
    })),
    video: {
      aspectRatio: record.aspectRatio ?? null,
      durationSec: record.durationSec ?? null,
      posterUrl: resolvedPosterUrl,
      url: videoUrl
    }
  };
}

async function mapSellerVideoPost(record: SellerVideoPostRecord): Promise<SellerVideoPost> {
  const [videoUrl, posterUrl] = await Promise.all([
    looksLikeVideoAsset(record.videoKey) ? resolveSignedDownloadUrl(record.videoKey) : null,
    resolveSignedDownloadUrl(record.posterKey)
  ]);

  return {
    analytics: aggregateMetrics(record.metrics),
    attachments: record.attachments.map((attachment) => ({
      id: attachment.id,
      isPrimary: attachment.isPrimary,
      name: attachment.product.name,
      productId: attachment.product.id,
      slug: attachment.product.slug
    })),
    caption: record.caption,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    moderationNotes: record.moderationNotes ?? null,
    moderationStatus: record.moderationStatus,
    posterUrl,
    processingError: record.processingError ?? null,
    product: {
      currency: record.product.variants[0]?.currency ?? null,
      id: record.product.id,
      moderationStatus: record.product.moderationStatus,
      name: record.product.name,
      priceMinor: record.product.variants[0]?.priceMinor ?? null,
      publishedAt: serializeDate(record.product.publishedAt),
      slug: record.product.slug,
      status: record.product.status
    },
    publishedAt: serializeDate(record.publishedAt),
    status: record.status,
    updatedAt: record.updatedAt.toISOString(),
    video: {
      aspectRatio: record.aspectRatio ?? null,
      durationSec: record.durationSec ?? null,
      url: videoUrl
    }
  };
}

export async function requestSellerVideoPostUpload(
  input: RequestSellerVideoPostUploadInput
): Promise<SellerVideoPostUploadRequest> {
  const seller = await getSellerProfileForUser(input.userId);
  const fileRole = parseFileRole(input.fileRole);
  const contentType = input.contentType?.trim().toLowerCase();
  const fileName = input.fileName?.trim();

  if (!contentType) {
    throw new VideoPostServiceError("BAD_REQUEST", "Content type is required.", 400);
  }

  if (!fileName) {
    throw new VideoPostServiceError("BAD_REQUEST", "File name is required.", 400);
  }

  validateContentType(fileRole, contentType);

  const timestamp = Date.now();
  const normalizedName = normalizeKeySegment(fileName);
  const key = `seller-content/${seller.id}/video-posts/${fileRole.toLowerCase()}/${timestamp}-${normalizedName}`;

  return {
    expiresInSeconds: getSignedUrlTtlSeconds(),
    fileRole,
    key,
    uploadUrl: await createSignedUploadUrl({
      contentType,
      key
    })
  };
}

export async function createSellerVideoPost(
  input: CreateSellerVideoPostInput
): Promise<SellerVideoPost> {
  const caption = input.caption?.trim();
  const productId = input.productId?.trim();
  const videoKey = input.videoKey?.trim();
  const posterKey = input.posterKey?.trim() || null;
  const desiredStatus = parseStatus(input.status);
  const initialStatus =
    desiredStatus === VideoPostStatus.PUBLISHED ? VideoPostStatus.PROCESSING : desiredStatus;
  const attachmentProductIds = [
    ...new Set(
      (input.attachmentProductIds ?? []).map((value) => value.trim()).filter(Boolean)
    )
  ];

  if (!caption) {
    throw new VideoPostServiceError("BAD_REQUEST", "Caption is required.", 400);
  }

  if (!productId) {
    throw new VideoPostServiceError("BAD_REQUEST", "Attached product is required.", 400);
  }

  if (!videoKey) {
    throw new VideoPostServiceError("BAD_REQUEST", "Video upload key is required.", 400);
  }

  const seller = await getSellerProfileForUser(input.userId);
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      sellerId: seller.id
    }
  });

  if (!product) {
    throw new VideoPostServiceError("NOT_FOUND", "Product not found for this seller.", 404);
  }

  const attachmentProducts = attachmentProductIds.length
    ? await prisma.product.findMany({
        select: {
          id: true
        },
        where: {
          id: {
            in: attachmentProductIds
          },
          sellerId: seller.id
        }
      })
    : [];

  if (attachmentProductIds.length > 0 && attachmentProducts.length !== attachmentProductIds.length) {
    throw new VideoPostServiceError(
      "BAD_REQUEST",
      "Every attached product must belong to the current seller.",
      400
    );
  }

  if (
    desiredStatus === VideoPostStatus.PUBLISHED &&
    !canSellerListProducts(seller.kycStatus)
  ) {
    throw new VideoPostServiceError(
      "BAD_REQUEST",
      "Seller account must be approved before publishing video posts.",
      400
    );
  }

  if (
    desiredStatus === VideoPostStatus.PUBLISHED &&
    (product.status !== ProductStatus.ACTIVE ||
      product.moderationStatus !== ProductModerationStatus.APPROVED)
  ) {
    throw new VideoPostServiceError(
      "BAD_REQUEST",
      "Publish an approved active product before attaching it to a public video post.",
      400
    );
  }

  const createdId = await prisma.$transaction(async (tx) => {
    const post = await tx.videoPost.create({
      data: {
        aspectRatio:
          typeof input.aspectRatio === "number" && Number.isFinite(input.aspectRatio)
            ? input.aspectRatio
            : null,
        caption,
        durationSec:
          typeof input.durationSec === "number" && Number.isFinite(input.durationSec)
            ? Math.max(1, Math.round(input.durationSec))
            : null,
        moderationStatus: VideoPostModerationStatus.PENDING,
        posterKey,
        processedAt: initialStatus === VideoPostStatus.READY ? new Date() : null,
        processingStartedAt:
          initialStatus === VideoPostStatus.PROCESSING ? new Date() : null,
        productId: product.id,
        publishedAt: null,
        sellerId: seller.id,
        status: initialStatus,
        videoKey
      },
      include: sellerVideoPostInclude
    });

    if (attachmentProductIds.length > 0) {
      await tx.videoPostAttachment.createMany({
        data: attachmentProductIds.map((attachedProductId, index) => ({
          isPrimary: attachedProductId === product.id || index === 0,
          position: index,
          productId: attachedProductId,
          videoPostId: post.id
        })),
        skipDuplicates: true
      });
    } else {
      await tx.videoPostAttachment.create({
        data: {
          isPrimary: true,
          position: 0,
          productId: product.id,
          videoPostId: post.id
        }
      });
    }

    await recordAuditLog(tx, {
      action: "VIDEO_POST_CREATED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        caption: post.caption,
        moderationStatus: post.moderationStatus,
        productId: post.productId,
        publishedAt: serializeDate(post.publishedAt),
        requestedStatus: desiredStatus,
        status: post.status,
        videoKey: post.videoKey
      },
      entityId: post.id,
      entityType: "VideoPost",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return post.id;
  });

  const created = await prisma.videoPost.findUniqueOrThrow({
    include: sellerVideoPostInclude,
    where: {
      id: createdId
    }
  });

  return mapSellerVideoPost(created);
}

export async function processSellerVideoPost(
  input: ProcessSellerVideoPostInput
): Promise<SellerVideoPost> {
  const targetStatus = parseProcessTargetStatus(input.targetStatus);
  const seller = await getSellerProfileForUser(input.userId);
  const existing = await prisma.videoPost.findFirst({
    include: sellerVideoPostInclude,
    where: {
      id: input.postId,
      sellerId: seller.id
    }
  });

  if (!existing) {
    throw new VideoPostServiceError("NOT_FOUND", "Video post not found for this seller.", 404);
  }

  await prisma.videoPost.update({
    data: {
      processingError: null,
      processedAt: null,
      processingStartedAt: new Date(),
      status: VideoPostStatus.PROCESSING
    },
    where: {
      id: existing.id
    }
  });

  try {
    if (
      targetStatus === VideoPostStatus.PUBLISHED &&
      !canSellerListProducts(seller.kycStatus)
    ) {
      throw new VideoPostServiceError(
        "BAD_REQUEST",
        "Seller account must be approved before publishing video posts.",
        400
      );
    }

    if (
      targetStatus === VideoPostStatus.PUBLISHED &&
      (existing.product.status !== ProductStatus.ACTIVE ||
        existing.product.moderationStatus !== ProductModerationStatus.APPROVED)
    ) {
      throw new VideoPostServiceError(
        "BAD_REQUEST",
        "Publish an approved active product before attaching it to a public video post.",
        400
      );
    }

    const [videoMetadata, posterMetadata] = await Promise.all([
      readObjectMetadata(existing.videoKey),
      existing.posterKey ? readObjectMetadata(existing.posterKey) : null
    ]);

    if (!videoMetadata.exists) {
      throw new VideoPostServiceError("BAD_REQUEST", "Uploaded video file could not be found.", 400);
    }

    if (!videoMetadata.contentType?.startsWith("video/")) {
      throw new VideoPostServiceError(
        "BAD_REQUEST",
        "Uploaded video file is not a valid video object.",
        400
      );
    }

    if ((videoMetadata.contentLength ?? 0) <= 0) {
      throw new VideoPostServiceError("BAD_REQUEST", "Uploaded video file is empty.", 400);
    }

    if (existing.posterKey) {
      if (!posterMetadata?.exists) {
        throw new VideoPostServiceError(
          "BAD_REQUEST",
          "Uploaded poster file could not be found.",
          400
        );
      }

      if (!posterMetadata.contentType?.startsWith("image/")) {
        throw new VideoPostServiceError(
          "BAD_REQUEST",
          "Uploaded poster file is not a valid image object.",
          400
        );
      }
    }

    validateProcessedVideoPostShape({
      aspectRatio: existing.aspectRatio,
      durationSec: existing.durationSec,
      posterContentLength: posterMetadata?.contentLength ?? null,
      videoContentLength: videoMetadata.contentLength ?? null
    });

    const processed = await prisma.videoPost.update({
      data: {
        moderationStatus:
          targetStatus === VideoPostStatus.PUBLISHED
            ? VideoPostModerationStatus.APPROVED
            : existing.moderationStatus,
        processedAt: new Date(),
        processingError: null,
        publishedAt:
          targetStatus === VideoPostStatus.PUBLISHED
            ? existing.publishedAt ?? new Date()
            : existing.publishedAt,
        status: targetStatus
      },
      include: sellerVideoPostInclude,
      where: {
        id: existing.id
      }
    });

    await prisma.auditLog.create({
      data: {
        action:
          targetStatus === VideoPostStatus.PUBLISHED
            ? "VIDEO_POST_PUBLISHED"
            : "VIDEO_POST_PROCESSED",
        actorUserId: input.actorUserId ?? input.userId,
        afterData: {
          processedAt: serializeDate(processed.processedAt),
          publishedAt: serializeDate(processed.publishedAt),
          status: processed.status
        },
        beforeData: Prisma.JsonNull,
        entityId: processed.id,
        entityType: "VideoPost",
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null
      }
    });

    return mapSellerVideoPost(processed);
  } catch (error) {
    await prisma.videoPost.update({
      data: {
        processingError: resolveProcessingFailureMessage(error),
        processedAt: null,
        status: VideoPostStatus.FAILED
      },
      where: {
        id: existing.id
      }
    });

    throw error;
  }
}

export async function getSellerVideoPostsData(userId: string): Promise<SellerVideoPostsData> {
  const seller = await prisma.seller.findFirst({
    where: {
      userId
    }
  });

  if (!seller) {
    throw new SellerServiceError("NOT_FOUND", "Seller profile not found.", 404);
  }

  const posts = await prisma.videoPost.findMany({
    include: sellerVideoPostInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    where: {
      sellerId: seller.id
    }
  });

  return {
    posts: await Promise.all(posts.map(mapSellerVideoPost)),
    sellerCanPublishPosts: canSellerListProducts(seller.kycStatus),
    sellerId: seller.id
  };
}

export async function recordVideoPostMetric(
  input: RecordVideoPostMetricInput
) {
  const metricDate = new Date();
  metricDate.setHours(0, 0, 0, 0);

  await prisma.videoPostMetricDaily.upsert({
    create: {
      addToCarts: input.eventType === "ADD_TO_CART" ? 1 : 0,
      checkoutStarts: input.eventType === "CHECKOUT_START" ? 1 : 0,
      conversions: input.eventType === "ORDER_CONVERSION" ? 1 : 0,
      impressions: input.eventType === "IMPRESSION" ? 1 : 0,
      metricDate,
      opens: input.eventType === "VIEWER_OPEN" ? 1 : 0,
      productOpens: input.eventType === "PRODUCT_OPEN" ? 1 : 0,
      videoPostId: input.videoPostId
    },
    update: {
      addToCarts: {
        increment: input.eventType === "ADD_TO_CART" ? 1 : 0
      },
      checkoutStarts: {
        increment: input.eventType === "CHECKOUT_START" ? 1 : 0
      },
      conversions: {
        increment: input.eventType === "ORDER_CONVERSION" ? 1 : 0
      },
      impressions: {
        increment: input.eventType === "IMPRESSION" ? 1 : 0
      },
      opens: {
        increment: input.eventType === "VIEWER_OPEN" ? 1 : 0
      },
      productOpens: {
        increment: input.eventType === "PRODUCT_OPEN" ? 1 : 0
      }
    },
    where: {
      videoPostId_metricDate: {
        metricDate,
        videoPostId: input.videoPostId
      }
    }
  });

  return {
    success: true
  };
}

export async function getBuyerVideoFeed(input?: {
  cursor?: string;
  limit?: number;
}): Promise<BuyerVideoFeedResult> {
  const limit = clampLimit(input?.limit);
  const decodedCursor = decodeCursor(input?.cursor);
  const cursorPublishedAt = decodedCursor ? new Date(decodedCursor.publishedAt) : null;
  const posts = await prisma.videoPost.findMany({
    include: publicVideoPostInclude,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    where: {
      ...createPublicVideoPostWhere(),
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
  });

  if (posts.length > limit) {
    posts.pop();
  }

  const lastVisiblePost = posts.at(-1);
  const nextCursor =
    lastVisiblePost && posts.length >= limit && lastVisiblePost.publishedAt
      ? encodeCursor({
          id: lastVisiblePost.id,
          publishedAt: lastVisiblePost.publishedAt.toISOString()
        })
      : null;

  const rankedPosts = [...posts].sort((left, right) => {
    const rankDelta = rankVideoPost(right) - rankVideoPost(left);

    if (rankDelta !== 0) {
      return rankDelta;
    }

    return (right.publishedAt ?? right.updatedAt).getTime() - (left.publishedAt ?? left.updatedAt).getTime();
  });

  return {
    items: await Promise.all(rankedPosts.map(mapBuyerVideoFeedItem)),
    nextCursor
  };
}
