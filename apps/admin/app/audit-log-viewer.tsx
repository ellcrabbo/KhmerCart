import type { AdminAuditLogEntry } from "@khmercart/db";

type AuditLogViewerProps = {
  entries: AdminAuditLogEntry[];
};

function renderJson(data: unknown) {
  return JSON.stringify(data ?? null, null, 2);
}

export function AuditLogViewer({ entries }: AuditLogViewerProps) {
  return (
    <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
            Audit log
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
            Privileged mutations
          </h2>
        </div>
        <span className="rounded-full bg-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-stone-700">
          {entries.length} rows
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {entries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/10 bg-stone-50/85 px-5 py-6 text-sm text-stone-600">
            No audit events found yet.
          </div>
        ) : (
          entries.map((entry) => (
            <details
              key={entry.id}
              className="rounded-[1.5rem] border border-black/10 bg-stone-50/85 p-5"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-stone-950">{entry.action}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                      {entry.entityType} • {entry.entityId}
                    </p>
                  </div>
                  <div className="text-right text-sm text-stone-600">
                    <p>{entry.actorName ?? "System"}</p>
                    <p>{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </summary>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                    Before
                  </p>
                  <pre className="mt-3 overflow-x-auto text-xs leading-6 text-stone-700">
                    {renderJson(entry.beforeData)}
                  </pre>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                    After
                  </p>
                  <pre className="mt-3 overflow-x-auto text-xs leading-6 text-stone-700">
                    {renderJson(entry.afterData)}
                  </pre>
                </div>
              </div>
            </details>
          ))
        )}
      </div>
    </article>
  );
}
