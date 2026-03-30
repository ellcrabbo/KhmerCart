import { readDisputeReasons } from "@khmercart/core";
import type { DisputeListEntry } from "@khmercart/db";
import Link from "next/link";

type DisputesConsoleProps = {
  disputes: DisputeListEntry[];
};

function formatMinorUnits(amountMinor: number | null, currency: string) {
  if (amountMinor === null) {
    return "Not requested";
  }

  return `${currency} ${amountMinor.toLocaleString()}`;
}

export function DisputesConsole({ disputes }: DisputesConsoleProps) {
  const supportedReasons = readDisputeReasons(process.env);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_20rem]">
      <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Disputes
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              Open cases and recent outcomes
            </h2>
          </div>
          <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-800">
            {disputes.length} cases
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {disputes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 bg-stone-50/85 px-5 py-6 text-sm text-stone-600">
              No disputes have been opened yet.
            </div>
          ) : (
            disputes.map((dispute) => (
              <Link
                key={dispute.id}
                className="grid gap-4 rounded-[1.5rem] border border-black/10 bg-stone-50/85 p-5 transition hover:-translate-y-0.5 hover:border-sky-500/30 hover:bg-white"
                href={`/disputes/${dispute.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-stone-950">{dispute.orderNumber}</p>
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                      {dispute.sellerName}
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-stone-700">
                    {dispute.statusLabel}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                      Reason
                    </p>
                    <p className="mt-2 text-sm text-stone-800">{dispute.reasonLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                      Requested refund
                    </p>
                    <p className="mt-2 text-sm text-stone-800">
                      {formatMinorUnits(dispute.requestedRefundMinor, dispute.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                      Order total
                    </p>
                    <p className="mt-2 text-sm text-stone-800">
                      {dispute.currency} {dispute.totalMinor.toLocaleString()}
                    </p>
                  </div>
                </div>

                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  Updated {new Date(dispute.updatedAt).toLocaleString()}
                </p>
              </Link>
            ))
          )}
        </div>
      </article>

      <aside className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
          Supported reasons
        </p>
        <div className="mt-4 space-y-3">
          {supportedReasons.map((reason) => (
            <div
              key={reason}
              className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-3 text-sm font-medium text-stone-800"
            >
              {reason.replaceAll("_", " ")}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
