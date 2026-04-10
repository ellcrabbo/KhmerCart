import { canSellerListProducts } from "@khmercart/core";
import {
  Currency,
  KycStatus,
  Prisma,
  ProductModerationStatus,
  ProductStatus,
  VideoPostStatus
} from "./prisma-client";
import { prisma } from "./prisma";
import { SellerServiceError } from "./seller";
import {
  createSignedDownloadUrl,
  createSignedUploadUrl,
  getSignedUrlTtlSeconds
} from "./storage";

type BuyerVideoCursor = {
  id: string;
  publishedAt: string;
};

const publicVideoPostInclude = {
  product: {
    include: {
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }, { createdAt: "asc" }]
      },
      seller: {
        select: {
          displayName: true,
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
      slug: true,
      supportEmail: true,
      supportPhone: true
    }
  }
} satisfies Prisma.VideoPostInclude;

const sellerVideoPostInclude = {
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
  id: string;
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
    seller: {
      contact: string;
      displayName: string;
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
    slug: string;
  };
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
  caption: string;
  createdAt: string;
  id: string;
  posterUrl: string | null;
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

  if (normalized === VideoPostStatus.PUBLISHED) {
    return VideoPostStatus.PUBLISHED;
  }

  if (normalized === VideoPostStatus.ARCHIVED) {
    return VideoPostStatus.ARCHIVED;
  }

  return VideoPostStatus.DRAFT;
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

async function mapBuyerVideoFeedItem(record: PublicVideoPostRecord): Promise<BuyerVideoFeedItem> {
  const leadVariant = resolvePublicLeadVariant(record.product);
  const availableQuantity = sumAvailableInventory(record.product);
  const [videoUrl, posterUrl] = await Promise.all([
    looksLikeVideoAsset(record.videoKey) ? resolveSignedDownloadUrl(record.videoKey) : null,
    resolveSignedDownloadUrl(record.posterKey)
  ]);
  const resolvedPosterUrl = posterUrl ?? record.product.images[0]?.url ?? null;

  return {
    caption: record.caption,
    id: record.id,
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
      seller: {
        contact: resolveSellerContact(record.product.seller),
        displayName: record.product.seller.displayName,
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
      slug: record.seller.slug
    },
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
    caption: record.caption,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    posterUrl,
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

  const created = await prisma.$transaction(async (tx) => {
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
        posterKey,
        productId: product.id,
        publishedAt: desiredStatus === VideoPostStatus.PUBLISHED ? new Date() : null,
        sellerId: seller.id,
        status: desiredStatus,
        videoKey
      },
      include: sellerVideoPostInclude
    });

    await recordAuditLog(tx, {
      action: "VIDEO_POST_CREATED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        caption: post.caption,
        productId: post.productId,
        publishedAt: serializeDate(post.publishedAt),
        status: post.status,
        videoKey: post.videoKey
      },
      entityId: post.id,
      entityType: "VideoPost",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return post;
  });

  return mapSellerVideoPost(created);
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

  return {
    items: await Promise.all(posts.map(mapBuyerVideoFeedItem)),
    nextCursor
  };
}
