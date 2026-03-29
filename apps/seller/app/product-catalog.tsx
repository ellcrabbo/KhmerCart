"use client";

import type {
  SellerCatalogData,
  SellerCatalogProduct,
  SellerCatalogVariant
} from "@khmercart/db";
import { formatModerationStatus } from "@khmercart/core";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ProductCatalogProps = {
  canListProducts: boolean;
  defaultCurrency: "KHR" | "USD";
  initialCatalog: SellerCatalogData;
};

type ProductEditorState = {
  category: string;
  description: string;
  imageUrls: string;
  moderationNotes: string;
  name: string;
  returnPolicy: string;
  sellerAddress: string;
  sellerContact: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

type VariantEditorState = {
  currency: "KHR" | "USD" | "";
  inventoryQuantity: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  priceMinor: string;
  reorderPoint: string;
  sku: string;
  weightGrams: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildProductEditor(product: SellerCatalogProduct): ProductEditorState {
  return {
    category: product.category,
    description: product.description,
    imageUrls: product.images.map((image) => image.url).join("\n"),
    moderationNotes: product.moderationNotes,
    name: product.name,
    returnPolicy: product.returnPolicy,
    sellerAddress: product.sellerAddress,
    sellerContact: product.sellerContact,
    slug: product.slug,
    status: product.status
  };
}

function buildVariantEditor(
  variant: SellerCatalogVariant,
  fallbackCurrency: "KHR" | "USD"
): VariantEditorState {
  return {
    currency: variant.currency ?? fallbackCurrency,
    inventoryQuantity: `${variant.inventory?.onHandQuantity ?? 0}`,
    isActive: variant.isActive,
    isDefault: variant.isDefault,
    name: variant.name,
    priceMinor: variant.priceMinor !== null ? `${variant.priceMinor}` : "",
    reorderPoint:
      variant.inventory?.reorderPoint !== null && variant.inventory?.reorderPoint !== undefined
        ? `${variant.inventory.reorderPoint}`
        : "",
    sku: variant.sku,
    weightGrams: variant.weightGrams !== null ? `${variant.weightGrams}` : ""
  };
}

function createEmptyVariantState(defaultCurrency: "KHR" | "USD"): VariantEditorState {
  return {
    currency: defaultCurrency,
    inventoryQuantity: "0",
    isActive: true,
    isDefault: false,
    name: "",
    priceMinor: "",
    reorderPoint: "",
    sku: "",
    weightGrams: ""
  };
}

function createEmptyProductState(defaultCurrency: "KHR" | "USD"): {
  product: ProductEditorState;
  variant: VariantEditorState;
} {
  return {
    product: {
      category: "",
      description: "",
      imageUrls: "",
      moderationNotes: "",
      name: "",
      returnPolicy: "Returns accepted within seven days if unused and in original condition.",
      sellerAddress: "",
      sellerContact: "",
      slug: "",
      status: "DRAFT"
    },
    variant: createEmptyVariantState(defaultCurrency)
  };
}

function parseInteger(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseImageUrls(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((url, index) => ({
      altText: `Product image ${index + 1}`,
      isPrimary: index === 0,
      url
    }));
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };

    return payload.message ?? `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export function ProductCatalog({
  canListProducts,
  defaultCurrency,
  initialCatalog
}: ProductCatalogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const emptyState = createEmptyProductState(defaultCurrency);
  const [newProduct, setNewProduct] = useState(emptyState.product);
  const [newVariant, setNewVariant] = useState(emptyState.variant);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [productEditors, setProductEditors] = useState<Record<string, ProductEditorState>>(
    Object.fromEntries(initialCatalog.products.map((product) => [product.id, buildProductEditor(product)]))
  );
  const [variantEditors, setVariantEditors] = useState<Record<string, VariantEditorState>>(
    Object.fromEntries(
      initialCatalog.products.flatMap((product) =>
        product.variants.map((variant) => [
          variant.id,
          buildVariantEditor(variant, (variant.currency ?? defaultCurrency) as "KHR" | "USD")
        ])
      )
    )
  );
  const [newVariants, setNewVariants] = useState<Record<string, VariantEditorState>>(
    Object.fromEntries(
      initialCatalog.products.map((product) => [product.id, createEmptyVariantState(defaultCurrency)])
    )
  );
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function createProduct() {
    const response = await fetch("/api/products", {
      body: JSON.stringify({
        ...newProduct,
        images: parseImageUrls(newProduct.imageUrls),
        variants: [
          {
            currency: newVariant.currency || undefined,
            inventoryQuantity: parseInteger(newVariant.inventoryQuantity) ?? 0,
            isActive: newVariant.isActive,
            isDefault: true,
            name: newVariant.name,
            priceMinor: parseInteger(newVariant.priceMinor),
            reorderPoint: parseInteger(newVariant.reorderPoint),
            sku: newVariant.sku,
            weightGrams: parseInteger(newVariant.weightGrams)
          }
        ]
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const reset = createEmptyProductState(defaultCurrency);
    setNewProduct(reset.product);
    setNewVariant(reset.variant);
    setCreateMessage("Catalog item created.");
    router.refresh();
  }

  async function updateProduct(productId: string) {
    const editor = productEditors[productId];
    const response = await fetch(`/api/products/${productId}`, {
      body: JSON.stringify({
        ...editor,
        images: parseImageUrls(editor.imageUrls)
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "PATCH"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    setMessages((current) => ({
      ...current,
      [productId]: "Product saved."
    }));
    router.refresh();
  }

  async function archiveProduct(productId: string) {
    const response = await fetch(`/api/products/${productId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    setMessages((current) => ({
      ...current,
      [productId]: "Product archived."
    }));
    router.refresh();
  }

  async function createVariant(productId: string) {
    const editor = newVariants[productId] ?? createEmptyVariantState(defaultCurrency);
    const response = await fetch(`/api/products/${productId}/variants`, {
      body: JSON.stringify({
        currency: editor.currency || undefined,
        inventoryQuantity: parseInteger(editor.inventoryQuantity) ?? 0,
        isActive: editor.isActive,
        isDefault: editor.isDefault,
        name: editor.name,
        priceMinor: parseInteger(editor.priceMinor),
        reorderPoint: parseInteger(editor.reorderPoint),
        sku: editor.sku,
        weightGrams: parseInteger(editor.weightGrams)
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    setMessages((current) => ({
      ...current,
      [productId]: "Variant added."
    }));
    setNewVariants((current) => ({
      ...current,
      [productId]: createEmptyVariantState(defaultCurrency)
    }));
    router.refresh();
  }

  async function updateVariant(variantId: string, productId: string) {
    const editor = variantEditors[variantId];
    const response = await fetch(`/api/variants/${variantId}`, {
      body: JSON.stringify({
        currency: editor.currency || undefined,
        isActive: editor.isActive,
        isDefault: editor.isDefault,
        name: editor.name,
        priceMinor: parseInteger(editor.priceMinor),
        reorderPoint: parseInteger(editor.reorderPoint),
        sku: editor.sku,
        weightGrams: parseInteger(editor.weightGrams)
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "PATCH"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    setMessages((current) => ({
      ...current,
      [variantId]: "Variant saved.",
      [productId]: "Variant saved."
    }));
    router.refresh();
  }

  async function archiveVariant(variantId: string, productId: string) {
    const response = await fetch(`/api/variants/${variantId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    setMessages((current) => ({
      ...current,
      [variantId]: "Variant archived.",
      [productId]: "Variant archived."
    }));
    router.refresh();
  }

  async function updateInventory(variantId: string, productId: string) {
    const editor = variantEditors[variantId];
    const response = await fetch(`/api/variants/${variantId}/inventory`, {
      body: JSON.stringify({
        onHandQuantity: parseInteger(editor.inventoryQuantity) ?? 0
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "PATCH"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    setMessages((current) => ({
      ...current,
      [variantId]: "Inventory updated.",
      [productId]: "Inventory updated."
    }));
    router.refresh();
  }

  return (
    <section className="grid gap-6">
      <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Catalog studio
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              Product, variant, and inventory control
            </h2>
          </div>
          <span
            className={[
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em]",
              canListProducts ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            ].join(" ")}
          >
            {canListProducts ? "Seller can activate listings" : "Draft-only until seller approval"}
          </span>
        </div>

        {createMessage ? <p className="mt-4 text-sm font-medium text-emerald-700">{createMessage}</p> : null}

        {!canListProducts ? (
          <div className="mt-5 rounded-3xl border border-amber-500/20 bg-amber-50/70 p-5 text-sm text-amber-950">
            Product drafts can be prepared now, but switching a listing to `ACTIVE` is blocked until
            seller approval is complete.
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm text-stone-700">
            Product name
            <input
              className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
              value={newProduct.name}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  name: event.target.value,
                  slug: current.slug || slugify(event.target.value)
                }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Product slug
            <input
              className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 font-mono text-stone-950 outline-none transition focus:border-emerald-500/60"
              value={newProduct.slug}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  slug: event.target.value
                }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Category
            <input
              className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
              value={newProduct.category}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  category: event.target.value
                }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Listing state
            <select
              className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
              value={newProduct.status}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  status: event.target.value as ProductEditorState["status"]
                }))
              }
            >
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Seller contact
            <input
              className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
              value={newProduct.sellerContact}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  sellerContact: event.target.value
                }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Seller address
            <input
              className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
              value={newProduct.sellerAddress}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  sellerAddress: event.target.value
                }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 lg:col-span-2">
            Description
            <textarea
              className="min-h-28 rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
              value={newProduct.description}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 lg:col-span-2">
            Return policy
            <textarea
              className="min-h-24 rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
              value={newProduct.returnPolicy}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  returnPolicy: event.target.value
                }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 lg:col-span-2">
            Image URLs
            <textarea
              className="min-h-24 rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 font-mono text-stone-950 outline-none transition focus:border-emerald-500/60"
              placeholder="One image URL per line"
              value={newProduct.imageUrls}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  imageUrls: event.target.value
                }))
              }
            />
          </label>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-stone-50/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
            Initial variant
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm text-stone-700">
              Variant name
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={newVariant.name}
                onChange={(event) =>
                  setNewVariant((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              SKU
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 font-mono text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={newVariant.sku}
                onChange={(event) =>
                  setNewVariant((current) => ({
                    ...current,
                    sku: event.target.value
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Price minor units
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                type="number"
                value={newVariant.priceMinor}
                onChange={(event) =>
                  setNewVariant((current) => ({
                    ...current,
                    priceMinor: event.target.value
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Currency
              <select
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={newVariant.currency}
                onChange={(event) =>
                  setNewVariant((current) => ({
                    ...current,
                    currency: event.target.value as VariantEditorState["currency"]
                  }))
                }
              >
                <option value="KHR">KHR</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              On-hand inventory
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                type="number"
                value={newVariant.inventoryQuantity}
                onChange={(event) =>
                  setNewVariant((current) => ({
                    ...current,
                    inventoryQuantity: event.target.value
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Reorder point
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                type="number"
                value={newVariant.reorderPoint}
                onChange={(event) =>
                  setNewVariant((current) => ({
                    ...current,
                    reorderPoint: event.target.value
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Weight (grams)
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                type="number"
                value={newVariant.weightGrams}
                onChange={(event) =>
                  setNewVariant((current) => ({
                    ...current,
                    weightGrams: event.target.value
                  }))
                }
              />
            </label>
          </div>
        </div>

        <button
          className="mt-6 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await createProduct();
              } catch (error) {
                setCreateMessage(
                  error instanceof Error ? error.message : "Unable to create catalog item."
                );
              }
            })
          }
          type="button"
        >
          Create catalog item
        </button>
      </article>

      <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Existing catalog
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              Listings, moderation, and stock
            </h2>
          </div>
          <span className="rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-800">
            {initialCatalog.products.length} products
          </span>
        </div>

        <div className="mt-6 space-y-5">
          {initialCatalog.products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 bg-stone-50/85 px-5 py-6 text-sm text-stone-600">
              No catalog entries yet.
            </div>
          ) : (
            initialCatalog.products.map((product) => {
              const editor = productEditors[product.id] ?? buildProductEditor(product);

              return (
                <section
                  key={product.id}
                  className="rounded-[1.5rem] border border-black/10 bg-stone-50/85 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-stone-950">{product.name}</p>
                      <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                        {product.slug}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-stone-50">
                        {product.status}
                      </span>
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-800">
                        {formatModerationStatus(product.moderationStatus)}
                      </span>
                    </div>
                  </div>

                  {product.validationIssues.length > 0 ? (
                    <div className="mt-4 rounded-3xl border border-amber-500/20 bg-amber-50/70 p-4 text-sm text-amber-950">
                      <p className="font-semibold">Validation blockers</p>
                      <ul className="mt-2 space-y-1">
                        {product.validationIssues.map((issue) => (
                          <li key={`${product.id}:${issue.field}`}>• {issue.message}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {messages[product.id] ? (
                    <p className="mt-4 text-sm font-medium text-emerald-700">{messages[product.id]}</p>
                  ) : null}

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <label className="grid gap-2 text-sm text-stone-700">
                      Product name
                      <input
                        className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                        value={editor.name}
                        onChange={(event) =>
                          setProductEditors((current) => ({
                            ...current,
                            [product.id]: {
                              ...editor,
                              name: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-stone-700">
                      Product slug
                      <input
                        className="rounded-2xl border border-black/10 bg-white px-4 py-3 font-mono text-stone-950 outline-none transition focus:border-sky-500/60"
                        value={editor.slug}
                        onChange={(event) =>
                          setProductEditors((current) => ({
                            ...current,
                            [product.id]: {
                              ...editor,
                              slug: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-stone-700">
                      Seller contact
                      <input
                        className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                        value={editor.sellerContact}
                        onChange={(event) =>
                          setProductEditors((current) => ({
                            ...current,
                            [product.id]: {
                              ...editor,
                              sellerContact: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-stone-700">
                      Seller address
                      <input
                        className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                        value={editor.sellerAddress}
                        onChange={(event) =>
                          setProductEditors((current) => ({
                            ...current,
                            [product.id]: {
                              ...editor,
                              sellerAddress: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-stone-700">
                      Category
                      <input
                        className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                        value={editor.category}
                        onChange={(event) =>
                          setProductEditors((current) => ({
                            ...current,
                            [product.id]: {
                              ...editor,
                              category: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-stone-700">
                      Listing state
                      <select
                        className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                        value={editor.status}
                        onChange={(event) =>
                          setProductEditors((current) => ({
                            ...current,
                            [product.id]: {
                              ...editor,
                              status: event.target.value as ProductEditorState["status"]
                            }
                          }))
                        }
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm text-stone-700 lg:col-span-2">
                      Description
                      <textarea
                        className="min-h-24 rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                        value={editor.description}
                        onChange={(event) =>
                          setProductEditors((current) => ({
                            ...current,
                            [product.id]: {
                              ...editor,
                              description: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-stone-700 lg:col-span-2">
                      Return policy
                      <textarea
                        className="min-h-24 rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                        value={editor.returnPolicy}
                        onChange={(event) =>
                          setProductEditors((current) => ({
                            ...current,
                            [product.id]: {
                              ...editor,
                              returnPolicy: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-stone-700 lg:col-span-2">
                      Image URLs
                      <textarea
                        className="min-h-24 rounded-2xl border border-black/10 bg-white px-4 py-3 font-mono text-stone-950 outline-none transition focus:border-sky-500/60"
                        value={editor.imageUrls}
                        onChange={(event) =>
                          setProductEditors((current) => ({
                            ...current,
                            [product.id]: {
                              ...editor,
                              imageUrls: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await updateProduct(product.id);
                          } catch (error) {
                            setMessages((current) => ({
                              ...current,
                              [product.id]:
                                error instanceof Error ? error.message : "Unable to save product."
                            }));
                          }
                        })
                      }
                      type="button"
                    >
                      Save product
                    </button>
                    <button
                      className="rounded-full border border-rose-600/20 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await archiveProduct(product.id);
                          } catch (error) {
                            setMessages((current) => ({
                              ...current,
                              [product.id]:
                                error instanceof Error ? error.message : "Unable to archive product."
                            }));
                          }
                        })
                      }
                      type="button"
                    >
                      Archive product
                    </button>
                  </div>

                  <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-white/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                      Variants and stock
                    </p>

                    <div className="mt-4 space-y-4">
                      {product.variants.map((variant) => {
                        const variantEditor =
                          variantEditors[variant.id] ??
                          buildVariantEditor(
                            variant,
                            (variant.currency ?? defaultCurrency) as "KHR" | "USD"
                          );

                        return (
                          <div
                            key={variant.id}
                            className="rounded-3xl border border-black/10 bg-stone-50/85 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-stone-950">{variant.name}</p>
                                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                                  {variant.sku}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {variant.isDefault ? (
                                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">
                                    Default
                                  </span>
                                ) : null}
                                <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-stone-700">
                                  {variant.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>

                            {messages[variant.id] ? (
                              <p className="mt-3 text-sm font-medium text-emerald-700">
                                {messages[variant.id]}
                              </p>
                            ) : null}

                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <label className="grid gap-2 text-sm text-stone-700">
                                Variant name
                                <input
                                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                                  value={variantEditor.name}
                                  onChange={(event) =>
                                    setVariantEditors((current) => ({
                                      ...current,
                                      [variant.id]: {
                                        ...variantEditor,
                                        name: event.target.value
                                      }
                                    }))
                                  }
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-stone-700">
                                SKU
                                <input
                                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 font-mono text-stone-950 outline-none transition focus:border-sky-500/60"
                                  value={variantEditor.sku}
                                  onChange={(event) =>
                                    setVariantEditors((current) => ({
                                      ...current,
                                      [variant.id]: {
                                        ...variantEditor,
                                        sku: event.target.value
                                      }
                                    }))
                                  }
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-stone-700">
                                Price minor units
                                <input
                                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                                  type="number"
                                  value={variantEditor.priceMinor}
                                  onChange={(event) =>
                                    setVariantEditors((current) => ({
                                      ...current,
                                      [variant.id]: {
                                        ...variantEditor,
                                        priceMinor: event.target.value
                                      }
                                    }))
                                  }
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-stone-700">
                                Currency
                                <select
                                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                                  value={variantEditor.currency}
                                  onChange={(event) =>
                                    setVariantEditors((current) => ({
                                      ...current,
                                      [variant.id]: {
                                        ...variantEditor,
                                        currency: event.target.value as VariantEditorState["currency"]
                                      }
                                    }))
                                  }
                                >
                                  <option value="KHR">KHR</option>
                                  <option value="USD">USD</option>
                                </select>
                              </label>
                              <label className="grid gap-2 text-sm text-stone-700">
                                On-hand inventory
                                <input
                                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                                  type="number"
                                  value={variantEditor.inventoryQuantity}
                                  onChange={(event) =>
                                    setVariantEditors((current) => ({
                                      ...current,
                                      [variant.id]: {
                                        ...variantEditor,
                                        inventoryQuantity: event.target.value
                                      }
                                    }))
                                  }
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-stone-700">
                                Reorder point
                                <input
                                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                                  type="number"
                                  value={variantEditor.reorderPoint}
                                  onChange={(event) =>
                                    setVariantEditors((current) => ({
                                      ...current,
                                      [variant.id]: {
                                        ...variantEditor,
                                        reorderPoint: event.target.value
                                      }
                                    }))
                                  }
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-stone-700">
                                Weight (grams)
                                <input
                                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                                  type="number"
                                  value={variantEditor.weightGrams}
                                  onChange={(event) =>
                                    setVariantEditors((current) => ({
                                      ...current,
                                      [variant.id]: {
                                        ...variantEditor,
                                        weightGrams: event.target.value
                                      }
                                    }))
                                  }
                                />
                              </label>
                              <div className="grid gap-2 text-sm text-stone-700">
                                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                                  Flags
                                </span>
                                <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
                                  <input
                                    checked={variantEditor.isActive}
                                    onChange={(event) =>
                                      setVariantEditors((current) => ({
                                        ...current,
                                        [variant.id]: {
                                          ...variantEditor,
                                          isActive: event.target.checked
                                        }
                                      }))
                                    }
                                    type="checkbox"
                                  />
                                  <span>Active variant</span>
                                </label>
                                <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
                                  <input
                                    checked={variantEditor.isDefault}
                                    onChange={(event) =>
                                      setVariantEditors((current) => ({
                                        ...current,
                                        [variant.id]: {
                                          ...variantEditor,
                                          isDefault: event.target.checked
                                        }
                                      }))
                                    }
                                    type="checkbox"
                                  />
                                  <span>Default variant</span>
                                </label>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isPending}
                                onClick={() =>
                                  startTransition(async () => {
                                    try {
                                      await updateVariant(variant.id, product.id);
                                    } catch (error) {
                                      setMessages((current) => ({
                                        ...current,
                                        [variant.id]:
                                          error instanceof Error
                                            ? error.message
                                            : "Unable to update variant."
                                      }));
                                    }
                                  })
                                }
                                type="button"
                              >
                                Save variant
                              </button>
                              <button
                                className="rounded-full border border-sky-600/20 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isPending}
                                onClick={() =>
                                  startTransition(async () => {
                                    try {
                                      await updateInventory(variant.id, product.id);
                                    } catch (error) {
                                      setMessages((current) => ({
                                        ...current,
                                        [variant.id]:
                                          error instanceof Error
                                            ? error.message
                                            : "Unable to update inventory."
                                      }));
                                    }
                                  })
                                }
                                type="button"
                              >
                                Apply inventory
                              </button>
                              <button
                                className="rounded-full border border-rose-600/20 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isPending}
                                onClick={() =>
                                  startTransition(async () => {
                                    try {
                                      await archiveVariant(variant.id, product.id);
                                    } catch (error) {
                                      setMessages((current) => ({
                                        ...current,
                                        [variant.id]:
                                          error instanceof Error
                                            ? error.message
                                            : "Unable to archive variant."
                                      }));
                                    }
                                  })
                                }
                                type="button"
                              >
                                Archive variant
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 rounded-3xl border border-dashed border-black/10 bg-white px-4 py-4">
                      <p className="text-sm font-semibold text-stone-950">Add another variant</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {(() => {
                          const editor = newVariants[product.id] ?? createEmptyVariantState(defaultCurrency);

                          return (
                            <>
                              <label className="grid gap-2 text-sm text-stone-700">
                                Variant name
                                <input
                                  className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                                  value={editor.name}
                                  onChange={(event) =>
                                    setNewVariants((current) => ({
                                      ...current,
                                      [product.id]: {
                                        ...editor,
                                        name: event.target.value
                                      }
                                    }))
                                  }
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-stone-700">
                                SKU
                                <input
                                  className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 font-mono text-stone-950 outline-none transition focus:border-sky-500/60"
                                  value={editor.sku}
                                  onChange={(event) =>
                                    setNewVariants((current) => ({
                                      ...current,
                                      [product.id]: {
                                        ...editor,
                                        sku: event.target.value
                                      }
                                    }))
                                  }
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-stone-700">
                                Price minor units
                                <input
                                  className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                                  type="number"
                                  value={editor.priceMinor}
                                  onChange={(event) =>
                                    setNewVariants((current) => ({
                                      ...current,
                                      [product.id]: {
                                        ...editor,
                                        priceMinor: event.target.value
                                      }
                                    }))
                                  }
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-stone-700">
                                Currency
                                <select
                                  className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                                  value={editor.currency}
                                  onChange={(event) =>
                                    setNewVariants((current) => ({
                                      ...current,
                                      [product.id]: {
                                        ...editor,
                                        currency: event.target.value as VariantEditorState["currency"]
                                      }
                                    }))
                                  }
                                >
                                  <option value="KHR">KHR</option>
                                  <option value="USD">USD</option>
                                </select>
                              </label>
                              <label className="grid gap-2 text-sm text-stone-700">
                                On-hand inventory
                                <input
                                  className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                                  type="number"
                                  value={editor.inventoryQuantity}
                                  onChange={(event) =>
                                    setNewVariants((current) => ({
                                      ...current,
                                      [product.id]: {
                                        ...editor,
                                        inventoryQuantity: event.target.value
                                      }
                                    }))
                                  }
                                />
                              </label>
                            </>
                          );
                        })()}
                      </div>

                      <button
                        className="mt-4 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await createVariant(product.id);
                            } catch (error) {
                              setMessages((current) => ({
                                ...current,
                                [product.id]:
                                  error instanceof Error ? error.message : "Unable to add variant."
                              }));
                            }
                          })
                        }
                        type="button"
                      >
                        Add variant
                      </button>
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </article>
    </section>
  );
}
