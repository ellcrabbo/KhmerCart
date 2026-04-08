"use client";

import type { BuyerProductDetail } from "@khmercart/db";
import { useEffect, useState } from "react";

type UseProductDetailResult = {
  data: BuyerProductDetail | null;
  error: string | null;
  isLoading: boolean;
};

async function requestProductDetail(slug: string): Promise<BuyerProductDetail> {
  const response = await fetch(`/api/products/${slug}`, {
    cache: "no-store"
  });

  if (response.status === 404) {
    throw new Error("NOT_FOUND");
  }

  if (!response.ok) {
    throw new Error("Failed to load product.");
  }

  return (await response.json()) as BuyerProductDetail;
}

export function useProductDetail(slug: string): UseProductDetailResult {
  const [data, setData] = useState<BuyerProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setData(null);
    setError(null);
    setIsLoading(true);

    void (async () => {
      try {
        const payload = await requestProductDetail(slug);

        if (isActive) {
          setData(payload);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load product.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [slug]);

  return {
    data,
    error,
    isLoading
  };
}
