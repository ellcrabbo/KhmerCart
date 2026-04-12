import * as SecureStore from "expo-secure-store";

const SELLER_VIDEO_DRAFT_KEY = "khmercart.seller.video-draft";

export type PersistedSellerUploadAsset = {
  aspectRatio: number | null;
  durationSec: number | null;
  fileName: string;
  mimeType: string;
  uri: string;
};

export type PersistedSellerVideoDraft = {
  attachmentProductIds: string[];
  caption: string;
  durationSec: number | null;
  processingPostId?: string | null;
  posterAsset: PersistedSellerUploadAsset | null;
  posterObjectKey?: string | null;
  posterLabel: string | null;
  posterPreviewUrl: string | null;
  productId: string | null;
  statusDetail: string | null;
  status: "DRAFT" | "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | "PUBLISHED";
  uploadProgress: number;
  videoAsset: PersistedSellerUploadAsset | null;
  videoObjectKey?: string | null;
  videoLabel: string | null;
};

export async function readPersistedSellerVideoDraft() {
  const storedValue = await SecureStore.getItemAsync(SELLER_VIDEO_DRAFT_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as PersistedSellerVideoDraft;
  } catch {
    return null;
  }
}

export async function writePersistedSellerVideoDraft(
  value: PersistedSellerVideoDraft,
) {
  await SecureStore.setItemAsync(SELLER_VIDEO_DRAFT_KEY, JSON.stringify(value));
}

export async function clearPersistedSellerVideoDraft() {
  await SecureStore.deleteItemAsync(SELLER_VIDEO_DRAFT_KEY);
}
