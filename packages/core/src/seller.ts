export const DEFAULT_KYC_DOCUMENT_TYPES = [
  "GOVERNMENT_ID",
  "PASSPORT",
  "BUSINESS_LICENSE"
] as const;

export function readKycDocumentTypes(env: NodeJS.ProcessEnv = process.env): string[] {
  const rawValue = env.KYC_DOCUMENT_TYPES?.trim();

  if (!rawValue) {
    return [...DEFAULT_KYC_DOCUMENT_TYPES];
  }

  const parsedTypes = rawValue
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  return parsedTypes.length > 0 ? Array.from(new Set(parsedTypes)) : [...DEFAULT_KYC_DOCUMENT_TYPES];
}

export function canSellerListProducts(status: string | null | undefined): boolean {
  return status === "APPROVED";
}

export function formatKycStatus(status: string | null | undefined): string {
  return (status ?? "PENDING")
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
