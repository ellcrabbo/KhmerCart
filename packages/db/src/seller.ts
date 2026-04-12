import {
  canSellerListProducts,
  getPrimaryRole,
  readKycDocumentTypes,
  type Role,
  type SessionUser,
} from "@khmercart/core";
import {
  CampaignSlotType,
  CampaignStatus,
  Currency,
  KycStatus,
  Prisma,
  type PrismaClient,
  type Seller,
  type SellerDocument,
  type User,
  UserRole,
} from "./prisma-client";
import { createUserNotification } from "./marketplace";
import {
  createSignedDownloadUrl,
  createSignedUploadUrl,
  getSignedUrlTtlSeconds,
} from "./storage";
import { prisma } from "./prisma";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

type SellerWithDocuments = Seller & {
  documents: SellerDocument[];
};

type UserWithSeller = User & {
  sellerProfile: SellerWithDocuments | null;
};

export type SellerDashboardData = {
  analytics: {
    addToCarts: number;
    conversionRate: number;
    conversions: number;
    daily: Array<{
      addToCarts: number;
      conversions: number;
      date: string;
      impressions: number;
      productOpens: number;
      viewerOpens: number;
    }>;
    impressions: number;
    livePosts: number;
    productOpens: number;
    publishedProducts: number;
    topProducts: Array<{
      addToCarts: number;
      conversions: number;
      conversionRate: number;
      impressions: number;
      productId: string;
      productName: string;
      viewerOpens: number;
    }>;
    topPost: {
      caption: string;
      conversionRate: number;
      id: string;
      impressions: number;
      productName: string;
    } | null;
    viewerOpenRate: number;
    viewerOpens: number;
  };
  bundles: Array<{
    description: string;
    id: string;
    isActive: boolean;
    itemCount: number;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
    }>;
    name: string;
    slug: string;
  }>;
  campaigns: Array<{
    boostScore: number;
    description: string;
    endsAt: string | null;
    id: string;
    productId: string | null;
    productName: string | null;
    slotType: CampaignSlotType | null;
    startsAt: string | null;
    status: CampaignStatus;
    title: string;
    videoPostCaption: string | null;
    videoPostId: string | null;
  }>;
  canListProducts: boolean;
  documents: Array<{
    contentType: string;
    createdAt: string;
    fileName: string;
    id: string;
    s3Key: string;
    sizeBytes: number | null;
    type: string;
    uploadedAt: string | null;
  }>;
  kycDocumentTypes: string[];
  missingRequirements: string[];
  seller: {
    businessDescription: string;
    defaultCurrency: Currency;
    displayName: string;
    id: string | null;
    kycApprovedAt: string | null;
    kycNotes: string;
    kycRejectedAt: string | null;
    kycStatus: KycStatus;
    kycSubmittedAt: string | null;
    legalName: string;
    payoutAccountName: string;
    payoutAccountNumber: string;
    payoutBankName: string;
    payoutRoutingNumber: string;
    slug: string;
    supportEmail: string;
    supportPhone: string;
  };
  submitDisabled: boolean;
  user: {
    email: string | null;
    fullName: string;
    id: string;
    phone: string | null;
  };
};

export type SellerApprovalQueueEntry = {
  createdAt: string;
  displayName: string;
  documents: Array<{
    accessUrl: string | null;
    fileName: string;
    id: string;
    s3Key: string;
    type: string;
    uploadedAt: string | null;
  }>;
  id: string;
  kycNotes: string;
  kycStatus: KycStatus;
  kycSubmittedAt: string | null;
  legalName: string;
  payoutAccountName: string;
  payoutBankName: string;
  slug: string;
  supportEmail: string;
  supportPhone: string;
  updatedAt: string;
  user: {
    email: string | null;
    fullName: string;
    id: string;
    phone: string | null;
  };
};

export type RecentAuditEntry = {
  action: string;
  actorName: string | null;
  createdAt: string;
  entityId: string;
  entityType: string;
  id: string;
};

export type SellerUploadRequest = {
  documentId: string;
  expiresInSeconds: number;
  s3Key: string;
  uploadUrl: string;
};

export class SellerServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.name = "SellerServiceError";
    this.status = status;
  }
}

type SaveSellerOnboardingInput = {
  actorUserId?: string;
  businessDescription?: string;
  defaultCurrency?: string;
  displayName?: string;
  ipAddress?: string | null;
  legalName?: string;
  payoutAccountName?: string;
  payoutAccountNumber?: string;
  payoutBankName?: string;
  payoutRoutingNumber?: string;
  slug?: string;
  submitForReview?: boolean;
  supportEmail?: string;
  supportPhone?: string;
  userAgent?: string | null;
  userId: string;
};

function sanitizeSlug(input: string | undefined, fallback: string): string {
  const source = (input?.trim() || fallback).toLowerCase();
  const normalized = source
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || "seller";
}

function sanitizeBundleSlug(input: string | undefined, fallback: string): string {
  const source = (input?.trim() || fallback).toLowerCase();
  const normalized = source
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || "bundle";
}

