"use client";

import type { RecentAuditEntry, SellerApprovalQueueEntry } from "@khmercart/db";
import { formatKycStatus } from "@khmercart/core";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AdminQueueProps = {
  queue: SellerApprovalQueueEntry[];
  recentActivity: RecentAuditEntry[];
};

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };

    return payload.message ?? `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export function AdminQueue({ queue, recentActivity }: AdminQueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function submitDecision(sellerId: string, decision: "APPROVE" | "REJECT") {
    const response = await fetch(`/api/sellers/${sellerId}/decision`, {
      body: JSON.stringify({
        decision,
        note: notes[sellerId] ?? ""
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
      [sellerId]: decision === "APPROVE" ? "Seller approved." : "Seller rejected."
    }));
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Review queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              Seller approvals
            </h2>
          </div>
          <span className="rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-800">
            {queue.length} open
          </span>
        </div>

        <div className="mt-6 space-y-5">
          {queue.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 bg-stone-50/85 px-5 py-6 text-sm text-stone-600">
              No sellers currently waiting on a decision.
            </div>
          ) : (
            queue.map((seller) => (
              <section
                key={seller.id}
                className="rounded-[1.5rem] border border-black/10 bg-stone-50/85 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-stone-950">{seller.displayName}</p>
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                      {seller.slug}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">
                    {formatKycStatus(seller.kycStatus)}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                      Contact
                    </p>
                    <p className="mt-2">{seller.supportEmail || seller.user.email || "No email"}</p>
                    <p>{seller.supportPhone || seller.user.phone || "No phone"}</p>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                      Payout bank
                    </p>
                    <p className="mt-2">{seller.payoutBankName || "No bank provided"}</p>
                    <p>{seller.payoutAccountName || "No account holder"}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-black/10 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                    Uploaded documents
                  </p>
                  <div className="mt-3 space-y-3">
                    {seller.documents.length === 0 ? (
                      <p className="text-sm text-stone-600">No uploaded KYC documents.</p>
                    ) : (
                      seller.documents.map((document) => (
                        <div
                          key={document.id}
                          className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-700"
                        >
                          <div>
                            <p className="font-medium text-stone-950">{document.type}</p>
                            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                              {document.fileName}
                            </p>
                          </div>
                          {document.accessUrl ? (
                            <a
                              className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-700 transition hover:border-sky-500/40 hover:text-stone-950"
                              href={document.accessUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Open signed URL
                            </a>
                          ) : (
                            <span className="text-xs uppercase tracking-[0.22em] text-stone-500">
                              Storage link unavailable
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <label className="mt-5 grid gap-2 text-sm text-stone-700">
                  Review note
                  <textarea
                    className="min-h-24 rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                    value={notes[seller.id] ?? seller.kycNotes}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [seller.id]: event.target.value
                      }))
                    }
                  />
                </label>

                {messages[seller.id] ? (
                  <p className="mt-3 text-sm font-medium text-emerald-700">{messages[seller.id]}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await submitDecision(seller.id, "APPROVE");
                        } catch (error) {
                          setMessages((current) => ({
                            ...current,
                            [seller.id]:
                              error instanceof Error ? error.message : "Unable to approve seller."
                          }));
                        }
                      })
                    }
                    type="button"
                  >
                    Approve seller
                  </button>
                  <button
                    className="rounded-full border border-rose-600/20 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await submitDecision(seller.id, "REJECT");
                        } catch (error) {
                          setMessages((current) => ({
                            ...current,
                            [seller.id]:
                              error instanceof Error ? error.message : "Unable to reject seller."
                          }));
                        }
                      })
                    }
                    type="button"
                  >
                    Reject seller
                  </button>
                </div>
              </section>
            ))
          )}
        </div>
      </article>

      <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
          Audit trail
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
          Seller operations log
        </h2>

        <div className="mt-6 space-y-3">
          {recentActivity.map((entry) => (
            <div key={entry.id} className="rounded-3xl border border-black/10 bg-stone-50/85 px-4 py-4">
              <p className="text-sm font-semibold text-stone-950">{entry.action}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                {entry.entityType} • {new Date(entry.createdAt).toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-stone-700">
                {entry.actorName ? `Actor: ${entry.actorName}` : "System action"} • {entry.entityId}
              </p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
