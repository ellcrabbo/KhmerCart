import {
  canSellerListProducts,
  parseProductStatus,
  sanitizeCatalogSlug,
  validateCatalogPayload,
  type CatalogImageInput,
  type CatalogVariantInput
} from "@khmercart/core";
import {
  Currency,
  Prisma,
  ProductModerationStatus,
  ProductStatus,
} from "./prisma-client";
import { prisma } from "./prisma";
import { SellerServiceError } from "./seller";

const catalogProductInclude = {
  images: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }]
  },
  variants: {
    include: {
      inventory: true
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }]
  }
} satisfies Prisma.ProductInclude;

type CatalogProductRecord = Prisma.ProductGetPayload<{
  include: typeof catalogProductInclude;
}>;

export type SellerCatalogValidationIssue = {
  field: string;
  message: string;
};

export type SellerCatalogVariant = {
  attributes: Record<string, string> | null;
  compareAtPriceMinor: number | null;
  createdAt: string;
  currency: Currency | null;
  id: string;
  inventory: {
    availableQuantity: number;
    onHandQuantity: number;
    reorderPoint: number | null;
    reservedQuantity: number;
    updatedAt: string;
  } | null;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  position: number;
  priceMinor: number | null;
  sku: string;
  updatedAt: string;
  weightGrams: number | null;
};

export type SellerCatalogImage = {
  altText: string;
  id: string;
  isPrimary: boolean;
  position: number;
  url: string;
};

export type SellerCatalogProduct = {
  category: string;
  createdAt: string;
  description: string;
  id: string;
  images: SellerCatalogImage[];
  moderationNotes: string;
  moderationStatus: ProductModerationStatus;
  name: string;
  publishedAt: string | null;
  returnPolicy: string;
  sellerAddress: string;
  sellerContact: string;
  slug: string;
  status: ProductStatus;
  updatedAt: string;
  validationIssues: SellerCatalogValidationIssue[];
  variants: SellerCatalogVariant[];
};

export type SellerCatalogData = {
  products: SellerCatalogProduct[];
  sellerCanActivateProducts: boolean;
  sellerId: string | null;
};

type ProductMutationInput = {
  actorUserId?: string;
  category?: string;
  description?: string;
  images?: CatalogImageInput[];
  ipAddress?: string | null;
  moderationNotes?: string;
  name?: string;
  returnPolicy?: string;
  sellerAddress?: string;
  sellerContact?: string;
  slug?: string;
  status?: string;
  userAgent?: string | null;
  userId: string;
};

type CreateSellerProductInput = ProductMutationInput & {
  variants?: CatalogVariantInput[];
};

type UpdateSellerProductInput = ProductMutationInput & {
  productId: string;
};

type CreateSellerProductVariantInput = {
  actorUserId?: string;
  attributes?: Record<string, string>;
  compareAtPriceMinor?: number;
  currency?: string;
  inventoryQuantity?: number;
  ipAddress?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  name?: string;
  position?: number;
  priceMinor?: number;
  productId: string;
  reorderPoint?: number;
  sku?: string;
  userAgent?: string | null;
  userId: string;
  weightGrams?: number;
};

type UpdateSellerProductVariantInput = {
  actorUserId?: string;
  attributes?: Record<string, string>;
  compareAtPriceMinor?: number | null;
  currency?: string | null;
  ipAddress?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  name?: string;
  position?: number;
  priceMinor?: number | null;
  reorderPoint?: number | null;
  sku?: string;
  userAgent?: string | null;
  userId: string;
  variantId: string;
  weightGrams?: number | null;
};

export type UpdateVariantInventoryInput = {
  actorUserId?: string;
  ipAddress?: string | null;
  onHandQuantity: number;
  userAgent?: string | null;
  userId: string;
  variantId: string;
};

export type AdjustVariantInventoryInput = {
  actorUserId?: string;
  delta: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId: string;
  variantId: string;
};

export type CreateProductListingInput = {
  actorUserId?: string;
  currency?: string;
  description?: string;
  inventoryQuantity?: number;
  ipAddress?: string | null;
  name?: string;
  priceMinor?: number;
  returnPolicy?: string;
  sku?: string;
  slug?: string;
  userAgent?: string | null;
  userId: string;
};

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
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
  }
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
      userAgent: input.userAgent ?? null
    }
  });
}

