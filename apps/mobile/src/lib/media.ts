export function sanitizeRemoteMediaUrl(url: string | null | undefined) {
  const trimmed = url?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.hostname.endsWith(".local")) {
      return null;
    }

    return trimmed;
  } catch {
    return null;
  }
}

export function pickBestRenderableMediaUrl(...urls: Array<string | null | undefined>) {
  for (const url of urls) {
    const sanitized = sanitizeRemoteMediaUrl(url);

    if (sanitized) {
      return sanitized;
    }
  }

  return null;
}