function parseCurrency(
  value: string | undefined,
  fallback: Currency,
): Currency {
  if (value === Currency.KHR) {
    return Currency.KHR;
  }

  if (value === Currency.USD) {
    return Currency.USD;
  }

  return fallback;
}

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function buildDefaultSellerProfile(user: UserWithSeller) {
  const seller = user.sellerProfile;

  return {
    businessDescription: seller?.businessDescription ?? "",
    defaultCurrency: seller?.defaultCurrency ?? Currency.KHR,
    displayName: seller?.displayName ?? user.fullName,
    id: seller?.id ?? null,
    kycApprovedAt: serializeDate(seller?.kycApprovedAt),
    kycNotes: seller?.kycNotes ?? "",
    kycRejectedAt: serializeDate(seller?.kycRejectedAt),
    kycStatus: seller?.kycStatus ?? KycStatus.PENDING,
    kycSubmittedAt: serializeDate(seller?.kycSubmittedAt),
    legalName: seller?.legalName ?? "",
    payoutAccountName: seller?.payoutAccountName ?? "",
    payoutAccountNumber: seller?.payoutAccountNumber ?? "",
    payoutBankName: seller?.payoutBankName ?? "",
    payoutRoutingNumber: seller?.payoutRoutingNumber ?? "",
    slug: seller?.slug ?? sanitizeSlug(undefined, user.fullName),
    supportEmail: seller?.supportEmail ?? user.email ?? "",
    supportPhone: seller?.supportPhone ?? user.phone ?? "",
  };
}

function getMissingRequirements(
  data: SellerDashboardData["seller"],
  uploadedDocumentCount: number,
) {
  const missing: string[] = [];

  if (!data.displayName.trim()) {
    missing.push("Display name");
  }

  if (!data.slug.trim()) {
    missing.push("Store slug");
  }

  if (!data.legalName.trim()) {
    missing.push("Legal name");
  }

  if (!data.supportEmail.trim() && !data.supportPhone.trim()) {
    missing.push("Support contact");
  }

  if (!data.payoutBankName.trim()) {
    missing.push("Payout bank");
  }

  if (!data.payoutAccountName.trim()) {
    missing.push("Payout account name");
  }

  if (!data.payoutAccountNumber.trim()) {
    missing.push("Payout account number");
  }

  if (!data.payoutRoutingNumber.trim()) {
    missing.push("Payout routing/reference");
  }

  if (uploadedDocumentCount < 1) {
    missing.push("At least one uploaded KYC document");
  }

  return missing;
}

function mapDocuments(documents: SellerDocument[]) {
  return documents.map((document) => ({
    contentType: document.contentType,
    createdAt: document.createdAt.toISOString(),
    fileName: document.fileName,
    id: document.id,
    s3Key: document.s3Key,
    sizeBytes: document.sizeBytes ?? null,
    type: document.type,
    uploadedAt: serializeDate(document.uploadedAt),
  }));
}

