"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { ProductImage } from "./product-image";
import { formatMoney } from "./lib/format";
import { getBuyerDictionary, type BuyerLocale } from "./lib/i18n";
import { useProductFeed } from "./hooks/use-product-feed";

type DiscoveryFeedProps = {
  locale: BuyerLocale;
};

function resolveStockCopy(
  locale: BuyerLocale,
  state: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"
) {
  const dictionary = getBuyerDictionary(locale);

  if (state === "OUT_OF_STOCK") {
    return dictionary.availabilityOutOfStock;
  }

  if (state === "LOW_STOCK") {
    return dictionary.availabilityLowStock;
  }

  return dictionary.availabilityInStock;
}

export function DiscoveryFeed({ locale }: DiscoveryFeedProps) {
  const dictionary = getBuyerDictionary(locale);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const deferredCategory = useDeferredValue(selectedCategory);
  const { categories, error, isLoading, isLoadingMore, items, loadMore, nextCursor } =
    useProductFeed(deferredCategory);

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-black/10 bg-[linear-gradient(135deg,rgba(255,252,246,0.95)_0%,rgba(240,232,219,0.88)_100%)] shadow-[0_28px_80px_rgba(61,40,18,0.08)]">
        <div className="grid gap-8 px-5 py-6 sm:px-7 sm:py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-10">
          <div className="space-y-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[#8b5a18]">
              {dictionary.featuredNow}
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                {dictionary.heroTitle}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-stone-700 sm:text-base">
                {dictionary.heroBody}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.75rem] border border-black/10 bg-white/75 p-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-stone-500">
                {dictionary.browseTitle}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
                {items.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {deferredCategory ? deferredCategory : dictionary.allCategories}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-[#0f5346]/20 bg-[#0f5346] p-5 text-white shadow-[0_18px_50px_rgba(15,83,70,0.25)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-white/65">
                KhmerCart
              </p>
              <p className="mt-3 text-lg font-semibold leading-7">
                {dictionary.storefrontNote}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
              {dictionary.categoryFilter}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              {dictionary.browseTitle}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={[
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              selectedCategory === null
                ? "bg-stone-950 text-stone-50"
                : "bg-white/80 text-stone-700 hover:bg-white hover:text-stone-950"
            ].join(" ")}
            onClick={() => setSelectedCategory(null)}
            type="button"
          >
            {dictionary.allCategories}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                selectedCategory === category
                  ? "bg-stone-950 text-stone-50"
                  : "bg-white/80 text-stone-700 hover:bg-white hover:text-stone-950"
              ].join(" ")}
              onClick={() => setSelectedCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        {error ? (
          <div className="rounded-[1.75rem] border border-rose-500/20 bg-rose-50/70 px-5 py-4 text-sm text-rose-900">
            {dictionary.feedError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`feed-skeleton-${index}`}
                className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/70 p-4 shadow-[0_18px_45px_rgba(41,24,8,0.06)]"
              >
                <div className="h-56 animate-pulse rounded-[1.4rem] bg-stone-200/80" />
                <div className="mt-4 h-4 w-24 animate-pulse rounded-full bg-stone-200/80" />
                <div className="mt-3 h-8 w-3/4 animate-pulse rounded-full bg-stone-200/80" />
                <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-stone-200/80" />
                <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-stone-200/80" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-black/10 bg-white/70 px-5 py-12 text-center text-sm text-stone-600">
            {dictionary.feedEmpty}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                className="group overflow-hidden rounded-[1.9rem] border border-black/10 bg-white/78 shadow-[0_18px_45px_rgba(41,24,8,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(41,24,8,0.12)]"
                href={`/products/${item.slug}?locale=${locale}`}
              >
                <ProductImage
                  alt={item.featuredImage?.altText ?? item.name}
                  className="h-64 w-full"
                  label={item.category || dictionary.featuredNow}
                  src={item.featuredImage?.url ?? null}
                />

                <div className="grid gap-4 px-5 py-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-stone-500">
                        {dictionary.seller}
                      </span>
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em]",
                          item.stock.state === "OUT_OF_STOCK"
                            ? "bg-rose-100 text-rose-800"
                            : item.stock.state === "LOW_STOCK"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                        ].join(" ")}
                      >
                        {resolveStockCopy(locale, item.stock.state)}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600">{item.seller.displayName}</p>
                    <h3 className="text-2xl font-semibold tracking-tight text-stone-950">
                      {item.name}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-6 text-stone-600">
                      {item.description}
                    </p>
                  </div>

                  <div className="grid gap-3 border-t border-black/6 pt-4 text-sm text-stone-700">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-stone-500">
                          {dictionary.priceFrom}
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                          {formatMoney(locale, item.pricing.currency, item.pricing.priceMinor)}
                        </p>
                        {item.pricing.compareAtPriceMinor ? (
                          <p className="mt-1 text-sm text-stone-500 line-through">
                            {formatMoney(
                              locale,
                              item.pricing.currency,
                              item.pricing.compareAtPriceMinor
                            )}
                          </p>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-stone-500">
                          {dictionary.availability}
                        </p>
                        <p className="mt-2 font-semibold text-stone-900">
                          {item.stock.availableQuantity} {dictionary.stockUnits}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {nextCursor ? (
          <div className="flex justify-center pt-3">
            <button
              className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoadingMore}
              onClick={loadMore}
              type="button"
            >
              {isLoadingMore ? dictionary.loading : dictionary.loadMore}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
