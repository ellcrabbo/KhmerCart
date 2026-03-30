"use client";

import type { DisputeDetail } from "@khmercart/db";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { readErrorMessage } from "./client-helpers";

type DisputeDetailPanelProps = {
  dispute: DisputeDetail;
};

function formatMinorUnits(amountMinor: number | null, currency: string) {
  if (amountMinor === null) {
    return "Not set";
  }

  return `${currency} ${amountMinor.toLocaleString()}`;
}

export function DisputeDetailPanel({ dispute }: DisputeDetailPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adminNote, setAdminNote] = useState(dispute.adminNote);
  const [resolutionNote, setResolutionNote] = useState(dispute.resolutionNote);
  const [refundAmount, setRefundAmount] = useState(
    dispute.resolvedRefundMinor?.toString() ?? dispute.requestedRefundMinor?.toString() ?? ""
  );
  const [message, setMessage] = useState<string | null>(null);

  async function submitDecision(status: "UNDER_REVIEW" | "REFUND_APPROVED" | "REJECTED" | "CLOSED") {
    const response = await fetch(`/api/disputes/${dispute.id}/decision`, {
      body: JSON.stringify({
        adminNote,
        resolvedRefundMinor: refundAmount.trim() ? Number(refundAmount) : null,
        resolutionNote,
        status
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    setMessage(`Dispute updated to ${status.replaceAll("_", " ").toLowerCase()}.`);
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_24rem]">
      <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Dispute detail
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              {dispute.order.orderNumber}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {dispute.reasonLabel} • {dispute.statusLabel}
            </p>
          </div>
          <span className="rounded-full bg-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-stone-700">
            {dispute.statusLabel}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Buyer
            </p>
            <p className="mt-2 font-medium text-stone-950">{dispute.buyerName}</p>
            <p className="mt-3 text-sm leading-7 text-stone-700">{dispute.buyerMessage}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Seller
            </p>
            <p className="mt-2 font-medium text-stone-950">{dispute.sellerName}</p>
            <p className="mt-3 text-sm leading-7 text-stone-700">
              {dispute.sellerResponse || "No seller response recorded yet."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Requested refund
            </p>
            <p className="mt-2 font-medium text-stone-950">
              {formatMinorUnits(dispute.requestedRefundMinor, dispute.currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Resolved refund
            </p>
            <p className="mt-2 font-medium text-stone-950">
              {formatMinorUnits(dispute.resolvedRefundMinor, dispute.currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Order total
            </p>
            <p className="mt-2 font-medium text-stone-950">
              {dispute.currency} {dispute.order.totalMinor.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-stone-50/85 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
            Order items
          </p>
          <ul className="mt-3 space-y-2 pl-5 text-sm leading-7 text-stone-700">
            {dispute.order.itemSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </article>

      <aside className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
          Admin action
        </p>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm text-stone-700">
            Admin note
            <textarea
              className="min-h-24 rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
              onChange={(event) => setAdminNote(event.target.value)}
              value={adminNote}
            />
          </label>

          <label className="grid gap-2 text-sm text-stone-700">
            Resolution note
            <textarea
              className="min-h-24 rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
              onChange={(event) => setResolutionNote(event.target.value)}
              value={resolutionNote}
            />
          </label>

          <label className="grid gap-2 text-sm text-stone-700">
            Refund amount ({dispute.currency})
            <input
              className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
              inputMode="numeric"
              onChange={(event) => setRefundAmount(event.target.value)}
              value={refundAmount}
            />
          </label>
        </div>

        {message ? <p className="mt-4 text-sm font-medium text-emerald-700">{message}</p> : null}

        <div className="mt-5 grid gap-3">
          <button
            className="rounded-full border border-black/10 bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await submitDecision("UNDER_REVIEW");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Unable to update dispute.");
                }
              })
            }
            type="button"
          >
            Mark under review
          </button>
          <button
            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await submitDecision("REFUND_APPROVED");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Unable to approve refund.");
                }
              })
            }
            type="button"
          >
            Approve refund
          </button>
          <button
            className="rounded-full border border-rose-600/20 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await submitDecision("REJECTED");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Unable to reject dispute.");
                }
              })
            }
            type="button"
          >
            Reject dispute
          </button>
          <button
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await submitDecision("CLOSED");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Unable to close dispute.");
                }
              })
            }
            type="button"
          >
            Close case
          </button>
        </div>
      </aside>
    </div>
  );
}