function parseCurrency(value: string | null | undefined, fallback: Currency | null): Currency | null {
  if (value === Currency.KHR) {
    return Currency.KHR;
  }

  if (value === Currency.USD) {
    return Currency.USD;
  }

  return fallback;
}

function sanitizeSellerSlug(input: string | null | undefined, fallback: string): string {
  return sanitizeCatalogSlug(input, fallback).slice(0, 48) || "seller";
}

async function ensureUniqueSellerSlug(
  tx: Prisma.TransactionClient,
  desiredSlug: string,
  sellerId?: string
): Promise<string> {
  let attempt = 0;
  let candidate = desiredSlug;

  while (true) {
    const conflict = await tx.seller.findFirst({
      where: {
        ...(sellerId ? { id: { not: sellerId } } : {}),
        slug: candidate
      }
    });

    if (!conflict) {
      return candidate;
    }

    attempt += 1;
    candidate = `${desiredSlug}-${attempt}`;
  }
}

async function ensureUniqueProductSlug(
  tx: Prisma.TransactionClient,
  sellerId: string,
  desiredSlug: string,
  productId?: string
): Promise<string> {
  let attempt = 0;
  let candidate = desiredSlug;

  while (true) {
    const conflict = await tx.product.findFirst({
      where: {
        ...(productId ? { id: { not: productId } } : {}),
        sellerId,
        slug: candidate
      }
    });

    if (!conflict) {
      return candidate;
    }

    attempt += 1;
    candidate = `${desiredSlug}-${attempt}`;
  }
}

async function ensureUniqueVariantSku(
  tx: Prisma.TransactionClient,
  sku: string,
  variantId?: string
) {
  const conflict = await tx.productVariant.findFirst({
    where: {
      ...(variantId ? { id: { not: variantId } } : {}),
      sku
    }
  });

  if (conflict) {
    throw new SellerServiceError("SKU_TAKEN", `SKU ${sku} is already in use.`, 409);
  }
}

async function ensureSellerForUser(tx: Prisma.TransactionClient, userId: string) {
  const existingSeller = await tx.seller.findFirst({
    where: {
      userId
    }
  });

  if (existingSeller) {
    return existingSeller;
  }

  const user = await tx.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    throw new SellerServiceError("NOT_FOUND", "User not found.", 404);
  }

  const slug = await ensureUniqueSellerSlug(tx, sanitizeSellerSlug(user.fullName, user.fullName));

  return tx.seller.create({
    data: {
      displayName: user.fullName,
      slug,
      supportEmail: user.email,
      supportPhone: user.phone,
      userId: user.id
    }
  });
}

async function getOwnedProduct(
  tx: Prisma.TransactionClient,
  sellerId: string,
  productId: string
): Promise<CatalogProductRecord> {
  const product = await tx.product.findFirst({
    include: catalogProductInclude,
    where: {
      id: productId,
      sellerId
    }
  });

  if (!product) {
    throw new SellerServiceError("NOT_FOUND", "Product not found.", 404);
  }

  return product;
}

async function getOwnedVariant(
  tx: Prisma.TransactionClient,
  sellerId: string,
  variantId: string
) {
  const variant = await tx.productVariant.findFirst({
    include: {
      inventory: true,
      product: {
        include: catalogProductInclude
      }
    },
    where: {
      id: variantId,
      product: {
        sellerId
      }
    }
  });

  if (!variant) {
    throw new SellerServiceError("NOT_FOUND", "Variant not found.", 404);
  }

  return variant;
}

function normalizeImageInputs(images: CatalogImageInput[] | undefined): Prisma.ProductImageCreateManyProductInput[] {
  const normalized = (images ?? [])
    .map((image, index) => ({
      altText: image.altText?.trim() || null,
      isPrimary: Boolean(image.isPrimary),
      position: index,
      url: image.url?.trim() || ""
    }))
    .filter((image) => image.url.length > 0);

  if (normalized.length === 0) {
    return [];
  }

  const primaryIndex = normalized.findIndex((image) => image.isPrimary);
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

  return normalized.map((image, index) => ({
    ...image,
    isPrimary: index === resolvedPrimaryIndex
  }));
}

