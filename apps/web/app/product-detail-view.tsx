"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductImage } from "./product-image";
import { formatMoney } from "./lib/format";
import { getBuyerDictionary, type BuyerLocale } from "./lib/i18n";
import { useProductDetail } from "./hooks/use-product-detail";

type ProductDetailViewProps = {
  locale: BuyerLocale;
  slug: string;
};

function resolveStockCopy(
  locale: BuyerLocale,
  availableQuantity: number
) {
  const dictionary = getBuyerDictionary(locale);

  if (availableQuantity <= 0) {
    return dictionary.availabilityOutOfStock;
  }

  if (availableQuantity <= 5) {
    return dictionary.availabilityLowStock;
  }

  return dictionary.availabilityInStock;
}

export function ProductDetailView({ locale, slug }: ProductDetailViewProps) {
  const dictionary = getBuyerDictionary(locale);
  const { data, error, isLoading } = useProductDetail(slug);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <section className="grid gap-6">
        <div className="h-4 w-32 animate-pulse rounded-full bg-white/80" />
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="h-[28rem] animate-pulse rounded-[2rem] bg-white/80" />
          <div className="grid gap-4">
            <div className="h-8 w-2/3 animate-pulse rounded-full bg-white/80" />
            <div className="h-24 animate-pulse rounded-[2rem] bg-white/80" />
            <div className="h-52 animate-pulse rounded-[2rem] bg-white/80" />
          </div>
        </div>
        <p className="text-sm text-stone-600">{dictionary.detailLoading}</p>
      </section>
    );
  }

  if (!data || error) {
    return (
      <section className="grid gap-5 rounded-[2rem] border border-black/10 bg-white/78 px-6 py-10 text-center shadow-[0_18px_45px_rgba(41,24,8,0.06)]">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
          KhmerCart
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
          {error === "NOT_FOUND" ? dictionary.notFound : dictionary.detailFallback}
        </h1>
        <div className="flex justify-center">
          <Link
            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5"
            href={`/?locale=${locale}`}
          >
            {dictionary.backToFeed}
          </Link>
        </div>
      </section>
    );
  }

  const selectedVariant =
    data.variants.find((variant) => variant.id === selectedVariantId) ??
    data.variants.find((variant) => variant.isDefault) ??
    data.variants[0];
  const selectedImage =
    data.images.find((image) => image.id === selectedImageId) ??
    data.images.find((image) => image.isPrimary) ??
    data.images[0] ??
    data.featuredImage;
  const selectedAvailableQuantity = selectedVariant?.availableQuantity ?? data.stock.availableQuantity;

  return (
    <div className="grid gap-6">
      <Link
        className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:-translate-y-0.5 hover:text-stone-950"
        href={`/?locale=${locale}`}
      >
        {dictionary.backToFeed}
      </Link>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <ProductImage
            alt={selectedImage?.altText ?? data.name}
            className="h-[23rem] rounded-[2rem] sm:h-[30rem]"
            label={data.category || dictionary.featuredNow}
            src={selectedImage?.url ?? null}
          />

          {data.images.length > 1 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {data.images.map((image) => (
                <button
                  key={image.id}
                  className={[
                    "overflow-hidden rounded-[1.3rem] border transition",
                    image.id === selectedImage?.id
                      ? "border-stone-950 shadow-[0_14px_40px_rgba(41,24,8,0.14)]"
                      : "border-black/10"
                  ].join(" ")}
                  onClick={() => setSelectedImageId(image.id)}
                  type="button"
                >
                  <ProductImage
                    alt={image.altText}
                    className="h-24"
                    src={image.url}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-5">
          <article className="rounded-[2rem] border border-black/10 bg-white/82 p-6 shadow-[0_18px_45px_rgba(41,24,8,0.06)]">
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
                  {dictionary.seller}
                </span>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em]",
                    selectedAvailableQuantity <= 0
                      ? "bg-rose-100 text-rose-800"
                      : selectedAvailableQuantity <= 5
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                  ].join(" ")}
                >
                  {resolveStockCopy(locale, selectedAvailableQuantity)}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-stone-600">{data.seller.displayName}</p>
                <h1 className="text-4xl font-semibold tracking-tight text-stone-950">
                  {data.name}
                </h1>
                <p className="text-base leading-7 text-stone-700">{data.description}</p>
              </div>

              {selectedVariant ? (
                <div className="grid gap-3 rounded-[1.6rem] border border-black/8 bg-stone-50/90 p-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-stone-500">
                        {dictionary.priceFrom}
                      </p>
                      <p className="mt-2 text-4xl font-semibold tracking-tight text-stone-950">
                        {formatMoney(locale, selectedVariant.currency, selectedVariant.priceMinor)}
                      </p>
                      {selectedVariant.compareAtPriceMinor ? (
                        <p className="mt-2 text-base text-stone-500 line-through">
                          {formatMoney(
                            locale,
                            selectedVariant.currency,
                            selectedVariant.compareAtPriceMinor
                          )}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-stone-500">
                        {dictionary.availability}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-stone-950">
                        {selectedAvailableQuantity} {dictionary.stockUnits}
                      </p>
                    </div>
                  </div>

                  {selectedVariant.attributes ? (
                    <dl className="grid gap-3 pt-2 sm:grid-cols-2">
                      {Object.entries(selectedVariant.attributes).map(([key, value]) => (
                        <div
                          key={`${selectedVariant.id}:${key}`}
                          className="rounded-[1.15rem] border border-black/8 bg-white px-4 py-3"
                        >
                          <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                            {key}
                          </dt>
                          <dd className="mt-2 text-sm font-medium text-stone-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>

          <article className="rounded-[2rem] border border-black/10 bg-white/82 p-6 shadow-[0_18px_45px_rgba(41,24,8,0.06)]">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
              {dictionary.variantLabel}
            </p>

            <div className="mt-4 grid gap-3">
              {data.variants.map((variant) => (
                <button
                  key={variant.id}
                  className={[
                    "grid gap-2 rounded-[1.35rem] border px-4 py-4 text-left transition",
                    variant.id === selectedVariant?.id
                      ? "border-stone-950 bg-stone-950 text-stone-50 shadow-[0_18px_45px_rgba(41,24,8,0.18)]"
                      : "border-black/10 bg-stone-50/85 text-stone-800 hover:border-[#0f5346]/30"
                  ].join(" ")}
                  onClick={() => setSelectedVariantId(variant.id)}
                  type="button"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-base font-semibold">{variant.name}</span>
                    <span className="text-sm">
                      {formatMoney(locale, variant.currency, variant.priceMinor)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] opacity-70">
                    <span>{variant.sku}</span>
                    <span>
                      {resolveStockCopy(locale, variant.availableQuantity)} · {variant.availableQuantity}{" "}
                      {dictionary.stockUnits}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-black/10 bg-white/82 p-6 shadow-[0_18px_45px_rgba(41,24,8,0.06)]">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-stone-500">
              {dictionary.disclosures}
            </p>

            <dl className="mt-4 grid gap-4">
              <div className="rounded-[1.3rem] border border-black/8 bg-stone-50/85 px-4 py-4">
                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  {dictionary.returnPolicy}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-stone-800">
                  {data.disclosures.returnPolicy}
                </dd>
              </div>
              <div className="rounded-[1.3rem] border border-black/8 bg-stone-50/85 px-4 py-4">
                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  {dictionary.contactSeller}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-stone-800">
                  {data.disclosures.sellerContact}
                </dd>
              </div>
              <div className="rounded-[1.3rem] border border-black/8 bg-stone-50/85 px-4 py-4">
                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  {dictionary.sellerAddress}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-stone-800">
                  {data.disclosures.sellerAddress || data.seller.slug}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </section>
    </div>
  );
}
