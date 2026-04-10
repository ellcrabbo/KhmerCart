import {
  canSellerListProducts,
  getPrimaryRole,
  readKycDocumentTypes,
  type Role,
  type SessionUser,
} from "@khmercart/core";
import {
  Currency,
  KycStatus,
  Prisma,
  type PrismaClient,
  type Seller,
  type SellerDocument,
  type User,
  UserRole,
} from "./prisma-client";
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

  return {
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