function normalizeAttributes(
  attributes: Record<string, string> | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (!attributes) {
    return Prisma.JsonNull;
  }

  const normalized = Object.entries(attributes).reduce<Record<string, string>>((result, [key, value]) => {
    const normalizedKey = key.trim();
    const normalizedValue = `${value}`.trim();

    if (normalizedKey && normalizedValue) {
      result[normalizedKey] = normalizedValue;
    }

    return result;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : Prisma.JsonNull;
}

function normalizeVariantInput(
  variant: CatalogVariantInput,
  index: number,
  fallbackCurrency: Currency | null
) {
  return {
    attributes: normalizeAttributes(variant.attributes ?? null),
    compareAtPriceMinor:
      Number.isInteger(variant.compareAtPriceMinor) && (variant.compareAtPriceMinor ?? 0) > 0
        ? variant.compareAtPriceMinor!
        : null,
    currency: parseCurrency(variant.currency, fallbackCurrency),
    id: variant.id?.trim() || null,
    inventoryQuantity:
      Number.isInteger(variant.inventoryQuantity) && (variant.inventoryQuantity ?? 0) >= 0
        ? variant.inventoryQuantity!
        : 0,
    isActive: variant.isActive !== false,
    isDefault: Boolean(variant.isDefault),
    name: variant.name?.trim() || "",
    position: Number.isInteger(variant.position) && (variant.position ?? 0) >= 0 ? variant.position! : index,
    priceMinor:
      Number.isInteger(variant.priceMinor) && (variant.priceMinor ?? 0) > 0 ? variant.priceMinor! : null,
    reorderPoint:
      Number.isInteger((variant as { reorderPoint?: number }).reorderPoint) &&
      ((variant as { reorderPoint?: number }).reorderPoint ?? 0) >= 0
        ? (variant as { reorderPoint?: number }).reorderPoint!
        : null,
    sku: variant.sku?.trim() || "",
    weightGrams:
      Number.isInteger(variant.weightGrams) && (variant.weightGrams ?? 0) >= 0
        ? variant.weightGrams!
        : null
  };
}

function toCatalogValidationInput(product: CatalogProductRecord) {
  return {
    category: product.category,
    description: product.description,
    images: product.images.map((image) => ({
      altText: image.altText,
      isPrimary: image.isPrimary,
      url: image.url
    })),
    name: product.name,
    returnPolicy: product.returnPolicy,
    sellerAddress: product.sellerAddress,
    sellerContact: product.sellerContact,
    slug: product.slug,
    status: product.status,
    variants: product.variants.map((variant) => ({
      attributes:
        variant.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
          ? Object.fromEntries(
              Object.entries(variant.attributes as Record<string, unknown>).flatMap(([key, value]) =>
                typeof value === "string" ? [[key, value]] : []
              )
            )
          : null,
      compareAtPriceMinor: variant.compareAtPriceMinor,
      currency: variant.currency,
      id: variant.id,
      inventoryQuantity: variant.inventory?.onHandQuantity ?? 0,
      isActive: variant.isActive,
      isDefault: variant.isDefault,
      name: variant.name,
      position: variant.position,
      priceMinor: variant.priceMinor,
      sku: variant.sku,
      weightGrams: variant.weightGrams
    }))
  };
}

function mapCatalogProduct(product: CatalogProductRecord): SellerCatalogProduct {
  const validationIssues = validateCatalogPayload(toCatalogValidationInput(product));

  return {
    category: product.category ?? "",
    createdAt: product.createdAt.toISOString(),
    description: product.description ?? "",
    id: product.id,
    images: product.images.map((image) => ({
      altText: image.altText ?? "",
      id: image.id,
      isPrimary: image.isPrimary,
      position: image.position,
      url: image.url
    })),
    moderationNotes: product.moderationNotes ?? "",
    moderationStatus: product.moderationStatus,
    name: product.name,
    publishedAt: serializeDate(product.publishedAt),
    returnPolicy: product.returnPolicy ?? "",
    sellerAddress: product.sellerAddress ?? "",
    sellerContact: product.sellerContact ?? "",
    slug: product.slug,
    status: product.status,
    updatedAt: product.updatedAt.toISOString(),
    validationIssues,
    variants: product.variants.map((variant) => ({
      attributes:
        variant.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
          ? Object.fromEntries(
              Object.entries(variant.attributes as Record<string, unknown>).flatMap(([key, value]) =>
                typeof value === "string" ? [[key, value]] : []
              )
            )
          : null,
      compareAtPriceMinor: variant.compareAtPriceMinor,
      createdAt: variant.createdAt.toISOString(),
      currency: variant.currency,
      id: variant.id,
      inventory: variant.inventory
        ? {
            availableQuantity: variant.inventory.availableQuantity,
            onHandQuantity: variant.inventory.onHandQuantity,
            reorderPoint: variant.inventory.reorderPoint ?? null,
            reservedQuantity: variant.inventory.reservedQuantity,
            updatedAt: variant.inventory.updatedAt.toISOString()
          }
        : null,
      isActive: variant.isActive,
      isDefault: variant.isDefault,
      name: variant.name,
      position: variant.position,
      priceMinor: variant.priceMinor,
      sku: variant.sku,
      updatedAt: variant.updatedAt.toISOString(),
      weightGrams: variant.weightGrams ?? null
    }))
  };
}

function buildValidationError(issues: SellerCatalogValidationIssue[]): SellerServiceError {
  const message = issues.map((issue) => issue.message).join(" ");

  return new SellerServiceError("PRODUCT_VALIDATION_FAILED", message, 400);
}

async function validateProductState(
  tx: Prisma.TransactionClient,
  productId: string
): Promise<CatalogProductRecord> {
  const product = await tx.product.findUniqueOrThrow({
    include: catalogProductInclude,
    where: {
      id: productId
    }
  });

  const issues = validateCatalogPayload(toCatalogValidationInput(product));

  if (issues.length > 0) {
    throw buildValidationError(issues);
  }

  return product;
}

export async function getSellerCatalogData(userId: string): Promise<SellerCatalogData> {
  const seller = await prisma.seller.findFirst({
    where: {
      userId
    }
  });

  if (!seller) {
    return {
      products: [],
      sellerCanActivateProducts: false,
      sellerId: null
    };
  }

  const products = await prisma.product.findMany({
    include: catalogProductInclude,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    where: {
      sellerId: seller.id
    }
  });

  return {
    products: products.map(mapCatalogProduct),
    sellerCanActivateProducts: canSellerListProducts(seller.kycStatus),
    sellerId: seller.id
  };
}

export async function createSellerProduct(input: CreateSellerProductInput): Promise<SellerCatalogProduct> {
  return prisma.$transaction(async (tx) => {
    const seller = await ensureSellerForUser(tx, input.userId);
    const status = parseProductStatus(input.status, "DRAFT");
    const productSlug = await ensureUniqueProductSlug(
      tx,
      seller.id,
      sanitizeCatalogSlug(input.slug, input.name?.trim() || "product")
    );
    const normalizedImages = normalizeImageInputs(input.images);
    const normalizedVariants = (input.variants ?? []).map((variant, index) =>
      normalizeVariantInput(variant, index, null)
    );
    const validationIssues = validateCatalogPayload({
      category: input.category,
      description: input.description,
      images: normalizedImages.map((image) => ({
        altText: image.altText,
        isPrimary: image.isPrimary,
        url: image.url
      })),
      name: input.name,
      returnPolicy: input.returnPolicy,
      sellerAddress: input.sellerAddress,
      sellerContact: input.sellerContact,
      slug: productSlug,
      status,
      variants: normalizedVariants.map((variant) => ({
        attributes:
          variant.attributes !== Prisma.DbNull &&
          variant.attributes !== Prisma.JsonNull &&
          typeof variant.attributes === "object" &&
          !Array.isArray(variant.attributes)
            ? (variant.attributes as Record<string, string>)
            : null,
        compareAtPriceMinor: variant.compareAtPriceMinor,
        currency: variant.currency,
        inventoryQuantity: variant.inventoryQuantity,
        isActive: variant.isActive,
        isDefault: variant.isDefault,
        name: variant.name,
        position: variant.position,
        priceMinor: variant.priceMinor,
        sku: variant.sku,
        weightGrams: variant.weightGrams
      }))
    });

    if (status === "ACTIVE" && !canSellerListProducts(seller.kycStatus)) {
      throw new SellerServiceError(
        "SELLER_NOT_APPROVED",
        "Seller approval is required before listing products.",
        403
      );
    }

    if (validationIssues.length > 0) {
      throw buildValidationError(validationIssues);
    }

    const seenSkus = new Set<string>();

    for (const variant of normalizedVariants) {
      if (seenSkus.has(variant.sku)) {
        throw new SellerServiceError("SKU_TAKEN", `SKU ${variant.sku} is already in use.`, 409);
      }

      seenSkus.add(variant.sku);
      await ensureUniqueVariantSku(tx, variant.sku);
    }

    const product = await tx.product.create({
      data: {
        category: input.category?.trim() || null,
        defaultCurrency: seller.defaultCurrency,
        description: input.description?.trim() || null,
        images: normalizedImages.length > 0 ? { create: normalizedImages } : undefined,
        moderationNotes: input.moderationNotes?.trim() || null,
        moderationStatus: ProductModerationStatus.PENDING,
        name: input.name?.trim() || "",
        publishedAt: status === "ACTIVE" ? new Date() : null,
        returnPolicy: input.returnPolicy?.trim() || null,
        sellerAddress: input.sellerAddress?.trim() || null,
        sellerContact: input.sellerContact?.trim() || null,
        sellerId: seller.id,
        slug: productSlug,
        status: status as ProductStatus,
        variants:
          normalizedVariants.length > 0
            ? {
                create: normalizedVariants.map((variant, index) => ({
                  attributes: variant.attributes,
                  compareAtPriceMinor: variant.compareAtPriceMinor,
                  currency: variant.currency,
                  inventory: {
                    create: {
                      availableQuantity: variant.inventoryQuantity,
                      onHandQuantity: variant.inventoryQuantity,
                      reorderPoint: variant.reorderPoint,
                      reservedQuantity: 0,
                      sellerId: seller.id
                    }
                  },
                  isActive: variant.isActive,
                  isDefault:
                    normalizedVariants.some((entry) => entry.isDefault) ? variant.isDefault : index === 0,
                  name: variant.name,
                  position: variant.position,
                  priceMinor: variant.priceMinor,
                  sku: variant.sku,
                  weightGrams: variant.weightGrams
                }))
              }
            : undefined
      }
    });

    const hydratedProduct = await validateProductState(tx, product.id);

    await recordAuditLog(tx, {
      action: "SELLER_PRODUCT_CREATED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        productId: hydratedProduct.id,
        sellerId: seller.id,
        slug: hydratedProduct.slug,
        status: hydratedProduct.status
      },
      entityId: hydratedProduct.id,
      entityType: "Product",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return mapCatalogProduct(hydratedProduct);
  });
}

export async function updateSellerProduct(input: UpdateSellerProductInput): Promise<SellerCatalogProduct> {
  return prisma.$transaction(async (tx) => {
    const seller = await ensureSellerForUser(tx, input.userId);
    const existingProduct = await getOwnedProduct(tx, seller.id, input.productId);
    const nextStatus = parseProductStatus(input.status, existingProduct.status);

    if (nextStatus === "ACTIVE" && !canSellerListProducts(seller.kycStatus)) {
      throw new SellerServiceError(
        "SELLER_NOT_APPROVED",
        "Seller approval is required before listing products.",
        403
      );
    }

    const nextSlug = await ensureUniqueProductSlug(
      tx,
      seller.id,
      sanitizeCatalogSlug(input.slug, input.name?.trim() || existingProduct.name),
      existingProduct.id
    );

    await tx.product.update({
      data: {
        category: input.category !== undefined ? input.category?.trim() || null : undefined,
        description: input.description !== undefined ? input.description?.trim() || null : undefined,
        moderationNotes:
          input.moderationNotes !== undefined ? input.moderationNotes?.trim() || null : undefined,
        moderationStatus: nextStatus === "ACTIVE" ? ProductModerationStatus.PENDING : undefined,
        name: input.name !== undefined ? input.name?.trim() || "" : undefined,
        publishedAt:
          nextStatus === "ACTIVE"
            ? existingProduct.publishedAt ?? new Date()
            : nextStatus === "DRAFT"
              ? null
              : existingProduct.publishedAt,
        returnPolicy: input.returnPolicy !== undefined ? input.returnPolicy?.trim() || null : undefined,
        sellerAddress:
          input.sellerAddress !== undefined ? input.sellerAddress?.trim() || null : undefined,
        sellerContact:
          input.sellerContact !== undefined ? input.sellerContact?.trim() || null : undefined,
        slug: nextSlug,
        status: nextStatus as ProductStatus
      },
      where: {
        id: existingProduct.id
      }
    });

    if (input.images !== undefined) {
      const normalizedImages = normalizeImageInputs(input.images);

      await tx.productImage.deleteMany({
        where: {
          productId: existingProduct.id
        }
      });

      if (normalizedImages.length > 0) {
        await tx.productImage.createMany({
          data: normalizedImages.map((image) => ({
            ...image,
            productId: existingProduct.id
          }))
        });
      }
    }

    const hydratedProduct = await validateProductState(tx, existingProduct.id);

    await recordAuditLog(tx, {
      action: "SELLER_PRODUCT_UPDATED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        productId: hydratedProduct.id,
        slug: hydratedProduct.slug,
        status: hydratedProduct.status
      },
      beforeData: {
        slug: existingProduct.slug,
        status: existingProduct.status
      },
      entityId: hydratedProduct.id,
      entityType: "Product",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return mapCatalogProduct(hydratedProduct);
  });
}

export async function archiveSellerProduct(input: {
  actorUserId?: string;
  ipAddress?: string | null;
  productId: string;
  userAgent?: string | null;
  userId: string;
}): Promise<SellerCatalogProduct> {
  return prisma.$transaction(async (tx) => {
    const seller = await ensureSellerForUser(tx, input.userId);
    const product = await getOwnedProduct(tx, seller.id, input.productId);

    await tx.product.update({
      data: {
        status: ProductStatus.ARCHIVED
      },
      where: {
        id: product.id
      }
    });

    const archivedProduct = await tx.product.findUniqueOrThrow({
      include: catalogProductInclude,
      where: {
        id: product.id
      }
    });

    await recordAuditLog(tx, {
      action: "SELLER_PRODUCT_ARCHIVED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        productId: archivedProduct.id,
        status: archivedProduct.status
      },
      entityId: archivedProduct.id,
      entityType: "Product",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return mapCatalogProduct(archivedProduct);
  });
}

export async function createSellerProductVariant(
  input: CreateSellerProductVariantInput
): Promise<SellerCatalogProduct> {
  return prisma.$transaction(async (tx) => {
    const seller = await ensureSellerForUser(tx, input.userId);
    const product = await getOwnedProduct(tx, seller.id, input.productId);
    const normalizedVariant = normalizeVariantInput(input, product.variants.length, null);

    await ensureUniqueVariantSku(tx, normalizedVariant.sku);

    if (product.status === ProductStatus.ACTIVE && !canSellerListProducts(seller.kycStatus)) {
      throw new SellerServiceError(
        "SELLER_NOT_APPROVED",
        "Seller approval is required before listing products.",
        403
      );
    }

    const shouldDefault = product.variants.every((variant) => variant.isDefault === false)
      ? true
      : normalizedVariant.isDefault;

    if (shouldDefault) {
      await tx.productVariant.updateMany({
        data: {
          isDefault: false
        },
        where: {
          productId: product.id
        }
      });
    }

    await tx.productVariant.create({
      data: {
        attributes: normalizedVariant.attributes,
        compareAtPriceMinor: normalizedVariant.compareAtPriceMinor,
        currency: normalizedVariant.currency,
        inventory: {
          create: {
            availableQuantity: normalizedVariant.inventoryQuantity,
            onHandQuantity: normalizedVariant.inventoryQuantity,
            reorderPoint: normalizedVariant.reorderPoint,
            reservedQuantity: 0,
            sellerId: seller.id
          }
        },
        isActive: normalizedVariant.isActive,
        isDefault: shouldDefault,
        name: normalizedVariant.name,
        position: normalizedVariant.position,
        priceMinor: normalizedVariant.priceMinor,
        productId: product.id,
        sku: normalizedVariant.sku,
        weightGrams: normalizedVariant.weightGrams
      }
    });

    const hydratedProduct = await validateProductState(tx, product.id);

    await recordAuditLog(tx, {
      action: "SELLER_VARIANT_CREATED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        productId: hydratedProduct.id,
        sku: normalizedVariant.sku
      },
      entityId: hydratedProduct.id,
      entityType: "Product",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return mapCatalogProduct(hydratedProduct);
  });
}

export async function updateSellerProductVariant(
  input: UpdateSellerProductVariantInput
): Promise<SellerCatalogProduct> {
  return prisma.$transaction(async (tx) => {
    const seller = await ensureSellerForUser(tx, input.userId);
    const variant = await getOwnedVariant(tx, seller.id, input.variantId);
    const fallbackCurrency = variant.currency ?? variant.product.defaultCurrency;
    const nextSku = input.sku?.trim() || variant.sku;

    if (nextSku !== variant.sku) {
      await ensureUniqueVariantSku(tx, nextSku, variant.id);
    }

    if (input.isDefault === true) {
      await tx.productVariant.updateMany({
        data: {
          isDefault: false
        },
        where: {
          productId: variant.productId
        }
      });
    }

    await tx.productVariant.update({
      data: {
        attributes: input.attributes !== undefined ? normalizeAttributes(input.attributes) : undefined,
        compareAtPriceMinor:
          input.compareAtPriceMinor === undefined
            ? undefined
            : Number.isInteger(input.compareAtPriceMinor) && (input.compareAtPriceMinor ?? 0) > 0
              ? input.compareAtPriceMinor
              : null,
        currency:
          input.currency === undefined ? undefined : parseCurrency(input.currency, fallbackCurrency),
        isActive: input.isActive ?? undefined,
        isDefault: input.isDefault ?? undefined,
        name: input.name !== undefined ? input.name.trim() : undefined,
        position:
          input.position !== undefined && Number.isInteger(input.position) && input.position >= 0
            ? input.position
            : undefined,
        priceMinor:
          input.priceMinor === undefined
            ? undefined
            : Number.isInteger(input.priceMinor) && (input.priceMinor ?? 0) > 0
              ? input.priceMinor
              : null,
        sku: nextSku,
        weightGrams:
          input.weightGrams === undefined
            ? undefined
            : Number.isInteger(input.weightGrams) && (input.weightGrams ?? 0) >= 0
              ? input.weightGrams
              : null
      },
      where: {
        id: variant.id
      }
    });

    if (input.reorderPoint !== undefined) {
      await tx.inventory.update({
        data: {
          reorderPoint:
            Number.isInteger(input.reorderPoint) && (input.reorderPoint ?? 0) >= 0
              ? input.reorderPoint
              : null
        },
        where: {
          variantId: variant.id
        }
      });
    }

    const hydratedProduct = await validateProductState(tx, variant.productId);

    await recordAuditLog(tx, {
      action: "SELLER_VARIANT_UPDATED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        productId: hydratedProduct.id,
        variantId: variant.id
      },
      entityId: variant.id,
      entityType: "ProductVariant",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return mapCatalogProduct(hydratedProduct);
  });
}

export async function archiveSellerProductVariant(input: {
  actorUserId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId: string;
  variantId: string;
}): Promise<SellerCatalogProduct> {
  return prisma.$transaction(async (tx) => {
    const seller = await ensureSellerForUser(tx, input.userId);
    const variant = await getOwnedVariant(tx, seller.id, input.variantId);

    await tx.productVariant.update({
      data: {
        isActive: false,
        isDefault: false
      },
      where: {
        id: variant.id
      }
    });

    const fallbackVariant = await tx.productVariant.findFirst({
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      where: {
        id: {
          not: variant.id
        },
        isActive: true,
        productId: variant.productId
      }
    });

    if (fallbackVariant) {
      await tx.productVariant.update({
        data: {
          isDefault: true
        },
        where: {
          id: fallbackVariant.id
        }
      });
    }

    const hydratedProduct = await validateProductState(tx, variant.productId);

    await recordAuditLog(tx, {
      action: "SELLER_VARIANT_ARCHIVED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        productId: hydratedProduct.id,
        variantId: variant.id
      },
      entityId: variant.id,
      entityType: "ProductVariant",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return mapCatalogProduct(hydratedProduct);
  });
}

async function adjustVariantInventoryByDelta(
  tx: Prisma.TransactionClient,
  variantId: string,
  sellerId: string,
  delta: number
) {
  if (!Number.isInteger(delta) || delta === 0) {
    const inventory = await tx.inventory.findUnique({
      where: {
        variantId
      }
    });

    if (!inventory) {
      throw new SellerServiceError("NOT_FOUND", "Inventory record not found.", 404);
    }

    return inventory;
  }

  if (delta > 0) {
    const result = await tx.inventory.updateMany({
      data: {
        availableQuantity: {
          increment: delta
        },
        onHandQuantity: {
          increment: delta
        }
      },
      where: {
        sellerId,
        variantId
      }
    });

    if (result.count !== 1) {
      throw new SellerServiceError("NOT_FOUND", "Inventory record not found.", 404);
    }
  } else {
    const decrement = Math.abs(delta);
    const result = await tx.inventory.updateMany({
      data: {
        availableQuantity: {
          decrement
        },
        onHandQuantity: {
          decrement
        }
      },
      where: {
        availableQuantity: {
          gte: decrement
        },
        sellerId,
        variantId
      }
    });

    if (result.count !== 1) {
      throw new SellerServiceError(
        "INSUFFICIENT_INVENTORY",
        "Inventory cannot go negative.",
        409
      );
    }
  }

  return tx.inventory.findUniqueOrThrow({
    where: {
      variantId
    }
  });
}

export async function updateVariantInventory(
  input: UpdateVariantInventoryInput
): Promise<SellerCatalogProduct> {
  return prisma.$transaction(async (tx) => {
    const seller = await ensureSellerForUser(tx, input.userId);
    const variant = await getOwnedVariant(tx, seller.id, input.variantId);

    if (!Number.isInteger(input.onHandQuantity) || input.onHandQuantity < 0) {
      throw new SellerServiceError(
        "BAD_REQUEST",
        "Inventory quantity must be a non-negative integer.",
        400
      );
    }

    const currentInventory = variant.inventory;

    if (!currentInventory) {
      throw new SellerServiceError("NOT_FOUND", "Inventory record not found.", 404);
    }

    const delta = input.onHandQuantity - currentInventory.onHandQuantity;
    await adjustVariantInventoryByDelta(tx, variant.id, seller.id, delta);
    const hydratedProduct = await validateProductState(tx, variant.productId);

    await recordAuditLog(tx, {
      action: "SELLER_VARIANT_INVENTORY_UPDATED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        onHandQuantity: input.onHandQuantity,
        productId: hydratedProduct.id,
        variantId: variant.id
      },
      entityId: variant.id,
      entityType: "Inventory",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return mapCatalogProduct(hydratedProduct);
  });
}

export async function adjustVariantInventory(
  input: AdjustVariantInventoryInput
): Promise<SellerCatalogProduct> {
  return prisma.$transaction(async (tx) => {
    const seller = await ensureSellerForUser(tx, input.userId);
    const variant = await getOwnedVariant(tx, seller.id, input.variantId);

    if (!Number.isInteger(input.delta) || input.delta === 0) {
      throw new SellerServiceError("BAD_REQUEST", "Inventory delta must be a non-zero integer.", 400);
    }

    await adjustVariantInventoryByDelta(tx, variant.id, seller.id, input.delta);
    const hydratedProduct = await validateProductState(tx, variant.productId);

    await recordAuditLog(tx, {
      action: "SELLER_VARIANT_INVENTORY_ADJUSTED",
      actorUserId: input.actorUserId ?? input.userId,
      afterData: {
        delta: input.delta,
        productId: hydratedProduct.id,
        variantId: variant.id
      },
      entityId: variant.id,
      entityType: "Inventory",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return mapCatalogProduct(hydratedProduct);
  });
}

export async function createSellerProductListing(
  input: CreateProductListingInput
): Promise<{ id: string; name: string; slug: string; status: ProductStatus }> {
  const seller = await prisma.seller.findFirst({
    where: {
      userId: input.userId
    }
  });

  const fallbackContact = seller?.supportEmail ?? seller?.supportPhone ?? "Seller support";
  const product = await createSellerProduct({
    actorUserId: input.actorUserId,
    description: input.description,
    images: [
      {
        altText: input.name ?? "Product image",
        isPrimary: true,
        url: `https://images.khmercart.local/${sanitizeCatalogSlug(input.slug, input.name ?? "product")}.jpg`
      }
    ],
    ipAddress: input.ipAddress,
    name: input.name,
    returnPolicy: input.returnPolicy,
    sellerContact: fallbackContact,
    slug: input.slug,
    status: "ACTIVE",
    userAgent: input.userAgent,
    userId: input.userId,
    variants: [
      {
        currency: input.currency,
        inventoryQuantity: input.inventoryQuantity,
        isActive: true,
        isDefault: true,
        name: `${input.name?.trim() || "Product"} / Default`,
        position: 0,
        priceMinor: input.priceMinor,
        sku: input.sku,
        weightGrams: 0
      }
    ]
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status
  };
}
