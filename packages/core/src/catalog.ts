export const SUPPORTED_CURRENCIES = ["KHR", "USD"] as const;
export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export const PRODUCT_MODERATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export type ProductLifecycleStatus = (typeof PRODUCT_STATUSES)[number];
export type ProductModerationState = (typeof PRODUCT_MODERATION_STATUSES)[number];

export type CatalogImageInput = {
  altText?: string | null;
  isPrimary?: boolean | null;
  url?: string | null;
};

export type CatalogVariantInput = {
  attributes?: Record<string, string> | null;
  compareAtPriceMinor?: number | null;
  currency?: string | null;
  id?: string | null;
  inventoryQuantity?: number | null;
  isActive?: boolean | null;
  isDefault?: boolean | null;
  name?: string | null;
  position?: number | null;
  priceMinor?: number | null;
  sku?: string | null;
  weightGrams?: number | null;
};

export type CatalogProductInput = {
  category?: string | null;
  description?: string | null;
  images?: CatalogImageInput[] | null;
  moderationNotes?: string | null;
  name?: string | null;
  returnPolicy?: string | null;
  sellerAddress?: string | null;
  sellerContact?: string | null;
  slug?: string | null;
  status?: string | null;
  variants?: CatalogVariantInput[] | null;
};

export type CatalogValidationIssue = {
  field: string;
  message: string;
};

export function sanitizeCatalogSlug(input: string | null | undefined, fallback: string): string {
  const source = (input?.trim() || fallback).toLowerCase();
  const normalized = source
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return normalized || "product";
}

export function isSupportedCurrency(value: string | null | undefined): value is SupportedCurrency {
  return value === "KHR" || value === "USD";
}

export function parseProductStatus(
  value: string | null | undefined,
  fallback: ProductLifecycleStatus = "DRAFT"
): ProductLifecycleStatus {
  if (value === "ACTIVE" || value === "ARCHIVED" || value === "DRAFT") {
    return value;
  }

  return fallback;
}

export function parseModerationStatus(
  value: string | null | undefined,
  fallback: ProductModerationState = "PENDING"
): ProductModerationState {
  if (value === "APPROVED" || value === "REJECTED" || value === "PENDING") {
    return value;
  }

  return fallback;
}

function hasPositiveMinorUnitAmount(value: number | null | undefined): boolean {
  return Number.isInteger(value) && (value ?? 0) > 0;
}

function isNonNegativeInteger(value: number | null | undefined): boolean {
  return Number.isInteger(value) && (value ?? 0) >= 0;
}

export function validateCatalogPayload(input: CatalogProductInput): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const status = parseProductStatus(input.status);
  const variants = input.variants ?? [];
  const activeVariants = variants.filter((variant) => variant.isActive !== false);
  const images = (input.images ?? []).filter((image) => image.url?.trim());

  if (!input.name?.trim() || input.name.trim().length < 3) {
    issues.push({
      field: "name",
      message: "Product name must be at least 3 characters."
    });
  }

  if (!input.slug?.trim()) {
    issues.push({
      field: "slug",
      message: "Product slug is required."
    });
  }

  if (variants.length === 0) {
    issues.push({
      field: "variants",
      message: "At least one variant is required."
    });
  }

  variants.forEach((variant, index) => {
    if (!variant.name?.trim()) {
      issues.push({
        field: `variants[${index}].name`,
        message: "Variant name is required."
      });
    }

    if (!variant.sku?.trim()) {
      issues.push({
        field: `variants[${index}].sku`,
        message: "Variant SKU is required."
      });
    }

    if (
      variant.compareAtPriceMinor !== null &&
      variant.compareAtPriceMinor !== undefined &&
      !hasPositiveMinorUnitAmount(variant.compareAtPriceMinor)
    ) {
      issues.push({
        field: `variants[${index}].compareAtPriceMinor`,
        message: "Compare-at price must be a positive integer in minor units."
      });
    }

    if (!isNonNegativeInteger(variant.inventoryQuantity ?? 0)) {
      issues.push({
        field: `variants[${index}].inventoryQuantity`,
        message: "Inventory quantity must be a non-negative integer."
      });
    }

    if (
      variant.weightGrams !== null &&
      variant.weightGrams !== undefined &&
      !isNonNegativeInteger(variant.weightGrams)
    ) {
      issues.push({
        field: `variants[${index}].weightGrams`,
        message: "Weight must be a non-negative integer in grams."
      });
    }

    if (
      status === "ACTIVE" &&
      (variant.isActive !== false || variant.isDefault === true) &&
      !isSupportedCurrency(variant.currency)
    ) {
      issues.push({
        field: `variants[${index}].currency`,
        message: "Active variants require a supported currency."
      });
    }

    if (
      status === "ACTIVE" &&
      (variant.isActive !== false || variant.isDefault === true) &&
      !hasPositiveMinorUnitAmount(variant.priceMinor)
    ) {
      issues.push({
        field: `variants[${index}].priceMinor`,
        message: "Active variants require a positive price in minor units."
      });
    }
  });

  if (status !== "ACTIVE") {
    return issues;
  }

  if (!input.returnPolicy?.trim() || input.returnPolicy.trim().length < 10) {
    issues.push({
      field: "returnPolicy",
      message: "Return policy must be at least 10 characters before listing goes active."
    });
  }

  if (!input.sellerContact?.trim() || input.sellerContact.trim().length < 5) {
    issues.push({
      field: "sellerContact",
      message: "Seller contact must be at least 5 characters before listing goes active."
    });
  }

  if (images.length < 1) {
    issues.push({
      field: "images",
      message: "At least one product image is required before listing goes active."
    });
  }

  if (activeVariants.length < 1) {
    issues.push({
      field: "variants",
      message: "At least one active variant is required before listing goes active."
    });
  }

  return issues;
}

export function formatModerationStatus(status: string | null | undefined): string {
  return (status ?? "PENDING")
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
