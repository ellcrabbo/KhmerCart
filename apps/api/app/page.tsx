import { appCatalog } from "@khmercart/core";
import { AppShell, SurfaceCard } from "@khmercart/ui";

const api = appCatalog.api;

export default function ApiPage() {
  return (
    <AppShell app="api">
      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <SurfaceCard eyebrow="Backend" title="Infrastructure-aware API app">
          <ul className="space-y-4 text-sm leading-7 text-stone-700 md:text-base">
            {api.highlights.map((highlight) => (
              <li
                key={highlight}
                className="rounded-2xl border border-rose-500/20 bg-rose-50/70 px-4 py-3"
              >
                {highlight}
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard eyebrow="Checks" title="Readiness endpoints">
          <dl className="space-y-4 text-sm text-stone-700">
            <div className="rounded-2xl border border-black/10 bg-stone-50/90 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Buyer app
              </dt>
              <dd className="mt-2 font-mono text-sm text-stone-900">{appCatalog.buyer.href}</dd>
            </div>
            <div className="rounded-2xl border border-black/10 bg-stone-50/90 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                JSON health
              </dt>
              <dd className="mt-2 font-mono text-sm text-stone-900">/api/health</dd>
            </div>
            <div className="rounded-2xl border border-black/10 bg-stone-50/90 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Plain text
              </dt>
              <dd className="mt-2 font-mono text-sm text-stone-900">/health</dd>
            </div>
          </dl>

          <a
            className="mt-6 inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5"
            href="/health"
          >
            Read API readiness
          </a>
        </SurfaceCard>
      </section>
    </AppShell>
  );
}