async function readSellerAnalyticsSummary(sellerId: string | null) {
  if (!sellerId) {
    return {
      addToCarts: 0,
      conversionRate: 0,
      conversions: 0,
      daily: [],
      impressions: 0,
      livePosts: 0,
      productOpens: 0,
      publishedProducts: 0,
      topProducts: [],
      topPost: null,
      viewerOpenRate: 0,
      viewerOpens: 0,
    };
  }

  const metricStartDate = new Date();
  metricStartDate.setHours(0, 0, 0, 0);
  metricStartDate.setDate(metricStartDate.getDate() - 29);

  const [posts, publishedProducts, recentMetrics] = await Promise.all([
    prisma.videoPost.findMany({
      include: {
        metrics: true,
        product: {
          select: {
            name: true,
          },
        },
      },
      where: {
        sellerId,
      },
    }),
    prisma.product.count({
      where: {
        publishedAt: {
          not: null,
        },
        sellerId,
        status: "ACTIVE",
      },
    }),
    prisma.videoPostMetricDaily.findMany({
      include: {
        videoPost: {
          select: {
            productId: true,
            sellerId: true,
          },
        },
      },
      orderBy: [{ metricDate: "asc" }],
      where: {
        metricDate: {
          gte: metricStartDate,
        },
        videoPost: {
          sellerId,
        },
      },
    }),
  ]);

  const totals = posts.reduce(
    (summary, post) => {
      const metrics = post.metrics.reduce(
        (metricSummary, metric) => ({
          addToCarts: metricSummary.addToCarts + metric.addToCarts,
          conversions: metricSummary.conversions + metric.conversions,
          impressions: metricSummary.impressions + metric.impressions,
          productOpens: metricSummary.productOpens + metric.productOpens,
          viewerOpens: metricSummary.viewerOpens + metric.opens,
        }),
        {
          addToCarts: 0,
          conversions: 0,
          impressions: 0,
          productOpens: 0,
          viewerOpens: 0,
        },
      );

      const postConversionRate =
        metrics.impressions > 0 ? (metrics.conversions / metrics.impressions) * 100 : 0;
      const nextTopPost =
        !summary.topPost || postConversionRate > summary.topPost.conversionRate
          ? {
              caption: post.caption,
              conversionRate: postConversionRate,
              id: post.id,
              impressions: metrics.impressions,
              productName: post.product.name,
            }
          : summary.topPost;

      return {
        addToCarts: summary.addToCarts + metrics.addToCarts,
        conversions: summary.conversions + metrics.conversions,
        impressions: summary.impressions + metrics.impressions,
        livePosts:
          summary.livePosts + (post.status === "PUBLISHED" ? 1 : 0),
        productOpens: summary.productOpens + metrics.productOpens,
        topPost: nextTopPost,
        viewerOpens: summary.viewerOpens + metrics.viewerOpens,
      };
    },
    {
      addToCarts: 0,
      conversions: 0,
      impressions: 0,
      livePosts: 0,
      productOpens: 0,
      topPost: null as SellerDashboardData["analytics"]["topPost"],
      viewerOpens: 0,
    },
  );

  const dailyMetrics = new Map<
    string,
    {
      addToCarts: number;
      conversions: number;
      date: string;
      impressions: number;
      productOpens: number;
      viewerOpens: number;
    }
  >();
  const topProducts = new Map<
    string,
    {
      addToCarts: number;
      conversions: number;
      impressions: number;
      productId: string;
      productName: string;
      viewerOpens: number;
    }
  >();

  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date(metricStartDate);
    date.setDate(metricStartDate.getDate() + index);
    const key = date.toISOString().slice(0, 10);

    dailyMetrics.set(key, {
      addToCarts: 0,
      conversions: 0,
      date: key,
      impressions: 0,
      productOpens: 0,
      viewerOpens: 0,
    });
  }

  for (const metric of recentMetrics) {
    const key = metric.metricDate.toISOString().slice(0, 10);
    const currentDay = dailyMetrics.get(key);

    if (currentDay) {
      currentDay.addToCarts += metric.addToCarts;
      currentDay.conversions += metric.conversions;
      currentDay.impressions += metric.impressions;
      currentDay.productOpens += metric.productOpens;
      currentDay.viewerOpens += metric.opens;
    }
  }

  for (const post of posts) {
    const currentProduct = topProducts.get(post.productId) ?? {
      addToCarts: 0,
      conversions: 0,
      impressions: 0,
      productId: post.productId,
      productName: post.product.name,
      viewerOpens: 0,
    };

    for (const metric of post.metrics) {
      currentProduct.addToCarts += metric.addToCarts;
      currentProduct.conversions += metric.conversions;
      currentProduct.impressions += metric.impressions;
      currentProduct.viewerOpens += metric.opens;
    }

    topProducts.set(post.productId, currentProduct);
  }

  return {
    addToCarts: totals.addToCarts,
    conversionRate:
      totals.impressions > 0 ? (totals.conversions / totals.impressions) * 100 : 0,
    conversions: totals.conversions,
    daily: Array.from(dailyMetrics.values()).sort((left, right) =>
      left.date.localeCompare(right.date),
    ),
    impressions: totals.impressions,
    livePosts: totals.livePosts,
    productOpens: totals.productOpens,
    publishedProducts,
    topProducts: Array.from(topProducts.values())
      .map((product) => ({
        ...product,
        conversionRate:
          product.impressions > 0 ? (product.conversions / product.impressions) * 100 : 0,
      }))
      .sort((left, right) => {
        if (right.conversions !== left.conversions) {
          return right.conversions - left.conversions;
        }

        return right.impressions - left.impressions;
      })
      .slice(0, 5),
    topPost: totals.topPost,
    viewerOpenRate:
      totals.impressions > 0 ? (totals.viewerOpens / totals.impressions) * 100 : 0,
    viewerOpens: totals.viewerOpens,
  };
}

async function readSellerBundles(sellerId: string | null) {
  if (!sellerId) {
    return [];
  }

  const bundles = await prisma.productBundle.findMany({
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    where: {
      sellerId,
    },
  });

  return bundles.map((bundle) => ({
    description: bundle.description ?? "",
    id: bundle.id,
    isActive: bundle.isActive,
    itemCount: bundle.items.reduce((sum, item) => sum + item.quantity, 0),
    items: bundle.items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
    })),
    name: bundle.name,
    slug: bundle.slug,
  }));
}

