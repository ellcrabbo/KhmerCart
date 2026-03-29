"use client";

import type { BuyerFeedResult } from "@khmercart/db";
import { useEffect, useState, useTransition } from "react";

type UseProductFeedResult = BuyerFeedResult & {
  error: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
};

async function requestFeed(
  category: string | null,
  cursor: string | null
): Promise<BuyerFeedResult> {
  const searchParams = new URLSearchParams();

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  if (category) {
    searchParams.set("category", category);
  }

  const response = await fetch(`/api/products/feed?${searchParams.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load product feed.");
  }

  return (await response.json()) as BuyerFeedResult;
}

export function useProductFeed(category: string | null): UseProductFeedResult {
  const [items, setItems] = useState<BuyerFeedResult["items"]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isActive = true;

    setError(null);
    setIsLoading(true);
    setItems([]);
    setNextCursor(null);

    void (async () => {
      try {
        const payload = await requestFeed(category, null);

        if (!isActive) {
          return;
        }

        setCategories(payload.categories);
        setItems(payload.items);
        setNextCursor(payload.nextCursor);
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load product feed.");
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
  }, [category]);

  function loadMore() {
    if (!nextCursor || isPending) {
      return;
    }

    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const payload = await requestFeed(category, nextCursor);

          setCategories(payload.categories);
          setItems((current) => [...current, ...payload.items]);
          setNextCursor(payload.nextCursor);
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load product feed.");
        }
      })();
    });
  }

  return {
    categories,
    error,
    isLoading,
    isLoadingMore: isPending,
    items,
    loadMore,
    nextCursor
  };
}
