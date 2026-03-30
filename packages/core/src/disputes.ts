export const DEFAULT_DISPUTE_REASONS = [
  "NOT_RECEIVED",
  "DAMAGED",
  "NOT_AS_DESCRIBED",
  "OTHER"
] as const;

export function readDisputeReasons(env: NodeJS.ProcessEnv = process.env): string[] {
  const rawValue = env.DISPUTE_REASONS?.trim();

  if (!rawValue || rawValue === "UNSPECIFIED") {
    return [...DEFAULT_DISPUTE_REASONS];
  }

  const parsedReasons = rawValue
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  return parsedReasons.length > 0
    ? Array.from(new Set(parsedReasons))
    : [...DEFAULT_DISPUTE_REASONS];
}

export function formatDisputeReason(reason: string | null | undefined): string {
  return (reason ?? "OTHER")
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatDisputeStatus(status: string | null | undefined): string {
  return (status ?? "OPEN")
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