async function readSellerCampaigns(sellerId: string | null) {
  if (!sellerId) {
    return [];
  }

  const campaigns = await prisma.campaign.findMany({
    include: {
      slots: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          videoPost: {
            select: {
              caption: true,
              id: true,
            },
          },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    where: {
      sellerId,
    },
  });

  return campaigns.map((campaign) => {
    const primarySlot = campaign.slots[0] ?? null;

    return {
      boostScore: primarySlot?.boostScore ?? 0,
      description: campaign.description ?? "",
      endsAt: serializeDate(campaign.endsAt),
      id: campaign.id,
      productId: primarySlot?.product?.id ?? null,
      productName: primarySlot?.product?.name ?? null,
      slotType: primarySlot?.slotType ?? null,
      startsAt: serializeDate(campaign.startsAt),
      status: campaign.status,
      title: campaign.title,
      videoPostCaption: primarySlot?.videoPost?.caption ?? null,
      videoPostId: primarySlot?.videoPost?.id ?? null,
    };
  });
}

async function recordAuditLog(
  tx: Prisma.TransactionClient,
  input: {
    action: string;
    actorUserId?: string | null;
    afterData?: Prisma.InputJsonValue | null;
    beforeData?: Prisma.InputJsonValue | null;
    entityId: string;
    entityType: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      afterData: input.afterData ?? Prisma.JsonNull,
      beforeData: input.beforeData ?? Prisma.JsonNull,
      entityId: input.entityId,
      entityType: input.entityType,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

async function getUserWithSeller(
  db: DatabaseClient,
  userId: string,
): Promise<UserWithSeller> {
  const user = await db.user.findUnique({
    include: {
      sellerProfile: {
        include: {
          documents: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new SellerServiceError("NOT_FOUND", "User not found.", 404);
  }

  return user;
}

async function ensureUniqueSellerSlug(
  tx: Prisma.TransactionClient,
  desiredSlug: string,
  sellerId?: string,
): Promise<string> {
  let attempt = 0;
  let candidate = desiredSlug;

  while (true) {
    const conflict = await tx.seller.findFirst({
      where: {
        ...(sellerId ? { id: { not: sellerId } } : {}),
        slug: candidate,
      },
    });

    if (!conflict) {
      return candidate;
    }

    attempt += 1;
    candidate = `${desiredSlug}-${attempt}`;
  }
}

function sellerSnapshot(seller: SellerWithDocuments | null) {
  if (!seller) {
    return null;
  }

  return {
    businessDescription: seller.businessDescription,
    defaultCurrency: seller.defaultCurrency,
    displayName: seller.displayName,
    documents: seller.documents.map((document) => ({
      id: document.id,
      type: document.type,
      uploadedAt: serializeDate(document.uploadedAt),
    })),
    kycStatus: seller.kycStatus,
    legalName: seller.legalName,
    payoutAccountName: seller.payoutAccountName,
    payoutBankName: seller.payoutBankName,
    slug: seller.slug,
    supportEmail: seller.supportEmail,
    supportPhone: seller.supportPhone,
  };
}

function resolveSellerStatus(
  currentStatus: KycStatus | null,
  submitForReview: boolean,
): KycStatus {
  if (!submitForReview) {
    return currentStatus ?? KycStatus.PENDING;
  }

  if (currentStatus === KycStatus.APPROVED) {
    return KycStatus.APPROVED;
  }

  return KycStatus.SUBMITTED;
}

async function ensureSellerForUser(
  tx: Prisma.TransactionClient,
  user: UserWithSeller,
) {
  if (user.sellerProfile) {
    return user.sellerProfile;
  }

  const baseSlug = sanitizeSlug(undefined, user.fullName);
  const slug = await ensureUniqueSellerSlug(tx, baseSlug);

  return tx.seller.create({
    data: {
      displayName: user.fullName,
      slug,
      supportEmail: user.email,
      supportPhone: user.phone,
      userId: user.id,
    },
    include: {
      documents: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

async function getSellerSignupSession(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<SessionUser> {
  const user = await tx.user.findUniqueOrThrow({
    include: {
      roleAssignments: true,
    },
    where: {
      id: userId,
    },
  });
  const roles = user.roleAssignments.map(
    (assignment) => assignment.role as Role,
  );

  return {
    email: user.email,
    id: user.id,
    phone: user.phone,
    primaryRole: getPrimaryRole(roles),
    roles,
  };
}

export async function ensureSellerAccountForUser(
  userId: string,
): Promise<SessionUser> {
  return prisma.$transaction(async (tx) => {
    const user = await getUserWithSeller(tx, userId);
    const existingSeller = user.sellerProfile;
    const existingSellerRole = await tx.userRoleAssignment.findUnique({
      where: {
        userId_role: {
          role: UserRole.SELLER,
          userId: user.id,
        },
      },
    });
    const seller = await ensureSellerForUser(tx, user);

    await tx.userRoleAssignment.upsert({
      create: {
        role: UserRole.SELLER,
        userId: user.id,
      },
      update: {},
      where: {
        userId_role: {
          role: UserRole.SELLER,
          userId: user.id,
        },
      },
    });

    if (!existingSeller || !existingSellerRole) {
      await recordAuditLog(tx, {
        action: "SELLER_SIGNUP_COMPLETED",
        actorUserId: user.id,
        afterData: {
          sellerId: seller.id,
        },
        entityId: seller.id,
        entityType: "Seller",
      });
    }

    return getSellerSignupSession(tx, user.id);
  });
}

export async function getSellerDashboardData(
  userId: string,
): Promise<SellerDashboardData> {
  const user = await getUserWithSeller(prisma, userId);
  const seller = buildDefaultSellerProfile(user);
  const uploadedDocumentCount =
    user.sellerProfile?.documents.filter(
      (document) => document.uploadedAt !== null,
    ).length ?? 0;
  const missingRequirements = getMissingRequirements(
    seller,
    uploadedDocumentCount,
  );
  const [analytics, bundles, campaigns] = await Promise.all([
    readSellerAnalyticsSummary(seller.id),
    readSellerBundles(seller.id),
    readSellerCampaigns(seller.id),
  ]);

  return {
    analytics,
    bundles,
    campaigns,
    canListProducts: canSellerListProducts(user.sellerProfile?.kycStatus),
    documents: mapDocuments(user.sellerProfile?.documents ?? []),
    kycDocumentTypes: readKycDocumentTypes(process.env),
    missingRequirements,
    seller,
    submitDisabled:
      missingRequirements.length > 0 ||
      user.sellerProfile?.kycStatus === KycStatus.APPROVED,
    user: {
      email: user.email,
      fullName: user.fullName,
      id: user.id,
      phone: user.phone,
    },
  };
}

export async function createSellerBundle(input: {
  description?: string;
  name?: string;
  productIds?: string[];
  userId: string;
}) {
  const user = await getUserWithSeller(prisma, input.userId);
  const seller = user.sellerProfile;

  if (!seller) {
    throw new SellerServiceError("NOT_FOUND", "Seller profile not found.", 404);
  }

  const normalizedName = input.name?.trim() ?? "";

  if (!normalizedName) {
    throw new SellerServiceError("VALIDATION_ERROR", "Bundle name is required.", 400);
  }

  const productIds = [...new Set((input.productIds ?? []).map((value) => value.trim()).filter(Boolean))];

  if (productIds.length < 2) {
    throw new SellerServiceError(
      "VALIDATION_ERROR",
      "Select at least two seller products for a bundle.",
      400,
    );
  }

  const sellerProducts = await prisma.product.findMany({
    select: {
      id: true,
    },
    where: {
      id: {
        in: productIds,
      },
      sellerId: seller.id,
      status: "ACTIVE",
    },
  });

  if (sellerProducts.length !== productIds.length) {
    throw new SellerServiceError(
      "VALIDATION_ERROR",
      "Bundles can only include active products from the current seller.",
      400,
    );
  }

  const slugBase = sanitizeBundleSlug(undefined, normalizedName);
  let nextSlug = slugBase;
  let suffix = 1;

  for (;;) {
    const existing = await prisma.productBundle.findUnique({
      where: {
        sellerId_slug: {
          sellerId: seller.id,
          slug: nextSlug,
        },
      },
    });

    if (!existing) {
      break;
    }

    suffix += 1;
    nextSlug = `${slugBase}-${suffix}`.slice(0, 48);
  }

  const bundle = await prisma.productBundle.create({
    data: {
      description: input.description?.trim() || null,
      items: {
        create: productIds.map((productId, index) => ({
          position: index,
          productId,
          quantity: 1,
        })),
      },
      name: normalizedName,
      sellerId: seller.id,
      slug: nextSlug,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  return {
    description: bundle.description ?? "",
    id: bundle.id,
    isActive: bundle.isActive,
    itemCount: bundle.items.reduce((sum, item) => sum + item.quantity, 0),
    items: bundle.items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
    })),
    name: bundle.name,
    slug: bundle.slug,
  };
}

export async function createSellerCampaign(input: {
  boostScore?: number | null;
  description?: string;
  endsAt?: string | null;
  productId?: string | null;
  slotType?: CampaignSlotType | null;
  startsAt?: string | null;
  title?: string;
  userId: string;
  videoPostId?: string | null;
}) {
  const user = await getUserWithSeller(prisma, input.userId);
  const seller = user.sellerProfile;

  if (!seller) {
    throw new SellerServiceError("NOT_FOUND", "Seller profile not found.", 404);
  }

  const title = input.title?.trim() ?? "";

  if (!title) {
    throw new SellerServiceError("VALIDATION_ERROR", "Campaign title is required.", 400);
  }

  if (!input.videoPostId && !input.productId) {
    throw new SellerServiceError(
      "VALIDATION_ERROR",
      "Campaigns need a video post or product target.",
      400
    );
  }

  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;

  if (startsAt && Number.isNaN(startsAt.getTime())) {
    throw new SellerServiceError("VALIDATION_ERROR", "Campaign start date is invalid.", 400);
  }

  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new SellerServiceError("VALIDATION_ERROR", "Campaign end date is invalid.", 400);
  }

  if (startsAt && endsAt && endsAt < startsAt) {
    throw new SellerServiceError(
      "VALIDATION_ERROR",
      "Campaign end date must be after the start date.",
      400
    );
  }

  const [product, videoPost] = await Promise.all([
    input.productId
      ? prisma.product.findFirst({
          select: {
            id: true,
            name: true,
            slug: true,
          },
          where: {
            id: input.productId,
            sellerId: seller.id,
          },
        })
      : Promise.resolve(null),
    input.videoPostId
      ? prisma.videoPost.findFirst({
          select: {
            caption: true,
            id: true,
          },
          where: {
            id: input.videoPostId,
            sellerId: seller.id,
          },
        })
      : Promise.resolve(null),
  ]);

  if (input.productId && !product) {
    throw new SellerServiceError("VALIDATION_ERROR", "Campaign product is invalid.", 400);
  }

  if (input.videoPostId && !videoPost) {
    throw new SellerServiceError("VALIDATION_ERROR", "Campaign video post is invalid.", 400);
  }

  const slugBase = sanitizeBundleSlug(undefined, title);
  let nextSlug = slugBase;
  let suffix = 1;

  for (;;) {
    const existing = await prisma.campaign.findUnique({
      where: {
        sellerId_slug: {
          sellerId: seller.id,
          slug: nextSlug,
        },
      },
    });

    if (!existing) {
      break;
    }

    suffix += 1;
    nextSlug = `${slugBase}-${suffix}`.slice(0, 48);
  }

  const now = new Date();
  const status =
    startsAt && startsAt > now ? CampaignStatus.SCHEDULED : CampaignStatus.LIVE;
  const slotType = input.slotType ?? CampaignSlotType.FEATURED_DROP;
  const boostScore = typeof input.boostScore === "number" ? Math.max(0, input.boostScore) : 0;

  const campaign = await prisma.campaign.create({
    data: {
      description: input.description?.trim() || null,
      endsAt,
      sellerId: seller.id,
      slug: nextSlug,
      slots: {
        create: {
          boostScore,
          position: 0,
          productId: product?.id ?? null,
          slotType,
          startsAt,
          endsAt,
          videoPostId: videoPost?.id ?? null,
        },
      },
      startsAt,
      status,
      title,
    },
    include: {
      slots: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          videoPost: {
            select: {
              caption: true,
              id: true,
            },
          },
        },
      },
    },
  });

  if (status === CampaignStatus.LIVE) {
    const followers = await prisma.followedSeller.findMany({
      select: {
        buyerId: true,
      },
      where: {
        sellerId: seller.id,
      },
    });

    await Promise.all(
      followers.map((follower) =>
        createUserNotification({
          actionUrl: videoPost
            ? `/posts/${videoPost.id}`
            : product
              ? `/products/${product.slug}`
              : null,
          body: `${seller.displayName} launched ${title}.`,
          kind: "CAMPAIGN_DROP",
          metadata: {
            campaignId: campaign.id,
            productId: product?.id ?? null,
            videoPostId: videoPost?.id ?? null,
          },
          sellerId: seller.id,
          title: "New featured drop",
          userId: follower.buyerId,
        })
      )
    );
  }

  return {
    boostScore,
    description: campaign.description ?? "",
    endsAt: serializeDate(campaign.endsAt),
    id: campaign.id,
    productId: product?.id ?? null,
    productName: product?.name ?? null,
    slotType,
    startsAt: serializeDate(campaign.startsAt),
    status: campaign.status,
    title: campaign.title,
    videoPostCaption: videoPost?.caption ?? null,
    videoPostId: videoPost?.id ?? null,
  };
}

export async function saveSellerOnboarding(
  input: SaveSellerOnboardingInput,
): Promise<SellerDashboardData> {
  await prisma.$transaction(async (tx) => {
    const user = await getUserWithSeller(tx, input.userId);
    const seller = user.sellerProfile;
    const currentProfile = buildDefaultSellerProfile(user);
    const nextProfile = {
      businessDescription:
        input.businessDescription?.trim() ?? currentProfile.businessDescription,
      defaultCurrency: parseCurrency(
        input.defaultCurrency,
        currentProfile.defaultCurrency,
      ),
      displayName: input.displayName?.trim() || currentProfile.displayName,
      legalName: input.legalName?.trim() ?? currentProfile.legalName,
      payoutAccountName:
        input.payoutAccountName?.trim() ?? currentProfile.payoutAccountName,
      payoutAccountNumber:
        input.payoutAccountNumber?.trim() ?? currentProfile.payoutAccountNumber,
      payoutBankName:
        input.payoutBankName?.trim() ?? currentProfile.payoutBankName,
      payoutRoutingNumber:
        input.payoutRoutingNumber?.trim() ?? currentProfile.payoutRoutingNumber,
      slug: sanitizeSlug(input.slug, currentProfile.slug || user.fullName),
      supportEmail: input.supportEmail?.trim() ?? currentProfile.supportEmail,
      supportPhone: input.supportPhone?.trim() ?? currentProfile.supportPhone,
    };
    const nextSlug = await ensureUniqueSellerSlug(
      tx,
      nextProfile.slug,
      seller?.id,
    );
    const uploadedDocumentCount =
      seller?.documents.filter((document) => document.uploadedAt !== null)
        .length ?? 0;
    const missingRequirements = getMissingRequirements(
      {
        ...currentProfile,
        ...nextProfile,
        slug: nextSlug,
      },
      uploadedDocumentCount,
    );

    if (input.submitForReview && missingRequirements.length > 0) {
      throw new SellerServiceError(
        "SELLER_ONBOARDING_INCOMPLETE",
        `Seller onboarding is incomplete: ${missingRequirements.join(", ")}.`,
        400,
      );
    }

    const nextStatus = resolveSellerStatus(
      seller?.kycStatus ?? null,
      Boolean(input.submitForReview),
    );
    const nextSeller = await tx.seller.upsert({
      create: {
        businessDescription: nextProfile.businessDescription || null,
        defaultCurrency: nextProfile.defaultCurrency,
        displayName: nextProfile.displayName,
        kycStatus: nextStatus,
        legalName: nextProfile.legalName || null,
        payoutAccountName: nextProfile.payoutAccountName || null,
        payoutAccountNumber: nextProfile.payoutAccountNumber || null,
        payoutBankName: nextProfile.payoutBankName || null,
        payoutRoutingNumber: nextProfile.payoutRoutingNumber || null,
        slug: nextSlug,
        supportEmail: nextProfile.supportEmail || null,
        supportPhone: nextProfile.supportPhone || null,
        userId: user.id,
        ...(input.submitForReview
          ? {
              kycRejectedAt: null,
              kycSubmittedAt: new Date(),
            }
          : {}),
      },
      update: {
        businessDescription: nextProfile.businessDescription || null,
        defaultCurrency: nextProfile.defaultCurrency,
        displayName: nextProfile.displayName,
        kycStatus: nextStatus,
        legalName: nextProfile.legalName || null,
        payoutAccountName: nextProfile.payoutAccountName || null,
        payoutAccountNumber: nextProfile.payoutAccountNumber || null,
        payoutBankName: nextProfile.payoutBankName || null,
        payoutRoutingNumber: nextProfile.payoutRoutingNumber || null,
        slug: nextSlug,
        supportEmail: nextProfile.supportEmail || null,
        supportPhone: nextProfile.supportPhone || null,
        ...(input.submitForReview
          ? {
              kycRejectedAt: null,
              kycSubmittedAt: new Date(),
            }
          : {}),
      },
      where: {
        userId: user.id,
      },
    });

    await recordAuditLog(tx, {
      action: input.submitForReview
        ? "SELLER_ONBOARDING_SUBMITTED"
        : "SELLER_ONBOARDING_UPDATED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        ...nextProfile,
        kycStatus: nextStatus,
        sellerId: nextSeller.id,
        slug: nextSlug,
      },
      beforeData: sellerSnapshot(seller),
      entityId: nextSeller.id,
      entityType: "Seller",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  });

  return getSellerDashboardData(input.userId);
}

function buildDocumentKey(
  sellerId: string,
  documentType: string,
  fileName: string,
) {
  const extensionMatch = /\.[a-z0-9]+$/i.exec(fileName);
  const extension = extensionMatch ? extensionMatch[0].toLowerCase() : "";
  const normalizedType = sanitizeSlug(documentType, "document");

  return `sellers/${sellerId}/kyc/${normalizedType}-${crypto.randomUUID()}${extension}`;
}

export async function requestSellerDocumentUpload(input: {
  actorUserId?: string;
  contentType?: string;
  documentType?: string;
  fileName?: string;
  ipAddress?: string | null;
  sizeBytes?: number;
  userAgent?: string | null;
  userId: string;
}): Promise<SellerUploadRequest> {
  if (!input.documentType?.trim()) {
    throw new SellerServiceError(
      "BAD_REQUEST",
      "Document type is required.",
      400,
    );
  }

  if (!input.fileName?.trim() || !input.contentType?.trim()) {
    throw new SellerServiceError(
      "BAD_REQUEST",
      "File name and content type are required.",
      400,
    );
  }

  const documentType = input.documentType.trim().toUpperCase();
  const fileName = input.fileName.trim();
  const contentType = input.contentType.trim();

  return prisma.$transaction(async (tx) => {
    const user = await getUserWithSeller(tx, input.userId);
    const seller = await ensureSellerForUser(tx, user);
    const s3Key = buildDocumentKey(seller.id, documentType, fileName);
    const uploadUrl = await createSignedUploadUrl({
      contentType,
      key: s3Key,
    });
    const document = await tx.sellerDocument.create({
      data: {
        contentType,
        fileName,
        s3Key,
        sellerId: seller.id,
        sizeBytes: input.sizeBytes ?? null,
        type: documentType,
      },
    });

    await recordAuditLog(tx, {
      action: "SELLER_DOCUMENT_UPLOAD_REQUESTED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        documentId: document.id,
        fileName: document.fileName,
        sellerId: seller.id,
        type: document.type,
      },
      entityId: document.id,
      entityType: "SellerDocument",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      documentId: document.id,
      expiresInSeconds: getSignedUrlTtlSeconds(),
      s3Key,
      uploadUrl,
    };
  });
}

export async function markSellerDocumentUploaded(input: {
  actorUserId?: string;
  documentId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.sellerDocument.findFirst({
      include: {
        seller: true,
      },
      where: {
        id: input.documentId,
        seller: {
          userId: input.userId,
        },
      },
    });

    if (!document) {
      throw new SellerServiceError(
        "NOT_FOUND",
        "Seller document not found.",
        404,
      );
    }

    const updatedDocument = await tx.sellerDocument.update({
      data: {
        uploadedAt: new Date(),
      },
      where: {
        id: document.id,
      },
    });

    await recordAuditLog(tx, {
      action: "SELLER_DOCUMENT_UPLOADED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        documentId: updatedDocument.id,
        sellerId: document.sellerId,
        uploadedAt: updatedDocument.uploadedAt?.toISOString() ?? null,
      },
      entityId: updatedDocument.id,
      entityType: "SellerDocument",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      documentId: updatedDocument.id,
      uploadedAt: serializeDate(updatedDocument.uploadedAt),
    };
  });
}

export async function listSellerApprovalQueue(): Promise<
  SellerApprovalQueueEntry[]
> {
  const sellers = await prisma.seller.findMany({
    include: {
      documents: {
        orderBy: {
          createdAt: "desc",
        },
      },
      user: true,
    },
    orderBy: [
      {
        kycSubmittedAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    where: {
      kycStatus: {
        in: [KycStatus.SUBMITTED, KycStatus.REJECTED],
      },
    },
  });

  return Promise.all(
    sellers.map(async (seller) => ({
      createdAt: seller.createdAt.toISOString(),
      displayName: seller.displayName,
      documents: await Promise.all(
        seller.documents.map(async (document) => {
          let accessUrl: string | null = null;

          try {
            accessUrl = await createSignedDownloadUrl(document.s3Key);
          } catch {
            accessUrl = null;
          }

          return {
            accessUrl,
            fileName: document.fileName,
            id: document.id,
            s3Key: document.s3Key,
            type: document.type,
            uploadedAt: serializeDate(document.uploadedAt),
          };
        }),
      ),
      id: seller.id,
      kycNotes: seller.kycNotes ?? "",
      kycStatus: seller.kycStatus,
      kycSubmittedAt: serializeDate(seller.kycSubmittedAt),
      legalName: seller.legalName ?? "",
      payoutAccountName: seller.payoutAccountName ?? "",
      payoutBankName: seller.payoutBankName ?? "",
      slug: seller.slug,
      supportEmail: seller.supportEmail ?? "",
      supportPhone: seller.supportPhone ?? "",
      updatedAt: seller.updatedAt.toISOString(),
      user: {
        email: seller.user.email,
        fullName: seller.user.fullName,
        id: seller.user.id,
        phone: seller.user.phone,
      },
    })),
  );
}

export async function listRecentSellerAuditActivity(
  limit = 12,
): Promise<RecentAuditEntry[]> {
  const entries = await prisma.auditLog.findMany({
    include: {
      actorUser: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    where: {
      entityType: {
        in: ["Seller", "SellerDocument", "Product"],
      },
    },
  });

  return entries.map((entry) => ({
    action: entry.action,
    actorName: entry.actorUser?.fullName ?? null,
    createdAt: entry.createdAt.toISOString(),
    entityId: entry.entityId,
    entityType: entry.entityType,
    id: entry.id,
  }));
}

export async function decideSellerApproval(input: {
  actorUserId: string;
  decision: "APPROVE" | "REJECT";
  ipAddress?: string | null;
  note?: string;
  sellerId: string;
  userAgent?: string | null;
}) {
  if (input.decision === "REJECT" && !input.note?.trim()) {
    throw new SellerServiceError(
      "BAD_REQUEST",
      "A rejection note is required.",
      400,
    );
  }

  return prisma.$transaction(async (tx) => {
    const seller = await tx.seller.findUnique({
      include: {
        documents: true,
      },
      where: {
        id: input.sellerId,
      },
    });

    if (!seller) {
      throw new SellerServiceError("NOT_FOUND", "Seller not found.", 404);
    }

    if (input.decision === "APPROVE") {
      const missingRequirements = getMissingRequirements(
        {
          businessDescription: seller.businessDescription ?? "",
          defaultCurrency: seller.defaultCurrency,
          displayName: seller.displayName,
          id: seller.id,
          kycApprovedAt: serializeDate(seller.kycApprovedAt),
          kycNotes: seller.kycNotes ?? "",
          kycRejectedAt: serializeDate(seller.kycRejectedAt),
          kycStatus: seller.kycStatus,
          kycSubmittedAt: serializeDate(seller.kycSubmittedAt),
          legalName: seller.legalName ?? "",
          payoutAccountName: seller.payoutAccountName ?? "",
          payoutAccountNumber: seller.payoutAccountNumber ?? "",
          payoutBankName: seller.payoutBankName ?? "",
          payoutRoutingNumber: seller.payoutRoutingNumber ?? "",
          slug: seller.slug,
          supportEmail: seller.supportEmail ?? "",
          supportPhone: seller.supportPhone ?? "",
        },
        seller.documents.filter((document) => document.uploadedAt !== null)
          .length,
      );

      if (missingRequirements.length > 0) {
        throw new SellerServiceError(
          "SELLER_ONBOARDING_INCOMPLETE",
          `Seller is not ready for approval: ${missingRequirements.join(", ")}.`,
          400,
        );
      }
    }

    const beforeData = sellerSnapshot({
      ...seller,
      documents: seller.documents,
    });

    const updatedSeller = await tx.seller.update({
      data:
        input.decision === "APPROVE"
          ? {
              kycApprovedAt: new Date(),
              kycNotes: input.note?.trim() || seller.kycNotes,
              kycRejectedAt: null,
              kycStatus: KycStatus.APPROVED,
            }
          : {
              kycApprovedAt: null,
              kycNotes: input.note?.trim() || null,
              kycRejectedAt: new Date(),
              kycStatus: KycStatus.REJECTED,
            },
      where: {
        id: seller.id,
      },
    });

    await recordAuditLog(tx, {
      action:
        input.decision === "APPROVE" ? "SELLER_APPROVED" : "SELLER_REJECTED",
      actorUserId: input.actorUserId,
      afterData: {
        kycNotes: updatedSeller.kycNotes,
        kycStatus: updatedSeller.kycStatus,
        sellerId: updatedSeller.id,
      },
      beforeData,
      entityId: updatedSeller.id,
      entityType: "Seller",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      id: updatedSeller.id,
      kycStatus: updatedSeller.kycStatus,
    };
  });
}
