"use client";

import type { ProductModerationQueueEntry } from "@khmercart/db";
import { formatKycStatus } from "@khmercart/core";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { readErrorMessage } from "./client-helpers";

type ProductModerationQueueProps = {
  queue: ProductModerationQueueEntry[];
};

export function ProductModerationQueue({ queue }: ProductModerationQueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function submitDecision(productId: string, decision: "APPROVE" | "REJECT") {
    const response = await fetch(`/api/products/${productId}/decision`, {
      body: JSON.stringify({
        decision,
        note: notes[productId] ?? ""
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
      [productId]: decision === "APPROVE" ? "Product approved." : "Product rejected."
    }));
    router.refresh();
  }

  return (
    <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
            Moderation queue
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
            Product decisions
          </h2>
        </div>
        <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-800">
          {queue.length} open
        </span>
      </div>

      <div className="mt-6 space-y-5">
        {queue.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/10 bg-stone-50/85 px-5 py-6 text-sm text-stone-600">
            No products currently waiting on moderation.
          </div>
        ) : (
          queue.map((product) => (
            <section
              key={product.id}
              className="rounded-[1.5rem] border border-black/10 bg-stone-50/85 p-5"
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_13rem]">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-stone-950">{product.name}</p>
                      <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                        {product.seller.displayName} • {product.seller.slug}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-800">
                        {formatKycStatus(product.moderationStatus)}
                      </span>
                      <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-stone-700">
                        {formatKycStatus(product.seller.kycStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Listing status
                      </p>
                      <p className="mt-2 font-medium text-stone-950">
                        {formatKycStatus(product.status)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Variants
                      </p>
                      <p className="mt-2 font-medium text-stone-950">{product.variantCount}</p>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Updated
                      </p>
                      <p className="mt-2 font-medium text-stone-950">
                        {new Date(product.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-stone-700">
                    {product.description || "No description provided yet."}
                  </p>

                  <label className="mt-5 grid gap-2 text-sm text-stone-700">
                    Moderation note
                    <textarea
                      className="min-h-24 rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                      value={notes[product.id] ?? product.moderationNotes}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [product.id]: event.target.value
                        }))
                      }
                    />
                  </label>

                  {messages[product.id] ? (
                    <p className="mt-3 text-sm font-medium text-emerald-700">{messages[product.id]}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await submitDecision(product.id, "APPROVE");
                          } catch (error) {
                            setMessages((current) => ({
                              ...current,
                              [product.id]:
                                error instanceof Error ? error.message : "Unable to approve product."
                            }));
                          }
                        })
                      }
                      type="button"
                    >
                      Approve product
                    </button>
                    <button
                      className="rounded-full border border-rose-600/20 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await submitDecision(product.id, "REJECT");
                          } catch (error) {
                            setMessages((current) => ({
                              ...current,
                              [product.id]:
                                error instanceof Error ? error.message : "Unable to reject product."
                            }));
                          }
                        })
                      }
                      type="button"
                    >
                      Reject product
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white">
                  {product.defaultImageUrl ? (
                    <img
                      alt={`${product.name} primary image`}
                      className="h-full min-h-56 w-full object-cover"
                      src={product.defaultImageUrl}
                    />
                  ) : (
                    <div className="flex h-full min-h-56 items-center justify-center bg-stone-100 px-6 text-center text-sm text-stone-500">
                      No product image uploaded.
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))
        )}
      </div>
    </article>
  );
}
