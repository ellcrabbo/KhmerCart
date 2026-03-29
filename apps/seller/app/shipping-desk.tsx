"use client";

import type { SellerShippingQueueData } from "@khmercart/db";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ShippingDeskProps = {
  initialShipping: SellerShippingQueueData;
};

type ShipmentDraft = {
  carrier: string;
  message: string;
  trackingNumber: string;
  trackingUrl: string;
};

const EMPTY_MESSAGE = "No orders are waiting on shipping updates.";

function createInitialDrafts(data: SellerShippingQueueData): Record<string, ShipmentDraft> {
  return Object.fromEntries(
    data.orders.map((order) => [
      order.orderId,
      {
        carrier: order.shipment?.carrier ?? data.carriers[0] ?? "OTHER",
        message: "",
        trackingNumber: order.shipment?.trackingNumber ?? "",
        trackingUrl: order.shipment?.trackingUrl ?? ""
      }
    ])
  );
}

function formatStatusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function formatMoney(currency: string, amountMinor: number) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: currency === "KHR" ? 0 : 2,
    minimumFractionDigits: currency === "KHR" ? 0 : 2,
    style: "currency"
  }).format(currency === "KHR" ? amountMinor : amountMinor / 100);
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };

    return payload.message ?? `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export function ShippingDesk({ initialShipping }: ShippingDeskProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, ShipmentDraft>>(
    createInitialDrafts(initialShipping)
  );
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function submitShipmentUpdate(input: {
    orderId: string;
    status?: "DELIVERED" | "HANDED_TO_CARRIER" | "IN_TRANSIT";
  }) {
    const draft = drafts[input.orderId];
    const response = await fetch(`/api/orders/${input.orderId}/shipment`, {
      body: JSON.stringify({
        carrier: draft?.carrier || undefined,
        message: draft?.message || undefined,
        status: input.status,
        trackingNumber: draft?.trackingNumber || undefined,
        trackingUrl: draft?.trackingUrl || undefined
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const actionLabel = input.status ? formatStatusLabel(input.status) : "tracking";
    setMessages((current) => ({
      ...current,
      [input.orderId]: `Saved ${actionLabel} update.`
    }));
    router.refresh();
  }

  return (
    <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
            Shipping desk
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
            Manual tracking and carrier handoff
          </h2>
        </div>
        <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-600">
          {initialShipping.orders.length} active shipments
        </span>
      </div>

      {initialShipping.orders.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-black/10 bg-stone-50/85 px-5 py-8 text-sm text-stone-600">
          {EMPTY_MESSAGE}
        </div>
      ) : (
        <div className="mt-6 grid gap-5">
          {initialShipping.orders.map((order) => {
            const draft = drafts[order.orderId] ?? {
              carrier: initialShipping.carriers[0] ?? "OTHER",
              message: "",
              trackingNumber: "",
              trackingUrl: ""
            };

            return (
              <section
                key={order.orderId}
                className="grid gap-5 rounded-[1.5rem] border border-black/10 bg-stone-50/80 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                        {order.orderNumber}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
                        {formatStatusLabel(order.state)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-stone-700">
                      <p className="font-medium text-stone-950">{order.buyer.fullName}</p>
                      <p>{order.buyer.email ?? order.buyer.phone ?? "No buyer contact"}</p>
                      <p>
                        Ordered {formatTimestamp(order.placedAt)} ·{" "}
                        {formatMoney(order.currency, order.totalMinor)}
                      </p>
                    </div>
                  </div>

                  {messages[order.orderId] ? (
                    <p className="text-sm font-medium text-emerald-700">{messages[order.orderId]}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm text-stone-700">
                      Carrier
                      <select
                        className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [order.orderId]: {
                              ...draft,
                              carrier: event.target.value
                            }
                          }))
                        }
                        value={draft.carrier}
                      >
                        {initialShipping.carriers.map((carrier) => (
                          <option key={`${order.orderId}:${carrier}`} value={carrier}>
                            {carrier}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm text-stone-700">
                      Tracking number
                      <input
                        className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [order.orderId]: {
                              ...draft,
                              trackingNumber: event.target.value
                            }
                          }))
                        }
                        placeholder="Enter carrier tracking reference"
                        value={draft.trackingNumber}
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-stone-700 md:col-span-2">
                      Tracking URL
                      <input
                        className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [order.orderId]: {
                              ...draft,
                              trackingUrl: event.target.value
                            }
                          }))
                        }
                        placeholder="Optional public tracking URL"
                        value={draft.trackingUrl}
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-stone-700 md:col-span-2">
                      Shipment note
                      <textarea
                        className="min-h-24 rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [order.orderId]: {
                              ...draft,
                              message: event.target.value
                            }
                          }))
                        }
                        placeholder="Optional note shown on the shipment timeline"
                        value={draft.message}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[1.35rem] border border-black/10 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                        Current shipment
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-stone-700">
                        <p>
                          <span className="font-semibold text-stone-950">Carrier:</span>{" "}
                          {order.shipment?.carrier ?? "Not assigned"}
                        </p>
                        <p>
                          <span className="font-semibold text-stone-950">Tracking:</span>{" "}
                          {order.shipment?.trackingNumber ?? "Not recorded"}
                        </p>
                        <p>
                          <span className="font-semibold text-stone-950">Shipment state:</span>{" "}
                          {order.shipment ? formatStatusLabel(order.shipment.status) : "Pending"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        className="rounded-full bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await submitShipmentUpdate({ orderId: order.orderId });
                            } catch (error) {
                              setMessages((current) => ({
                                ...current,
                                [order.orderId]:
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to save shipment update."
                              }));
                            }
                          })
                        }
                        type="button"
                      >
                        Save tracking
                      </button>

                      {order.canMarkHandedToCarrier ? (
                        <button
                          className="rounded-full border border-emerald-600/30 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await submitShipmentUpdate({
                                  orderId: order.orderId,
                                  status: "HANDED_TO_CARRIER"
                                });
                              } catch (error) {
                                setMessages((current) => ({
                                  ...current,
                                  [order.orderId]:
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to mark the order as handed to carrier."
                                }));
                              }
                            })
                          }
                          type="button"
                        >
                          Handed to carrier
                        </button>
                      ) : null}

                      {order.canMarkInTransit ? (
                        <button
                          className="rounded-full border border-sky-600/30 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await submitShipmentUpdate({
                                  orderId: order.orderId,
                                  status: "IN_TRANSIT"
                                });
                              } catch (error) {
                                setMessages((current) => ({
                                  ...current,
                                  [order.orderId]:
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to mark the order in transit."
                                }));
                              }
                            })
                          }
                          type="button"
                        >
                          In transit
                        </button>
                      ) : null}

                      {order.canMarkDelivered ? (
                        <button
                          className="rounded-full border border-amber-600/30 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await submitShipmentUpdate({
                                  orderId: order.orderId,
                                  status: "DELIVERED"
                                });
                              } catch (error) {
                                setMessages((current) => ({
                                  ...current,
                                  [order.orderId]:
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to mark the order delivered."
                                }));
                              }
                            })
                          }
                          type="button"
                        >
                          Delivered
                        </button>
                      ) : null}
                    </div>

                    <div className="rounded-[1.35rem] border border-black/10 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                        Tracking timeline
                      </p>
                      <div className="mt-3 grid gap-3">
                        {order.shipment?.updates.length ? (
                          order.shipment.updates.map((event) => (
                            <div
                              key={event.id}
                              className="rounded-[1.1rem] border border-black/8 bg-stone-50 px-4 py-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-stone-950">
                                  {formatStatusLabel(event.status)}
                                </p>
                                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                                  {formatTimestamp(event.occurredAt)}
                                </p>
                              </div>
                              <p className="mt-2 text-sm text-stone-700">{event.message}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                                {event.source}
                                {event.actorName ? ` · ${event.actorName}` : ""}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-stone-600">
                            Tracking events will appear here after the first carrier update.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </article>
  );
}
